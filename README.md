# 企业资产领用归还后端服务

企业级资产管理系统，供办公系统、门禁柜和移动端统一调用的后端服务。

## 功能特性

### 核心业务
- **资产查询**: 按员工、部门、资产类别、位置、状态多维度查询
- **可领用列表**: 展示当前可借用的资产
- **领用登记**: 提交领用人、用途、预计归还时间、附件凭证
- **归还确认**: 管理员确认归还，登记损坏情况
- **超期提醒**: 自动检测超期资产，推送提醒通知
- **使用记录**: 完整的资产使用历史追溯

### 管理功能
- **资产冻结/解冻**: 管理员可冻结不可借资产
- **损坏登记**: 归还时登记资产损坏情况
- **赔偿处理**: 发起赔偿、确认支付、免除赔偿
- **个人占用清单**: 查看个人当前借用资产
- **部门使用汇总**: 按部门统计领用情况
- **到期通知**: 系统自动推送到期和超期通知
- **审计日志**: 所有操作记录完整保留，供审计追溯

## 技术栈

- **框架**: NestJS 10.x (TypeScript)
- **数据库**: MySQL 8.0+
- **ORM**: TypeORM 0.3.x
- **认证**: JWT + Passport
- **权限**: RBAC 角色权限控制
- **文档**: Swagger/OpenAPI 3.0
- **定时任务**: @nestjs/schedule (Cron)
- **文件上传**: Multer
- **安全**: Helmet, CORS, 参数校验

## 项目结构

```
src/
├── common/                    # 公共模块
│   ├── decorators/            # 装饰器
│   │   ├── roles.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── get-current-user.decorator.ts
│   │   └── get-current-user-id.decorator.ts
│   ├── enums/                 # 枚举定义
│   │   └── index.ts
│   ├── entities/              # 基础实体
│   │   └── base.entity.ts
│   ├── filters/               # 过滤器
│   │   └── http-exception.filter.ts
│   ├── guards/                # 守卫
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── interceptors/          # 拦截器
│       └── logging.interceptor.ts
├── entities/                  # 数据库实体
│   ├── asset.entity.ts
│   ├── asset-category.entity.ts
│   ├── audit-log.entity.ts
│   ├── borrow-record.entity.ts
│   ├── compensation-record.entity.ts
│   ├── department.entity.ts
│   ├── location.entity.ts
│   ├── notification.entity.ts
│   ├── return-record.entity.ts
│   └── user.entity.ts
├── modules/                   # 业务模块
│   ├── auth/                  # 认证模块
│   ├── assets/                # 资产管理
│   ├── borrow-records/        # 领用管理
│   ├── return-records/        # 归还管理
│   ├── compensation-records/  # 赔偿管理
│   ├── users/                 # 用户管理
│   ├── departments/           # 部门管理
│   ├── asset-categories/      # 资产类别
│   ├── locations/             # 位置管理
│   ├── statistics/            # 统计查询
│   ├── audit-logs/            # 审计日志
│   ├── notifications/         # 通知管理
│   ├── schedule-tasks/        # 定时任务
│   └── upload/                # 文件上传
├── app.module.ts              # 应用模块
├── data-source.ts             # 数据源配置
├── main.ts                    # 入口文件
└── seed.ts                    # 种子数据
```

## 数据库设计

### 核心数据表
1. **departments** - 部门表
2. **users** - 用户表（员工）
3. **asset_categories** - 资产类别表
4. **locations** - 位置表
5. **assets** - 资产表
6. **borrow_records** - 领用记录表
7. **return_records** - 归还记录表
8. **compensation_records** - 赔偿记录表
9. **notifications** - 通知表
10. **audit_logs** - 审计日志表

### ER关系
```
用户 (n) -- (1) 部门
资产 (n) -- (1) 类别
资产 (n) -- (1) 位置
领用记录 (n) -- (1) 资产
领用记录 (n) -- (1) 领用人
归还记录 (1) -- (1) 领用记录
赔偿记录 (1) -- (1) 归还记录
通知 (n) -- (1) 用户
审计日志 (n) -- (0..1) 操作用户
```

## 快速开始

### 环境要求
- Node.js >= 18.17.0
- MySQL >= 8.0
- npm >= 9.0.0

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env` 文件并根据实际情况修改：

```bash
cp .env .env.local
```

主要配置项：
```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=asset_management

EXPIRE_NOTIFY_DAYS=3
OVERDUE_CHECK_CRON=0 8 * * *
```

### 3. 创建数据库

```sql
CREATE DATABASE asset_management DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 初始化种子数据

```bash
npm run seed
```

初始化后默认账号：
| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 超级管理员 | admin | admin123 | 拥有所有权限 |
| 资产管理员 | manager | 123456 | 资产管理权限 |
| 普通用户 | zhangsan | 123456 | 普通员工 |

### 5. 启动服务

```bash
# 开发模式
npm run start:dev

# 生产构建
npm run build
npm run start:prod
```

### 6. 访问 API 文档

启动后访问：http://localhost:3000/api/docs

## API 接口

### 认证接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/login | 用户登录 | 公开 |
| GET | /api/auth/profile | 获取当前用户信息 | 已登录 |
| POST | /api/auth/logout | 用户登出 | 已登录 |

