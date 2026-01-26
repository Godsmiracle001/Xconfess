import {
  Body,
  Controller,
  Delete,
  Get,
  UnauthorizedException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfessionDraftService } from './confession-draft.service';
import { CreateConfessionDraftDto } from './dto/create-confession-draft.dto';
import { UpdateConfessionDraftDto } from './dto/update-confession-draft.dto';
import { ScheduleConfessionDraftDto } from './dto/schedule-confession-draft.dto';
import { Request } from 'express';

type RequestWithUser = Request & { user?: any };

@Controller('api/confessions/drafts')
@UseGuards(JwtAuthGuard)
export class ConfessionDraftController {
  constructor(private readonly service: ConfessionDraftService) {}

  private getUserId(req: RequestWithUser): number {
    const raw = req.user?.userId ?? req.user?.id;
    const parsed = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    if (!parsed || Number.isNaN(parsed)) {
      throw new UnauthorizedException('Invalid authentication context');
    }
    return parsed;
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateConfessionDraftDto) {
    const userId = this.getUserId(req);
    return this.service.createDraft(userId, dto.content, dto.scheduledFor, dto.timezone);
  }

  @Get()
  list(@Req() req: RequestWithUser) {
    const userId = this.getUserId(req);
    return this.service.listDrafts(userId);
  }

  @Get(':id')
  get(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.service.getDraft(userId, id);
  }

  @Patch(':id')
  update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateConfessionDraftDto) {
    const userId = this.getUserId(req);
    return this.service.updateDraft(userId, id, dto.content);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.service.deleteDraft(userId, id);
  }

  @Post(':id/schedule')
  schedule(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: ScheduleConfessionDraftDto) {
    const userId = this.getUserId(req);
    return this.service.scheduleDraft(userId, id, dto.scheduledFor, dto.timezone);
  }

  @Post(':id/cancel')
  cancel(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.service.cancelSchedule(userId, id);
  }

  @Post(':id/publish')
  publish(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.service.publishNow(userId, id);
  }

  @Post(':id/convert-to-draft')
  convertToDraft(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.service.convertPostedToDraft(userId, id);
  }
}
