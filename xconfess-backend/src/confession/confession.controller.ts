import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus } from '@nestjs/common';
import { ConfessionService } from './confession.service';
import { CreateConfessionDto } from './dto/create-confession.dto';
import { UpdateConfessionDto } from './dto/update-confession.dto';
import { SearchConfessionDto } from './dto/search-confession.dto';
import { GetConfessionsDto } from './dto/get-confessions.dto';
import { GetTrendingConfessionsDto } from './dto/get-trending-confessions.dto';

@Controller('confessions')
export class ConfessionController {
  constructor(private readonly confessionService: ConfessionService) {}

  @Post()
  create(@Body() createConfessionDto: CreateConfessionDto) {
    return this.confessionService.create(createConfessionDto);
  }

  @Get()
  getConfessions(@Query() getConfessionsDto: GetConfessionsDto) {
    return this.confessionService.getConfessions(getConfessionsDto);
  }

  @Get('trending')
  getTrendingConfessions(@Query() getTrendingConfessionsDto: GetTrendingConfessionsDto) {
    return this.confessionService.getTrendingConfessions(getTrendingConfessionsDto);
  }

  @Get('search')
  search(@Query() searchDto: SearchConfessionDto) {
    return this.confessionService.search(searchDto);
  }

  @Get('search/fulltext')
  fullTextSearch(@Query() searchDto: SearchConfessionDto) {
    return this.confessionService.fullTextSearch(searchDto);
  }
  
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConfessionDto: UpdateConfessionDto) {
    return this.confessionService.update(id, updateConfessionDto);
  }
  
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.confessionService.remove(id);
  }
}
