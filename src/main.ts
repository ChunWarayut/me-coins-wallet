import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as morgan from 'morgan';
import chalk from 'chalk';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // เปิดใช้งาน raw body สำหรับ webhook
  });
  
  // Serve static files (React build)
  app.useStaticAssets(join(__dirname, '..', '..', 'public'));
  
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MeCoins API')
    .setDescription('เอกสาร API สำหรับแพลตฟอร์ม MeCoins')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use(morgan('combined'));

  await app.listen(3000);
  console.log(chalk.green(`แอปพลิเคชันกำลังทำงานที่: ${await app.getUrl()}`));
}
bootstrap();
