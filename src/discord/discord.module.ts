import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { DiscordService } from './discord.service';
import { DiscordCommands } from './discord.commands';
@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('DISCORD_BOT_TOKEN') as string,
        intents: [
          'Guilds',
          'GuildMessages',
          'DirectMessages',
          'GuildVoiceStates',
        ],
        development: false,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DiscordService, DiscordCommands],
  exports: [DiscordService],
})
export class DiscordModule {}
