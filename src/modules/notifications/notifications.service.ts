import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  CreateNotificationDto,
  QueryNotificationDto,
} from '../../entities/notification.entity';

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
    const { page = 1, pageSize = 20, type, isRead } = query;

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (type) qb.andWhere('notification.type = :type', { type });
    if (isRead !== undefined) qb.andWhere('notification.isRead = :isRead', { isRead });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('notification.createdAt', 'DESC')
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

  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = :isRead', { userId, isRead: false })
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
