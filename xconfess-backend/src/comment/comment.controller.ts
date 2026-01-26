import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { Request as ExpressRequest } from 'express';
import { ModerationStatus } from './entities/moderation-comment.entity';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';
import { User } from '../user/entities/user.entity';

// Custom request type with user
interface RequestWithUser extends ExpressRequest {
  user?: any;
}

@Controller('comments')
export class CommentController {
  constructor(private readonly service: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':confessionId')
  create(
    @Param('confessionId') confessionId: string,
    @Body('content') content: string,
    @Req() req: RequestWithUser,
    @Body('anonymousContextId') anonymousContextId: string,
  ) {
    const user = req.user as AnonymousUser;
    return this.service.create(content, user, confessionId, anonymousContextId);
  }

  @Get('by-confession/:confessionId')
  findByConfession(@Param('confessionId') confessionId: string) {
    return this.service.findByConfessionId(confessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const user = req.user as AnonymousUser;
    return this.service.delete(+id, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('/admin/comments/:id/approve')
  async approveComment(@Param('id') id: string, @Req() req: RequestWithUser) {
    const user = req.user as User;
    return this.service.moderateComment(+id, ModerationStatus.APPROVED, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('/admin/comments/:id/reject')
  async rejectComment(@Param('id') id: string, @Req() req: RequestWithUser) {
    const user = req.user as User;
    return this.service.moderateComment(+id, ModerationStatus.REJECTED, user);
  }
}
