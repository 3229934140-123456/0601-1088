import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, CreateUserDto, UpdateUserDto } from '../../entities/user.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction, UserRole } from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditLogService: AuditLogService,
  ) {}

  async create(createUserDto: CreateUserDto, operatorId?: number): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: [
        { employeeId: createUserDto.employeeId },
        { username: createUserDto.username },
      ],
    });

    if (existing) {
      throw new ConflictException('员工编号或用户名已存在');
    }

    const user = this.usersRepository.create(createUserDto);
    await user.hashPassword(createUserDto.password);
    const saved = await this.usersRepository.save(user);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.USER_CREATE,
      description: `创建用户: ${user.name}`,
      entityType: 'User',
      entityId: saved.id,
      afterData: saved,
    });

    return saved;
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    departmentId?: number;
    role?: UserRole;
    enabled?: boolean;
  }) {
    const { page = 1, pageSize = 20, keyword, departmentId, role, enabled } = params;

    const qb = this.usersRepository.createQueryBuilder('user').leftJoinAndSelect('user.department', 'department');

    if (keyword) {
      qb.andWhere(
        '(user.name LIKE :keyword OR user.username LIKE :keyword OR user.employeeId LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    if (departmentId) qb.andWhere('user.departmentId = :departmentId', { departmentId });
    if (role) qb.andWhere('user.role = :role', { role });
    if (enabled !== undefined) qb.andWhere('user.enabled = :enabled', { enabled });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const sanitizedList = list.map(({ password, ...rest }) => rest);
    return { list: sanitizedList, total, page, pageSize };
  }

  async findOne(id: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const { password, ...rest } = user;
    return rest as User;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    operatorId?: number,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const beforeData = { ...user };

    if (updateUserDto.employeeId && updateUserDto.employeeId !== user.employeeId) {
      const existing = await this.usersRepository.findOne({
        where: { employeeId: updateUserDto.employeeId },
      });
      if (existing) {
        throw new ConflictException('员工编号已存在');
      }
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existing = await this.usersRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existing) {
        throw new ConflictException('用户名已存在');
      }
    }

    if (updateUserDto.password) {
      await user.hashPassword(updateUserDto.password);
      delete updateUserDto.password;
    }

    Object.assign(user, updateUserDto);
    const saved = await this.usersRepository.save(user);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.USER_UPDATE,
      description: `更新用户: ${user.name}`,
      entityType: 'User',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    const { password, ...rest } = saved;
    return rest as User;
  }

  async remove(id: number, operatorId?: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.usersRepository.softDelete(id);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.USER_DELETE,
      description: `删除用户: ${user.name}`,
      entityType: 'User',
      entityId: id,
      beforeData: user,
    });
  }

  async findByEmployeeId(employeeId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { employeeId, enabled: true },
      relations: ['department'],
    });
  }
}
