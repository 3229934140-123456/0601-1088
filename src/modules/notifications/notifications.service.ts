import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Notification,
  CreateNotificationDto,
  QueryNotificationDto,
} from '../../entities/notification.entity';
import { NotificationType } from '../../common/enums';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
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

    const notification = this.notificationsRepository.create(createNotificationDto);
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
    });
    return this.notificationsRepository.save(notification);
  }

  async findByUser(userId: number, query: QueryNotificationDto) {
    const { page = 1, pageSize = 20, type, isRead, relatedEntityType, relatedEntityId } = query;

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

    return { list, total, page, pageSize };
  }

  async findByEntity(userId: number, entityType: string, entityId: number) {
    const list = await this.notificationsRepository.find({
      where: { userId, relatedEntityType: entityType, relatedEntityId: entityId },
      order: { createdAt: 'ASC' },
    });

    return list;
  }

  async findUnprocessed(userId: number, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.type IN (:...types)', {
        types: [NotificationType.OVERDUE_WARNING, NotificationType.COMPENSATION_REQUEST],
      })
      .orderBy('notification.createdAt', 'DESC');

    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
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

  async findOne(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('通知不存在');
    }
    return notification;
  }
}
