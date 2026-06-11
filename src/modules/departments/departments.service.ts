import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department, CreateDepartmentDto, UpdateDepartmentDto } from '../../entities/department.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction } from '../../common/enums';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
    operatorId?: number,
  ): Promise<Department> {
    const existing = await this.departmentsRepository.findOne({
      where: { name: createDepartmentDto.name },
    });
    if (existing) {
      throw new ConflictException('部门名称已存在');
    }

    const department = this.departmentsRepository.create(createDepartmentDto);
    const saved = await this.departmentsRepository.save(department);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `创建部门: ${department.name}`,
      entityType: 'Department',
      entityId: saved.id,
      afterData: saved,
    });

    return saved;
  }

  async findAll(params: { enabled?: boolean; parentId?: number } = {}) {
    const { enabled, parentId } = params;
    const qb = this.departmentsRepository.createQueryBuilder('department');

    if (enabled !== undefined) qb.andWhere('department.enabled = :enabled', { enabled });
    if (parentId !== undefined) qb.andWhere('department.parentId = :parentId', { parentId });

    const list = await qb
      .leftJoinAndSelect('department.users', 'users')
      .orderBy('department.sort', 'ASC')
      .addOrderBy('department.createdAt', 'DESC')
      .getMany();

    return list;
  }

  async findTree(): Promise<any[]> {
    const departments = await this.departmentsRepository.find({
      where: { enabled: true },
      order: { sort: 'ASC' },
    });
    return this.buildTree(departments as any[], null);
  }

  private buildTree(departments: any[], parentId: number | null): any[] {
    return departments
      .filter((d) => d.parentId === parentId)
      .map((d) => ({
        ...d,
        children: this.buildTree(departments, d.id),
      }));
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentsRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }
    return department;
  }

  async update(
    id: number,
    updateDepartmentDto: UpdateDepartmentDto,
    operatorId?: number,
  ): Promise<Department> {
    const department = await this.departmentsRepository.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    const beforeData = { ...department };

    if (
      updateDepartmentDto.name &&
      updateDepartmentDto.name !== department.name
    ) {
      const existing = await this.departmentsRepository.findOne({
        where: { name: updateDepartmentDto.name },
      });
      if (existing) {
        throw new ConflictException('部门名称已存在');
      }
    }

    Object.assign(department, updateDepartmentDto);
    const saved = await this.departmentsRepository.save(department);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `更新部门: ${department.name}`,
      entityType: 'Department',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    return saved;
  }

  async remove(id: number, operatorId?: number): Promise<void> {
    const department = await this.departmentsRepository.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    const hasChildren = await this.departmentsRepository.findOne({
      where: { parentId: id },
    });
    if (hasChildren) {
      throw new ConflictException('存在子部门，无法删除');
    }

    const hasUsers = await this.departmentsRepository
      .createQueryBuilder('d')
      .leftJoin('d.users', 'u')
      .where('d.id = :id', { id })
      .andWhere('u.id IS NOT NULL')
      .getOne();
    if (hasUsers) {
      throw new ConflictException('部门下存在用户，无法删除');
    }

    await this.departmentsRepository.softDelete(id);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `删除部门: ${department.name}`,
      entityType: 'Department',
      entityId: id,
      beforeData: department,
    });
  }
}
