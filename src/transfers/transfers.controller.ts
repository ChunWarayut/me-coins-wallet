import { Controller, Post, Body, Get, UseGuards, Param } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from '@prisma/client';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTransfer(
    @GetUser() user: User,
    @Body() createTransferDto: CreateTransferDto,
  ) {
    return this.transfersService.createTransfer(user.id, createTransferDto);
  }

  @Post(':discordId')
  async createTransferFromDiscord(
    @Param('discordId') discordId: string,
    @Body() createTransferDto: CreateTransferDto,
  ) {
    return this.transfersService.createTransferFromDiscord(
      discordId,
      createTransferDto,
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getTransferHistory(@GetUser() user: User) {
    console.log('user', user);

    return this.transfersService.getTransferHistory(user.id);
  }
}
