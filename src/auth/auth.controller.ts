import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'ลงทะเบียนผู้ใช้ใหม่' })
  @ApiResponse({ status: 201, description: 'ลงทะเบียนผู้ใช้สำเร็จ' })
  @ApiResponse({ status: 409, description: 'อีเมลหรือชื่อผู้ใช้มีอยู่แล้ว' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบผู้ใช้' })
  @ApiResponse({ status: 200, description: 'เข้าสู่ระบบสำเร็จ' })
  @ApiResponse({ status: 401, description: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
