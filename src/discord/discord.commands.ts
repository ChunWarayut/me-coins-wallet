/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DiscordCommands {
  constructor(private prisma: PrismaService) {}

  @SlashCommand({
    name: 'register',
    description: 'Register your Discord account',
  })
  public async onRegister(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: RegisterDto,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });
    const hashedPassword = await bcrypt.hash(options.password, 10);

    if (existingUser) {
      await this.prisma.user.update({
        where: { discordId: interaction.user.id },
        data: {
          username: options.username,
          password: hashedPassword,
        },
      });
      return interaction.reply({
        content: 'บัญชี Discord ของคุณได้แก้ไขชื่อผู้ใช้งานและรหัสผ่านแล้ว!',
        ephemeral: true,
      });
    }

    // Generate unique account number
    let accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000,
    ).toString();
    let isUnique = false;

    while (!isUnique) {
      const existingAccount = await this.prisma.user.findFirst({
        where: {
          accountNumber,
        },
      });
      if (!existingAccount) {
        isUnique = true;
      } else {
        accountNumber = Math.floor(
          1000000000 + Math.random() * 9000000000,
        ).toString();
      }
    }
    await this.prisma.user.create({
      data: {
        discordId: interaction.user.id,
        username: options.username,
        email: `${interaction.user.id}@discord.com`,
        password: hashedPassword,
        avatar: interaction.user.avatarURL() || '',
        role: UserRole.NORMAL,
        accountNumber,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
    });

    return interaction.reply({
      content: 'บัญชี Discord ของคุณได้ลงทะเบียนแล้ว!',
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'balance',
    description: 'Check your wallet balance',
  })
  public async onBalance(@Context() [interaction]: SlashCommandContext) {
    const user = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!user) {
      return interaction.reply({
        content: 'You need to link your Discord account first!',
        ephemeral: true,
      });
    }

    if (!user.wallet) {
      return interaction.reply({
        content: "You don't have a wallet yet!",
        ephemeral: true,
      });
    }

    const wallet = user.wallet as { balance: number };
    return interaction.reply({
      content: `Your current balance is: ${wallet.balance} coins`,
      ephemeral: true,
    });
  }
}
