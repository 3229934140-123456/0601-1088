export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
}

export enum AssetStatus {
  AVAILABLE = 'available',
  BORROWED = 'borrowed',
  FROZEN = 'frozen',
  DAMAGED = 'damaged',
  UNDER_REPAIR = 'under_repair',
  LOST = 'lost',
  SCRAPPED = 'scrapped',
}

export enum BorrowStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BORROWED = 'borrowed',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
}

export enum ReturnStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DAMAGED = 'damaged',
  LOST = 'lost',
}

export enum CompensationStatus {
  PENDING = 'pending',
  PAID = 'paid',
  WAIVED = 'waived',
}

export enum NotificationType {
  BORROW_APPROVED = 'borrow_approved',
  BORROW_REJECTED = 'borrow_rejected',
  RETURN_REMINDER = 'return_reminder',
  OVERDUE_WARNING = 'overdue_warning',
  COMPENSATION_REQUEST = 'compensation_request',
  ASSET_FROZEN = 'asset_frozen',
  SYSTEM_NOTICE = 'system_notice',
}

export enum AuditAction {
  ASSET_CREATE = 'asset_create',
  ASSET_UPDATE = 'asset_update',
  ASSET_DELETE = 'asset_delete',
  ASSET_FREEZE = 'asset_freeze',
  ASSET_UNFREEZE = 'asset_unfreeze',
  BORROW_REQUEST = 'borrow_request',
  BORROW_APPROVE = 'borrow_approve',
  BORROW_REJECT = 'borrow_reject',
  RETURN_SUBMIT = 'return_submit',
  RETURN_CONFIRM = 'return_confirm',
  DAMAGE_REPORT = 'damage_report',
  COMPENSATION_CREATE = 'compensation_create',
  COMPENSATION_PAY = 'compensation_pay',
  COMPENSATION_WAIVE = 'compensation_waive',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  SYSTEM_CONFIG = 'system_config',
}
