import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('MHManus AI Agent System')
    .setDescription('API documentation for the MHManus multi-agent AI system')
    .setVersion('1.0')
    .addTag('tasks', 'Task management endpoints')
    .addTag('agents', 'AI agent management')
    .addTag('llm', 'LLM interaction endpoints')
    .addTag('memory', 'Memory service endpoints')
    .addTag('code-generation', 'Autonomous code generation')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
