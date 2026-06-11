import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CabinetCallback,
  CabinetCallbackDto,
} from '../../entities/cabinet-callback.entity';
import {
  CabinetCallbackAction,
  AuditAction,
  BorrowStatus,
  AssetStatus,
} from '../../common/enums';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { BorrowRecordsService } from '../borrow-records/borrow-records.service';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { Asset } from '../../entities/asset.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CabinetCallbackService {
  constructor(
    @InjectRepository(CabinetCallback)
    private cabinetCallbackRepository: Repository<CabinetCallback>,
    @InjectRepository(BorrowRecord)
    private borrowRecordsRepository: Repository<BorrowRecord>,
    @InjectRepository(Asset)
    private assetsRepository: Repository<Asset>,
    private auditLogService: AuditLogService,
    @Inject(forwardRef(() => BorrowRecordsService))
    private borrowRecordsService: BorrowRecordsService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async handleCallback(dto: CabinetCallbackDto): Promise<{
    success: boolean;
    callbackId: string;
    processed: boolean;
    id?: number;
    message?: string;
  }> {
    const existing = await this.cabinetCallbackRepository.findOne({
      where: { callbackId: dto.callbackId },
    });

    if (existing && existing.status === 'success') {
      return {
        success: true,
        callbackId: dto.callbackId,
        processed: true,
        id: existing.id,
        message: '重复回调，已处理过',
      };
    }

    if (existing && existing.status === 'retry') {
      existing.retryCount += 1;
      try {
        const result = await this.processCallback(dto);
        existing.status = 'success';
        existing.errorMessage = null;
        existing.operatedAt = dto.operatedAt || new Date();
        await this.cabinetCallbackRepository.save(existing);
        return {
          success: true,
          callbackId: dto.callbackId,
          processed: true,
          id: existing.id,
          message: '重试成功',
        };
      } catch (error: any) {
        existing.errorMessage = error.message;
        await this.cabinetCallbackRepository.save(existing);
        return {
          success: false,
          callbackId: dto.callbackId,
          processed: false,
          id: existing.id,
          message: error.message,
        };
      }
    }

    const callback = this.cabinetCallbackRepository.create({
      ...dto,
      status: 'success',
      retryCount: 0,
      operatedAt: dto.operatedAt || new Date(),
    });

    try {
      const result = await this.processCallback(dto);
      const saved = await this.cabinetCallbackRepository.save(callback);
      return {
        success: true,
        callbackId: dto.callbackId,
        processed: true,
        id: saved.id,
        message: '处理成功',
      };
    } catch (error: any) {
      callback.status = 'failed';
      callback.errorMessage = error.message;
      await this.cabinetCallbackRepository.save(callback);
      throw error;
    }
  }

  private async processCallback(dto: CabinetCallbackDto): Promise<void> {
    const { action, borrowRecordId, cabinetCode, lockerNumber, operatorId, operatorName } = dto;

    const borrowRecord = await this.borrowRecordsRepository.findOne({
      where: { id: borrowRecordId },
      relations: ['asset', 'borrower'],
    });
    if (!borrowRecord) {
      throw new NotFoundException('领用记录不存在');
    }

    const assetName = borrowRecord.asset?.name || '';
    const cabinetInfo = `[柜机: ${cabinetCode} 格口: ${lockerNumber}]`;
    const operatorInfo = `操作人: ${operatorName || operatorId} (ID: ${operatorId})`;

    if (action === CabinetCallbackAction.CLAIM) {
      if (borrowRecord.status === BorrowStatus.BORROWED || borrowRecord.status === BorrowStatus.OVERDUE) {
        return;
      }
      if (borrowRecord.status !== BorrowStatus.APPROVED) {
        throw new ConflictException('该领用单状态不支持柜机领取');
      }

      await this.borrowRecordsService.claim(borrowRecordId, operatorId);

      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.BORROW_CABINET_CLAIM,
        description: `门禁柜领取资产: ${assetName} ${cabinetInfo} ${operatorInfo}`,
        entityType: 'BorrowRecord',
        entityId: borrowRecordId,
        afterData: {
          cabinetCode,
          lockerNumber,
          operatorName,
          operatorId,
        },
      });
    } else if (action === CabinetCallbackAction.RETURN) {
      if (borrowRecord.status === BorrowStatus.RETURNED) {
        return;
      }
      if (borrowRecord.status !== BorrowStatus.BORROWED && borrowRecord.status !== BorrowStatus.OVERDUE) {
        throw new ConflictException('该领用单状态不支持柜机归还');
      }

      borrowRecord.status = BorrowStatus.RETURNED;
      borrowRecord.actualReturnDate = new Date();
      await this.borrowRecordsRepository.save(borrowRecord);

      if (borrowRecord.asset) {
        borrowRecord.asset.status = AssetStatus.AVAILABLE;
        await this.assetsRepository.save(borrowRecord.asset);
      }

      await this.notificationsService.resolveTodoByEntity('BorrowRecord', borrowRecordId);

      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.RETURN_CABINET_RETURN,
        description: `门禁柜归还资产: ${assetName} ${cabinetInfo} ${operatorInfo}`,
        entityType: 'BorrowRecord',
        entityId: borrowRecordId,
        afterData: {
          cabinetCode,
          lockerNumber,
          operatorName,
          operatorId,
          borrowStatus: BorrowStatus.RETURNED,
          assetStatus: AssetStatus.AVAILABLE,
        },
      });
    } else {
      throw new BadRequestException('不支持的回调动作');
    }
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    cabinetCode?: string;
    lockerNumber?: string;
    action?: string;
    status?: string;
    borrowRecordId?: number;
  }) {
    const {
      page = 1,
      pageSize = 20,
      cabinetCode,
      lockerNumber,
      action,
      status,
      borrowRecordId,
    } = params;

    const qb = this.cabinetCallbackRepository
      .createQueryBuilder('callback');

    if (cabinetCode) qb.andWhere('callback.cabinetCode = :cabinetCode', { cabinetCode });
    if (lockerNumber) qb.andWhere('callback.lockerNumber = :lockerNumber', { lockerNumber });
    if (action) qb.andWhere('callback.action = :action', { action });
    if (status) qb.andWhere('callback.status = :status', { status });
    if (borrowRecordId) qb.andWhere('callback.borrowRecordId = :borrowRecordId', { borrowRecordId });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('callback.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
  }

  async findOne(id: number): Promise<CabinetCallback> {
    const callback = await this.cabinetCallbackRepository.findOne({
      where: { id },
    });
    if (!callback) {
      throw new NotFoundException('回调记录不存在');
    }
    return callback;
  }

  async retry(id: number): Promise<any> {
    const callback = await this.findOne(id);
    if (!callback) {
      throw new NotFoundException('回调记录不存在');
    }

    if (callback.status === 'success') {
      return { success: true, message: '该回调已处理成功，无需重试' };
    }

    callback.status = 'retry';
    callback.retryCount += 1;
    await this.cabinetCallbackRepository.save(callback);

    const dto: CabinetCallbackDto = {
      callbackId: callback.callbackId,
      action: callback.action as CabinetCallbackAction,
      borrowRecordId: callback.borrowRecordId,
      cabinetCode: callback.cabinetCode,
      lockerNumber: callback.lockerNumber,
      operatorId: callback.operatorId,
      operatorName: callback.operatorName,
      operatedAt: callback.operatedAt,
      rawData: callback.rawData,
    };

    return this.handleCallback(dto);
  }

  async batchRetry(ids: number[]): Promise<{
    success: number[];
    failed: { id: number; reason: string }[];
  }> {
    const success: number[] = [];
    const failed: { id: number; reason: string }[] = [];

    for (const id of ids) {
      try {
        const result = await this.retry(id);
        if (result.success) {
          success.push(id);
        } else {
          failed.push({ id, reason: result.message || '重试失败' });
        }
      } catch (error: any) {
        failed.push({ id, reason: error.message || '重试失败' });
      }
    }

    return { success, failed };
  }
}