### 资产管理
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/assets | 获取资产列表 | 已登录 |
| GET | /api/assets/available | 可领用资产列表 | 已登录 |
| GET | /api/assets/my-borrowed | 我的借用资产 | 已登录 |
| GET | /api/assets/stats | 资产统计 | 已登录 |
| GET | /api/assets/:id | 资产详情 | 已登录 |
| POST | /api/assets | 创建资产 | 管理员 |
| PATCH | /api/assets/:id | 更新资产 | 管理员 |
| DELETE | /api/assets/:id | 删除资产 | 超级管理员 |
| PUT | /api/assets/:id/freeze | 冻结资产 | 管理员 |
| PUT | /api/assets/:id/unfreeze | 解冻资产 | 管理员 |

### 领用管理
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/borrow-records | 领用记录列表 | 已登录 |
| GET | /api/borrow-records/overdue | 超期列表 | 管理员 |
| GET | /api/borrow-records/expiring | 即将到期列表 | 管理员 |
| GET | /api/borrow-records/:id | 领用详情 | 已登录 |
| POST | /api/borrow-records | 提交领用申请 | 已登录 |
| PATCH | /api/borrow-records/:id/approve | 审批领用 | 管理员 |
| PATCH | /api/borrow-records/:id/cancel | 撤销申请 | 已登录 |

### 归还管理
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/return-records | 归还记录列表 | 管理员 |
| GET | /api/return-records/:id | 归还详情 | 已登录 |
| POST | /api/return-records | 提交归还申请 | 已登录 |
| PATCH | /api/return-records/:id/confirm | 确认归还 | 管理员 |

### 赔偿管理
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/compensation-records | 赔偿记录列表 | 管理员 |
| GET | /api/compensation-records/:id | 赔偿详情 | 已登录 |
| POST | /api/compensation-records | 发起赔偿 | 管理员 |
| PATCH | /api/compensation-records/:id | 更新赔偿 | 管理员 |
| PUT | /api/compensation-records/:id/waive | 免除赔偿 | 管理员 |

### 统计查询
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/statistics/overview | 概览统计 | 已登录 |
| GET | /api/statistics/asset-status | 资产状态统计 | 已登录 |
| GET | /api/statistics/asset-by-category | 按类别统计 | 已登录 |
| GET | /api/statistics/borrow-trend | 领用趋势 | 已登录 |
| GET | /api/statistics/department-usage | 部门汇总 | 管理员 |
| GET | /api/statistics/my-usage | 我的使用统计 | 已登录 |
| GET | /api/statistics/user-usage/:userId | 用户使用统计 | 管理员 |
| GET | /api/statistics/asset-history/:assetId | 资产使用历史 | 已登录 |
| GET | /api/statistics/overdue-ranking | 超期排行榜 | 管理员 |

### 其他接口
- **用户管理**: `/api/users/*` (管理员)
- **部门管理**: `/api/departments/*`
- **类别管理**: `/api/asset-categories/*`
- **位置管理**: `/api/locations/*`
- **通知管理**: `/api/notifications/*`
- **审计日志**: `/api/audit-logs/*` (管理员)
- **文件上传**: `/api/upload/*`
- **定时任务**: `/api/schedule-tasks/*` (管理员)

## 角色权限

### 超级管理员 (super_admin)
- 所有操作权限
- 用户管理（创建、删除）
- 系统配置

### 资产管理员 (admin)
- 资产CRUD、冻结/解冻
- 领用审批、归还确认
- 赔偿处理
- 查看统计报表
- 审计日志查看

### 普通用户 (user)
- 查看资产列表、可领用资产
- 提交领用/归还申请
- 查看个人借用记录
- 查看个人通知

## 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

分页响应：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

## 定时任务

系统内置以下定时任务（Cron 表达式可配置）：

1. **超期检测** - 每天 08:00 执行
   - 检测已超期的领用记录
   - 更新状态为 OVERDUE
   - 推送超期警告通知

2. **到期提醒** - 每天 09:00 执行
   - 检测即将到期（默认3天内）的领用
   - 推送归还提醒通知

## 审计日志

所有重要操作都会记录审计日志，包括：
- 资产创建、更新、删除、冻结、解冻
- 领用申请、审批、撤销
- 归还提交、确认
- 损坏登记、赔偿处理
- 用户创建、更新、删除
- 系统配置变更

每条日志包含：
- 操作人ID和姓名
- 操作类型和描述
- 操作时间和IP
- 变更前后数据对比

## 文件上传

支持上传的文件类型：
- 图片: jpeg, jpg, png, gif
- 文档: pdf, doc, docx, xls, xlsx

最大单文件大小: 10MB

上传后可通过 `/uploads/...` 路径访问。

## 开发说明

### 添加新模块

1. 在 `src/modules/` 下创建模块目录
2. 创建 `xxx.module.ts`, `xxx.service.ts`, `xxx.controller.ts`
3. 在 `app.module.ts` 中导入模块

### 数据库迁移

```bash
# 生成迁移
npm run migration:generate -- src/migrations/[migration-name]

# 执行迁移
npm run migration:run
```

### 代码检查

```bash
npm run lint
npm run format
```

## 生产部署

### 使用 PM2

```bash
npm i -g pm2
npm run build
pm2 start dist/main.js --name asset-service
```

### Docker 部署

创建 `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

## 常见问题

### 1. 数据库连接失败
检查 `.env` 中的数据库配置，确保 MySQL 服务已启动。

### 2. 登录失败
确认已执行 `npm run seed` 初始化数据，或手动创建用户。

### 3. 定时任务不执行
检查系统时区配置，默认使用 `Asia/Shanghai` 时区。

### 4. 上传文件无法访问
确认 `uploads` 目录存在且有读写权限。

## License

UNLICENSED
