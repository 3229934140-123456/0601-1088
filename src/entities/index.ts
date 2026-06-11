import { BaseEntity } from '../common/entities/base.entity';
import { Department } from './department.entity';
import { User } from './user.entity';
import { AssetCategory } from './asset-category.entity';
import { Location } from './location.entity';
import { Asset } from './asset.entity';
import { BorrowRecord } from './borrow-record.entity';
import { ReturnRecord } from './return-record.entity';
import { CompensationRecord } from './compensation-record.entity';
import { AuditLog } from './audit-log.entity';
import { Notification } from './notification.entity';

export const entities = [
  BaseEntity,
  Department,
  User,
  AssetCategory,
  Location,
  Asset,
  BorrowRecord,
  ReturnRecord,
  CompensationRecord,
  AuditLog,
  Notification,
];

export {
  Department,
  User,
  AssetCategory,
  Location,
  Asset,
  BorrowRecord,
  ReturnRecord,
  CompensationRecord,
  AuditLog,
  Notification,
};
