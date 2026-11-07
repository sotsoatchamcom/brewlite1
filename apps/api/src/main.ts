import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Thêm tiền tố toàn cục /api cho toàn bộ endpoint
  app.setGlobalPrefix('api');

  // Mở quyền truy cập thư mục uploads qua đường dẫn /uploads/...
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(
        Boolean,
    ) as string[],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        stopAtFirstError: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
  );

  // 2. Chuyển Swagger tài liệu API sang đường dẫn /api/docs để tránh trùng lặp
  const config = new DocumentBuilder()
      .setTitle('BrewLite API')
      .setDescription('API cho hệ thống đặt nước BrewLite')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // 3. Lắng nghe trên 0.0.0.0 để container Docker nhận request từ máy ngoài
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`[NestJS] API Server running on: http://localhost:${port}/api`);
  console.log(`[NestJS] Swagger Docs running on: http://localhost:${port}/api/docs`);
}
bootstrap();