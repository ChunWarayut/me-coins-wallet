import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction, Deposit, Withdrawal, User } from '@prisma/client';
import { GetUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Transactions
  @Get()
  async getTransactions(@GetUser() user: User): Promise<Transaction[]> {
    console.log(user);
    return this.transactionsService.getTransactions(user);
  }

  // Deposits
  @Post('deposits')
  async createDepositRequest(
    @Body() createDepositDto: CreateDepositDto,
    @GetUser() user: User,
  ): Promise<Deposit> {
    return this.transactionsService.createDepositRequest({
      amount: createDepositDto.amount,
      userId: user.id,
      slipImage: createDepositDto.slipImage,
    });
  }

  @Get('deposits')
  async getDepositRequests(): Promise<Deposit[]> {
    return this.transactionsService.getDepositRequests();
  }

  @Patch('deposits/:id/status')
  async updateDepositStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateRequestStatusDto,
  ): Promise<Deposit> {
    console.log(updateStatusDto);
    return this.transactionsService.updateDepositStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.comment,
    );
  }

  // Withdrawals
  @Post('withdrawals')
  async createWithdrawRequest(
    @Body() createWithdrawDto: CreateWithdrawDto,
    @GetUser() user: User,
  ): Promise<Withdrawal> {
    return this.transactionsService.createWithdrawRequest({
      amount: createWithdrawDto.amount,
      userId: user.id,
    });
  }

  @Get('withdrawals')
  async getWithdrawRequests(): Promise<Withdrawal[]> {
    return this.transactionsService.getWithdrawRequests();
  }

  @Patch('withdrawals/:id/status')
  async updateWithdrawStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateRequestStatusDto,
  ): Promise<Withdrawal> {
    return this.transactionsService.updateWithdrawStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.comment,
    );
  }
}
