import { Controller, Post, Body, UseGuards, Request, ForbiddenException, NotFoundException, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto, ReplyMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async sendMessage(@Body() dto: CreateMessageDto, @Request() req) {
   try {
      const message = await this.messagesService.create(dto, req.user);

      return { success: true, messageId: message.id };
    } catch (error) {
      // Service layer exceptions will be handled by NestJS exception filters
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('reply')
  async replyMessage(@Body() dto: ReplyMessageDto, @Request() req) {
    const message = await this.messagesService.reply(dto, req.user);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMessages(@Query('confession_id', new ParseUUIDPipe()) confession_id: string, @Request() req) {
    const messages = await this.messagesService.findForConfessionAuthor(confession_id, req.user);
    // Hide sender info for anonymity
    return {
      messages: messages.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        hasReply: m.hasReply,
        replyContent: m.replyContent,
        repliedAt: m.repliedAt,
      })),
      total: messages.length,
    };
  }
}
