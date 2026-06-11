import { Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, LoginDto, TokenPayload } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Public, GetCurrentUserId } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import { Body } from '@nestjs/common';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(@Request() req: { user: User }, @Body() _loginDto: LoginDto): Promise<TokenPayload> {
    return this.authService.login(req.user);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@GetCurrentUserId() userId: number) {
    return this.authService.getCurrentUser(userId);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出' })
  async logout() {
    return { message: '登出成功' };
  }
}
