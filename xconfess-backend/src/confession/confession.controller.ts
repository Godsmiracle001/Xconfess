import { Controller, Post, UsePipes, ValidationPipe, Body, Get, Query, Param, Put, Delete, Req } from "@nestjs/common";
import type { Request } from "express";
import { AnchorConfessionDto } from "src/stellar/dto/anchor-confession.dto";
import { ConfessionService } from "./confession.service";
import { CreateConfessionDto } from "./dto/create-confession.dto";
import { GetConfessionsByTagDto } from "./dto/get-confessions-by-tag.dto";
import { GetConfessionsDto } from "./dto/get-confessions.dto";
import { SearchConfessionDto } from "./dto/search-confession.dto";
import { UpdateConfessionDto } from "./dto/update-confession.dto";

@Controller('confessions')
export class ConfessionController {
  // For testing compatibility: expose getConfessionById
  getConfessionById(id: string, req: Request) {
    return this.getById(id, req);
  }

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

  @Get('trending/top')
  getTrending() {
    return this.service.getTrendingConfessions();
  }

  @Get('tags')
  getAllTags() {
    return this.service.getAllTags();
  }

  @Get('tags/:tag')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  getByTag(@Param('tag') tag: string, @Query() dto: GetConfessionsByTagDto) {
    return this.service.getConfessionsByTag(tag, dto);
  }

  /**
   * IMPORTANT:
   * Place nested param routes BEFORE :id
   */
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

  /**
   * ALWAYS keep generic :id LAST
   */
  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    return this.service.getConfessionByIdWithViewCount(id, req);
  }
}