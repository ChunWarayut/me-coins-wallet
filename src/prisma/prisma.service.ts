import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await (this.$connect as () => Promise<void>)();
  }

  enableShutdownHooks(app: INestApplication) {
    (this.$on as (event: string, callback: () => Promise<void>) => void)(
      'beforeExit',
      async () => {
        await app.close();
      },
    );
  }
}
