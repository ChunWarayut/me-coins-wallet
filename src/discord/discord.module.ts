import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { DiscordService } from './discord.service';
import { DiscordCommands } from './discord.commands';
import { TransfersService } from '../transfers/transfers.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsModule } from '../payments/payments.module';
import { Client } from 'discord.js';

@Module({
  imports: [
    forwardRef(() => PaymentsModule),
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('DISCORD_BOT_TOKEN') as string,
        intents: [
          'Guilds',
          'GuildMessages',
          'DirectMessages',
          'GuildMembers',
          'GuildPresences',
          'GuildEmojisAndStickers',
          'GuildScheduledEvents',
          'GuildInvites',
          'GuildWebhooks',
          'GuildIntegrations',
          'GuildScheduledEvents',
          'GuildInvites',
          'GuildWebhooks',
          'GuildIntegrations',
          'GuildScheduledEvents',
          'GuildInvites',
          'GuildWebhooks',
          'GuildIntegrations',
          'GuildScheduledEvents',
          'GuildInvites',
          'GuildWebhooks',
          'GuildIntegrations',
          'GuildVoiceStates',
        ],
        development: false,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    DiscordService,
    DiscordCommands,
    TransfersService,
    PrismaService,
    {
      provide: 'DISCORD_CLIENT',
      useFactory: async () => {
        // Client จะถูก inject จาก NecordModule โดยอัตโนมัติ
        // แต่เราจะ set จาก interaction.client แทน
        return null;
      },
    },
  ],
  exports: [DiscordService],
})
export class DiscordModule {}
