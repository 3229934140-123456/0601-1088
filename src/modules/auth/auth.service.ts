import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsString()
  @MaxLength(50)
  @ApiProperty({ description: '用户名', maxLength: 50 })
  username: string;

  @IsString()
  @MaxLength(50)
  @ApiProperty({ description: '密码', maxLength: 50 })
  password: string;
}

export interface TokenPayload {
  accessToken: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
    departmentId?: number;
    avatar?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { username, enabled: true },
      relations: ['department'],
    });

    if (user && (await user.validatePassword(password))) {
      return user;
    }
    return null;
  }

  async login(user: User): Promise<TokenPayload> {
    if (!user.enabled) {
      throw new UnauthorizedException('账户已被禁用');
    }

    const userData = user as any;
    const payload = {
      sub: userData.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: userData.id,
        username: user.username,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        avatar: user.avatar,
      },
    };
  }

  async getCurrentUser(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name,
      avatar: user.avatar,
      phone: user.phone,
      email: user.email,
      employeeId: user.employeeId,
    };
  }
}
