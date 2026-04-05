import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}

class SetPasswordDto {
  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsString()
  adminSecret: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('setup-password')
  @ApiOperation({ summary: 'Set or reset admin password (requires ADMIN_SETUP_SECRET)' })
  async setupPassword(@Body() dto: SetPasswordDto) {
    const secret = process.env.ADMIN_SETUP_SECRET ?? 'change-me-in-production';
    if (dto.adminSecret !== secret) {
      return { error: 'Invalid admin secret' };
    }
    return this.authService.setPassword(dto.email, dto.password);
  }
}
