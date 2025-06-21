import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '@prisma/client';
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงข้อมูลผู้ใช้ทั้งหมด (เฉพาะ Admin)' })
  @ApiResponse({ status: 200, description: 'ส่งคืนข้อมูลผู้ใช้ทั้งหมด' })
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงข้อมูลผู้ใช้ปัจจุบัน' })
  @ApiResponse({ status: 200, description: 'ส่งคืนข้อมูลผู้ใช้ปัจจุบัน' })
  async getCurrentUser(@GetUser() user: User) {
    console.log('user', user);
    console.log('user.id', user.id);

    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงข้อมูลผู้ใช้ตาม ID' })
  @ApiResponse({ status: 200, description: 'ส่งคืนข้อมูลผู้ใช้' })
  @ApiResponse({ status: 404, description: 'ไม่พบผู้ใช้' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'อัปเดตบทบาทผู้ใช้ (เฉพาะ Admin)' })
  @ApiResponse({ status: 200, description: 'อัปเดตบทบาทผู้ใช้สำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบผู้ใช้' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateRole(id, updateUserDto);
  }
}
