import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfessionService } from './confession.service';
import { CreateConfessionDto } from './dto/create-confession.dto';
import { UpdateConfessionDto } from './dto/update-confession.dto';
import { GetConfessionsDto } from './dto/get-confessions.dto';
import { SearchConfessionDto } from './dto/search-confession.dto';
import { AnchorConfessionDto } from '../stellar/dto/anchor-confession.dto';
import { Request } from 'express';
import { TagService } from './tag.service';
import { GetConfessionsByTagDto } from './dto/get-confessions-by-tag.dto';

@Controller('confessions')
export class ConfessionController {
  // For testing compatibility: expose getConfessionById
  getConfessionById(id: string, req: Request) {
    return this.getById(id, req);
  }
  constructor(
    private readonly service: ConfessionService,
    private readonly tagService: TagService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateConfessionDto) {
    return this.service.create(dto);
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(@Query() dto: GetConfessionsDto) {
    return this.service.getConfessions(dto);
  }

  @Get('tags')
  getAllTags() {
    return this.tagService.getAllTags();
  }

  @Get('tags/stats')
  getTagsWithStats() {
    return this.tagService.getTagsWithCount();
  }

  @Get('tags/:tag')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  getByTag(@Param('tag') tag: string, @Query() dto: GetConfessionsByTagDto) {
    return this.service.getConfessionsByTag(tag, dto.page, dto.limit);
  }

  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@Query() dto: SearchConfessionDto) {
    return this.service.search(dto);
  }

  @Get('search/fulltext')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  fullTextSearch(@Query() dto: SearchConfessionDto) {
    return this.service.fullTextSearch(dto);
  }

  @Get('trending/top')
  getTrending() {
    return this.service.getTrendingConfessions();
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    return this.service.getConfessionByIdWithViewCount(id, req);
  }

  @Get(':id/stellar/verify')
  verifyStellarAnchor(@Param('id') id: string) {
    return this.service.verifyStellarAnchor(id);
  }

  @Post(':id/anchor')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  anchorConfession(@Param('id') id: string, @Body() dto: AnchorConfessionDto) {
    return this.service.anchorConfession(id, dto);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() dto: UpdateConfessionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
