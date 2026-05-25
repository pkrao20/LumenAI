import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from './users/users.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { ConversationModule } from './conversation/conversation.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({ global: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'changeme',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',

      host: 'localhost',
      port: 5432,

      username: 'postgres',
      password: 'postgres',

      database: 'llm_ingestion',

      autoLoadEntities: true,

      synchronize: true,
      //TODO: set synchronise to false while pushing it
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    IngestionModule,
    ConversationModule,
    LlmModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}