import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateConversationDto } from './dtos/create-conversation.dto';
import { ConversationService } from './conversation.service';

@ApiBearerAuth()
@Controller({ path: 'conversation', version: '1' })
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  createConversation(@Body() dto: CreateConversationDto, @CurrentUser() user: JwtPayload) {
    return this.conversationService.createConversation(dto, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllConversation(@CurrentUser() user: JwtPayload) {
    return this.conversationService.getAllConversation(user.sub);
  }

  @Patch(':id/pause')
  @UseGuards(JwtAuthGuard)
  pauseConversation(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.conversationService.pauseConversation(id, user.sub);
  }

  @Patch(':id/resume')
  @UseGuards(JwtAuthGuard)
  resumeConversation(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.conversationService.resumeConversation(id, user.sub);
  }
}
