import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Notification,
  CreateNotificationDto,
  QueryNotificationDto,
} from '../../entities/notification.entity';
import { NotificationType, NotificationTodoStatus, BorrowStatus, CompensationStatus } from '../../common/enums';
import { BorrowRecordsService } from '../borrow-records/borrow-records.service';
import { CompensationRecordsService } from '../compensation-records/compensation-records.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @Inject(forwardRef(() => BorrowRecordsService))
    private borrowRecordsService: BorrowRecordsService,
    @Inject(forwardRef(() => CompensationRecordsService))
    private compensationRecordsService: CompensationRecordsService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const { dedupKey } = createNotificationDto;

    if (dedupKey) {
      const existing = await this.notificationsRepository.findOne({
        where: { dedupKey, userId: createNotificationDto.userId },
      });
      if (existing) {
        return existing;
      }
    }

    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      todoStatus: NotificationTodoStatus.ACTIVE,
    });
    return this.notificationsRepository.save(notification);
  }

  async createUnique(
    createNotificationDto: CreateNotificationDto,
    dedupParts: { userId: number; type: string; entityType?: string; entityId?: number; dateKey?: string },
  ): Promise<Notification> {
    const dateKey = dedupParts.dateKey || new Date().toISOString().split('T')[0];
    const dedupKey = `${dedupParts.userId}:${dedupParts.type}:${dedupParts.entityType || 'none'}:${dedupParts.entityId || 0}:${dateKey}`;

    const existing = await this.notificationsRepository.findOne({
      where: { dedupKey, userId: dedupParts.userId },
    });
    if (existing) {
      return existing;
    }

    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      dedupKey,
      todoStatus: NotificationTodoStatus.ACTIVE,
    });
    return this.notificationsRepository.save(notification);
  }

  async createOrUpdateOverdue(
    createNotificationDto: CreateNotificationDto,
    dedupParts: { userId: number; entityType: string; entityId: number; overdueDays: number },
  ): Promise<Notification> {
    const dedupKey = `${dedupParts.userId}:overdue_active:${dedupParts.entityType}:${dedupParts.entityId}`;

    let existing = await this.notificationsRepository.findOne({
      where: { dedupKey, userId: dedupParts.userId },
    });

    if (existing) {
      existing.content = createNotificationDto.content;
      existing.relatedData = {
        ...existing.relatedData,
        ...createNotificationDto.relatedData,
      };
      existing.dynamicOverdueDays = dedupParts.overdueDays;
      existing.lastCheckedAt = new Date();
      if (existing.todoStatus === NotificationTodoStatus.RESOLVED) {
        existing.todoStatus = NotificationTodoStatus.ACTIVE;
      }
      return this.notificationsRepository.save(existing);
    }

    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      dedupKey,
      todoStatus: NotificationTodoStatus.ACTIVE,
      dynamicOverdueDays: dedupParts.overdueDays,
      lastCheckedAt: new Date(),
    });
    return this.notificationsRepository.save(notification);
  }

  async resolveTodoByEntity(entityType: string, entityId: number): Promise<number> {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({
        todoStatus: NotificationTodoStatus.RESOLVED,
      })
      .where('relatedEntityType = :entityType AND relatedEntityId = :entityId AND todoStatus = :active', {
        entityType,
        entityId,
        active: NotificationTodoStatus.ACTIVE,
      })
      .execute();

    return result.affected || 0;
  }

  async findByUser(userId: number, query: QueryNotificationDto) {
    const { page = 1, pageSize = 20, type, isRead, relatedEntityType, relatedEntityId, todoStatus } = query;

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (type) {
      if (Array.isArray(type)) {
        qb.andWhere('notification.type IN (:...types)', { types: type });
      } else {
        qb.andWhere('notification.type = :type', { type });
      }
    }
    if (isRead !== undefined) qb.andWhere('notification.isRead = :isRead', { isRead });
    if (todoStatus !== undefined) qb.andWhere('notification.todoStatus = :todoStatus', { todoStatus });
    if (relatedEntityType) {
      qb.andWhere('notification.relatedEntityType = :relatedEntityType', { relatedEntityType });
    }
    if (relatedEntityId) {
      qb.andWhere('notification.relatedEntityId = :relatedEntityId', { relatedEntityId });
    }

    const total = await qb.getCount();
    const list = await qb
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const enrichedList = await Promise.all(list.map((n) => this.enrichNotification(n)));

    return { list: enrichedList, total, page, pageSize };
  }

  async findByEntity(userId: number, entityType: string, entityId: number) {
    const list = await this.notificationsRepository.find({
      where: { userId, relatedEntityType: entityType, relatedEntityId: entityId },
      order: { createdAt: 'ASC' },
    });

    const enrichedList = await Promise.all(list.map((n) => this.enrichNotification(n)));
    return enrichedList;
  }

  async getTimelineByBorrowRecord(userId: number, borrowRecordId: number) {
    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere(
        '(notification.relatedEntityType = :borrowType AND notification.relatedEntityId = :borrowId) OR (notification.relatedEntityType = :returnType AND EXISTS (SELECT 1 FROM return_record rr WHERE rr.id = notification.relatedEntityId AND rr.borrowRecordId = :borrowId)) OR (notification.relatedEntityType = :compType AND EXISTS (SELECT 1 FROM compensation_record cr JOIN return_record rr ON cr.returnRecordId = rr.id WHERE cr.id = notification.relatedEntityId AND rr.borrowRecordId = :borrowId))',
        {
          userId,
          borrowType: 'BorrowRecord',
          borrowId: borrowRecordId,
          returnType: 'ReturnRecord',
          compType: 'CompensationRecord',
        },
      )
      .orderBy('notification.createdAt', 'ASC');

    const list = await qb.getMany();
    const enrichedList = await Promise.all(list.map((n) => this.enrichNotification(n)));

    return list.map((n) => ({
      ...n,
      timelineKey: `${n.createdAt.getTime()}_${n.type}`,
    }));
  }

  async findUnprocessed(userId: number, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.type IN (:...types)', {
        types: [NotificationType.OVERDUE_WARNING, NotificationType.COMPENSATION_REQUEST],
      })
      .andWhere('notification.todoStatus = :active', { active: NotificationTodoStatus.ACTIVE })
      .orderBy('notification.createdAt', 'DESC');

    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const filtered = [];
    for (const n of list) {
      const isStillUnresolved = await this.checkTodoStatus(n);
      if (isStillUnresolved) {
        filtered.push(await this.enrichNotification(n));
      }
    }

    return { list: filtered, total: filtered.length, page, pageSize };
  }

  private async checkTodoStatus(notification: Notification): Promise<boolean> {
    if (notification.todoStatus !== NotificationTodoStatus.ACTIVE) return false;

    if (notification.type === NotificationType.OVERDUE_WARNING && notification.relatedEntityType === 'BorrowRecord' && notification.relatedEntityId) {
      try {
        const borrow = await this.borrowRecordsService.findOne(notification.relatedEntityId);
        if (!borrow || borrow.status === BorrowStatus.RETURNED || borrow.status === BorrowStatus.REJECTED) {
          await this.resolveTodoByEntity('BorrowRecord', notification.relatedEntityId);
          return false;
        }
      } catch {
        return false;
      }
    }

    if (notification.type === NotificationType.COMPENSATION_REQUEST && notification.relatedEntityType === 'CompensationRecord' && notification.relatedEntityId) {
      try {
        const comp = await this.compensationRecordsService.findOne(notification.relatedEntityId);
        if (!comp || comp.status === CompensationStatus.PAID || comp.status === CompensationStatus.WAIVED) {
          await this.resolveTodoByEntity('CompensationRecord', notification.relatedEntityId);
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  private async enrichNotification(notification: Notification): Promise<Notification & { currentOverdueDays?: number }> {
    const result = notification as any;

    if (notification.type === NotificationType.OVERDUE_WARNING && notification.relatedEntityType === 'BorrowRecord' && notification.relatedEntityId) {
      try {
        const borrow = await this.borrowRecordsService.findOne(notification.relatedEntityId);
        if (borrow) {
          result.currentOverdueDays = borrow.overdueDays || 0;
        }
      } catch {
        result.currentOverdueDays = notification.dynamicOverdueDays || 0;
      }
    }

    return result;
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationsRepository.save(notification);
  }

  async batchMarkAsRead(userId: number, ids: number[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;

    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND id IN (:...ids) AND isRead = :isRead', {
        userId,
        ids,
        isRead: false,
      })
      .execute();

    return result.affected || 0;
  }

  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = :isRead', { userId, isRead: false })
      .execute();

    return result.affected || 0;
  }

  async markEntityRead(userId: number, entityType: string, entityId: number): Promise<number> {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = :isRead AND relatedEntityType = :entityType AND relatedEntityId = :entityId', {
        userId,
        isRead: false,
        entityType,
        entityId,
      })
      .execute();

    return result.affected || 0;
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  async getUnprocessedCount(userId: number): Promise<number> {
    const { total } = await this.findUnprocessed(userId, { page: 1, pageSize: 1 });
    return total;
  }

  async findOne(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('通知不存在');
    }
    return this.enrichNotification(notification);
  }
}
