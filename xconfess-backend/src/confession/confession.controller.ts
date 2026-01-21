import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { ConfessionService } from './confession.service';
import { CreateConfessionDto } from './dto/create-confession.dto';
import { UpdateConfessionDto } from './dto/update-confession.dto';
import { GetConfessionsDto } from './dto/get-confessions.dto';
import { SearchConfessionDto } from './dto/search-confession.dto';
import { Request } from 'express';

@Controller('confessions')
export class ConfessionController {
  constructor(private readonly service: ConfessionService) {}

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

  /**
   * GET /confessions/trending
   * Moved above :id to avoid route collision
   */
  @Get('trending')
  getTrending() {
    return this.service.getTrendingConfessions();
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    return this.service.getConfessionByIdWithViewCount(id, req);
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

  // Compatibility helper
  getConfessionById(id: string, req: Request) {
    return this.getById(id, req);
  }
}