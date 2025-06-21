import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('items')
@Controller('shop/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'สร้างไอเทมใหม่ (เฉพาะ Admin)' })
  @ApiResponse({ status: 201, description: 'สร้างไอเทมสำเร็จ' })
  create(@Body() createItemDto: CreateItemDto) {
    return this.itemsService.create(createItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'ดึงข้อมูลไอเทมทั้งหมด' })
  @ApiResponse({ status: 200, description: 'ส่งคืนข้อมูลไอเทมทั้งหมด' })
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดึงข้อมูลไอเทมตาม ID' })
  @ApiResponse({ status: 200, description: 'ส่งคืนข้อมูลไอเทม' })
  @ApiResponse({ status: 404, description: 'ไม่พบไอเทม' })
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'อัปเดตไอเทม (เฉพาะ Admin)' })
  @ApiResponse({ status: 200, description: 'อัปเดตไอเทมสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบไอเทม' })
  update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ลบไอเทม (เฉพาะ Admin)' })
  @ApiResponse({ status: 200, description: 'ลบไอเทมสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบไอเทม' })
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
