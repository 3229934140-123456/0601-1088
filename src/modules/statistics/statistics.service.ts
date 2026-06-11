import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between, In } from 'typeorm';
import { Asset } from '../../entities/asset.entity';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { ReturnRecord } from '../../entities/return-record.entity';
import { CompensationRecord } from '../../entities/compensation-record.entity';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { AssetCategory } from '../../entities/asset-category.entity';
import {
  AssetStatus,
  BorrowStatus,
  CompensationStatus,
  ReturnStatus,
} from '../../common/enums';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Asset)
    private assetsRepository: Repository<Asset>,
    @InjectRepository(BorrowRecord)
    private borrowRecordsRepository: Repository<BorrowRecord>,
    @InjectRepository(ReturnRecord)
    private returnRecordsRepository: Repository<ReturnRecord>,
    @InjectRepository(CompensationRecord)
    private compensationRecordsRepository: Repository<CompensationRecord>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @InjectRepository(AssetCategory)
    private categoriesRepository: Repository<AssetCategory>,
  ) {}

  async getOverview() {
    const [
      totalAssets,
      totalUsers,
      totalDepartments,
      borrowedCount,
      overdueCount,
      pendingCompensationCount,
      totalCompensationAmount,
    ] = await Promise.all([
      this.assetsRepository.count(),
      this.usersRepository.count({ where: { enabled: true } }),
      this.departmentsRepository.count({ where: { enabled: true } }),
      this.borrowRecordsRepository.count({
        where: { status: In([BorrowStatus.BORROWED, BorrowStatus.OVERDUE]) },
      }),
      this.borrowRecordsRepository.count({ where: { status: BorrowStatus.OVERDUE } }),
      this.compensationRecordsRepository.count({
        where: { status: CompensationStatus.PENDING },
      }),
      this.compensationRecordsRepository
        .createQueryBuilder('c')
        .select('SUM(c.amount)', 'total')
        .where('c.status = :status', { status: CompensationStatus.PAID })
        .getRawOne(),
    ]);

    const assetValue = await this.assetsRepository
      .createQueryBuilder('a')
      .select('SUM(a.purchasePrice)', 'total')
      .getRawOne();

    return {
      totalAssets,
      totalUsers,
      totalDepartments,
      borrowedCount,
      overdueCount,
      pendingCompensationCount,
      totalCompensationAmount: Number(totalCompensationAmount.total) || 0,
      totalAssetValue: Number(assetValue.total) || 0,
    };
  }

  async getAssetStatusStats() {
    const statuses = Object.values(AssetStatus);
    const result = await Promise.all(
      statuses.map(async (status) => {
        const count = await this.assetsRepository.count({ where: { status } });
        return { status, count };
      }),
    );
    return result;
  }

  async getAssetByCategory() {
    const categories = await this.categoriesRepository.find({
      where: { enabled: true },
    });

    const result = await Promise.all(
      categories.map(async (category) => {
        const count = await this.assetsRepository.count({
          where: { categoryId: category.id },
        });
        return {
          id: category.id,
          name: category.name,
          code: category.code,
          count,
        };
      }),
    );

    return result.filter((r) => r.count > 0);
  }

  async getBorrowTrend(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const borrowRecords = await this.borrowRecordsRepository
      .createQueryBuilder('record')
      .select('DATE(record.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('record.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(record.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const returnRecords = await this.returnRecordsRepository
      .createQueryBuilder('record')
      .select('DATE(record.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('record.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(record.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dateMap = new Map<string, { borrow: number; return: number }>();

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dateMap.set(dateStr, { borrow: 0, return: 0 });
    }

    borrowRecords.forEach((r) => {
      const entry = dateMap.get(r.date);
      if (entry) entry.borrow = Number(r.count);
    });

    returnRecords.forEach((r) => {
      const entry = dateMap.get(r.date);
      if (entry) entry.return = Number(r.count);
    });

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      borrowCount: data.borrow,
      returnCount: data.return,
    }));
  }

  async getDepartmentUsage(params: { startDate?: Date; endDate?: Date }) {
    const { startDate, endDate } = params;

    const departments = await this.departmentsRepository.find({
      where: { enabled: true },
      relations: ['users'],
    });

    const result = await Promise.all(
      departments.map(async (dept) => {
        const userIds = dept.users.map((u) => u.id);

        const qb = this.borrowRecordsRepository
          .createQueryBuilder('record')
          .leftJoin('record.borrower', 'borrower')
          .where('borrower.departmentId = :deptId', { deptId: dept.id });

        if (startDate) {
          qb.andWhere('record.borrowDate >= :startDate', { startDate });
        }
        if (endDate) {
          qb.andWhere('record.borrowDate <= :endDate', { endDate });
        }

        const totalBorrow = await qb.getCount();

        const currentBorrow = await this.borrowRecordsRepository.count({
          where: {
            borrowerId: In(userIds),
            status: In([BorrowStatus.BORROWED, BorrowStatus.OVERDUE]),
          },
        });

        const overdueCount = await this.borrowRecordsRepository.count({
          where: {
            borrowerId: In(userIds),
            status: BorrowStatus.OVERDUE,
          },
        });

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          userCount: dept.users.length,
          totalBorrow,
          currentBorrow,
          overdueCount,
        };
      }),
    );

    return result;
  }

  async getUserUsage(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });
    if (!user) {
      return null;
    }

    const [totalBorrow, currentBorrow, overdueCount, totalReturn] = await Promise.all([
      this.borrowRecordsRepository.count({ where: { borrowerId: userId } }),
      this.borrowRecordsRepository.count({
        where: {
          borrowerId: userId,
          status: In([BorrowStatus.BORROWED, BorrowStatus.OVERDUE]),
        },
      }),
      this.borrowRecordsRepository.count({
        where: { borrowerId: userId, status: BorrowStatus.OVERDUE },
      }),
      this.returnRecordsRepository
        .createQueryBuilder('r')
        .leftJoin('r.borrowRecord', 'br')
        .where('br.borrowerId = :userId', { userId })
        .getCount(),
    ]);

    const borrowHistory = await this.borrowRecordsRepository.find({
      where: { borrowerId: userId },
      relations: ['asset', 'asset.category'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        department: user.department?.name,
      },
      statistics: {
        totalBorrow,
        currentBorrow,
        overdueCount,
        totalReturn,
      },
      recentRecords: borrowHistory.map((r) => ({
        id: r.id,
        recordNo: r.recordNo,
        assetName: r.asset?.name,
        assetCode: r.asset?.assetCode,
        category: r.asset?.category?.name,
        borrowDate: r.borrowDate,
        expectedReturnDate: r.expectedReturnDate,
        status: r.status,
        isOverdue: r.isOverdue,
      })),
    };
  }

  async getAssetUsageHistory(assetId: number) {
    const asset = await this.assetsRepository.findOne({ where: { id: assetId } });
    if (!asset) {
      return null;
    }

    const records = await this.borrowRecordsRepository.find({
      where: { assetId },
      relations: ['borrower', 'borrower.department', 'returnRecord'],
      order: { createdAt: 'DESC' },
    });

    const totalBorrowCount = records.length;
    const totalBorrowDays = records.reduce((sum, r) => {
      if (r.actualReturnDate) {
        const diff = r.actualReturnDate.getTime() - r.borrowDate.getTime();
        return sum + Math.ceil(diff / (1000 * 60 * 60 * 24));
      }
      return sum;
    }, 0);

    return {
      asset: {
        id: asset.id,
        name: asset.name,
        assetCode: asset.assetCode,
        status: asset.status,
      },
      statistics: {
        totalBorrowCount,
        totalBorrowDays,
      },
      history: records.map((r) => ({
        id: r.id,
        recordNo: r.recordNo,
        borrower: {
          id: r.borrower?.id,
          name: r.borrower?.name,
          department: r.borrower?.department?.name,
        },
        purpose: r.purpose,
        borrowDate: r.borrowDate,
        expectedReturnDate: r.expectedReturnDate,
        actualReturnDate: r.actualReturnDate,
        status: r.status,
        hasDamage: r.returnRecord?.hasDamage || false,
      })),
    };
  }

  async getOverdueRanking(limit: number = 10) {
    const users = await this.usersRepository.find({
      where: { enabled: true },
      relations: ['department'],
    });

    const result = await Promise.all(
      users.map(async (user) => {
        const overdueCount = await this.borrowRecordsRepository.count({
          where: {
            borrowerId: user.id,
            status: BorrowStatus.OVERDUE,
          },
        });

        const overdueRecords = await this.borrowRecordsRepository.find({
          where: {
            borrowerId: user.id,
            status: BorrowStatus.OVERDUE,
          },
          relations: ['asset'],
        });

        const totalOverdueDays = overdueRecords.reduce((sum, r) => {
          return sum + Math.abs(r.daysRemaining);
        }, 0);

        return {
          userId: user.id,
          userName: user.name,
          employeeId: user.employeeId,
          department: user.department?.name,
          overdueCount,
          totalOverdueDays,
          overdueAssets: overdueRecords.map((r) => r.asset?.name),
        };
      }),
    );

    return result
      .filter((r) => r.overdueCount > 0)
      .sort((a, b) => b.totalOverdueDays - a.totalOverdueDays)
      .slice(0, limit);
  }
}
