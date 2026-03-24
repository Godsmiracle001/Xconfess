import {
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
  Body,
  Get,
  Query,
  Param,
  Put,
  Delete,
  Req,
  Patch,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AnchorConfessionDto } from '../stellar/dto/anchor-confession.dto';
import { ConfessionService } from './confession.service';
import { CreateConfessionDto } from './dto/create-confession.dto';
import { GetConfessionsByTagDto } from './dto/get-confessions-by-tag.dto';
import { GetConfessionsDto } from './dto/get-confessions.dto';
import { SearchConfessionDto } from './dto/search-confession.dto';
import { UpdateConfessionDto } from './dto/update-confession.dto';

@ApiTags('Confessions')
@Controller('confessions')
export class ConfessionController {
  // For testing compatibility: expose getConfessionById
  getConfessionById(id: string, req: Request) {
    return this.getById(id, req);
  }

  constructor(private readonly service: ConfessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new anonymous confession' })
  @ApiResponse({ status: 201, description: 'Confession created successfully' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateConfessionDto) {
    // Only allow canonical contract
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated confessions list' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(@Query() dto: GetConfessionsDto) {
    return this.service.getConfessions(dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search confessions (hybrid)' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@Query() dto: SearchConfessionDto) {
    return this.service.search(dto);
  }

  @Get('search/fulltext')
  @ApiOperation({ summary: 'Full-text search confessions' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  fullTextSearch(@Query() dto: SearchConfessionDto) {
    return this.service.fullTextSearch(dto);
  }

  @Get('trending/top')
  @ApiOperation({ summary: 'Get trending confessions' })
  getTrending() {
    return this.service.getTrendingConfessions();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all available tags' })
  getAllTags() {
    return this.service.getAllTags();
  }

  @Get('tags/:tag')
  @ApiOperation({ summary: 'Get confessions filtered by tag' })
  @ApiParam({ name: 'tag', description: 'Tag name to filter by' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  getByTag(@Param('tag') tag: string, @Query() dto: GetConfessionsByTagDto) {
    return this.service.getConfessionsByTag(tag, dto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'List soft-deleted confessions (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getDeleted(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.getDeletedConfessions(page, limit);
  }

  /**
   * IMPORTANT:
   * Place nested param routes BEFORE :id
   */
  @Get(':id/stellar/verify')
  @ApiOperation({ summary: 'Verify Stellar anchoring for a confession' })
  @ApiParam({ name: 'id', description: 'Confession UUID' })
  verifyStellarAnchor(@Param('id') id: string) {
    return this.service.verifyStellarAnchor(id);
  }

  @Post(':id/anchor')
  @ApiOperation({ summary: 'Anchor a confession on Stellar blockchain' })
  @ApiParam({ name: 'id', description: 'Confession UUID' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  anchorConfession(@Param('id') id: string, @Body() dto: AnchorConfessionDto) {
    return this.service.anchorConfession(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing confession' })
  @ApiParam({ name: 'id', description: 'Confession UUID' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() dto: UpdateConfessionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a confession' })
  @ApiParam({ name: 'id', description: 'Confession UUID' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted confession (admin)' })
  @ApiParam({ name: 'id', description: 'Confession UUID' })
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }

  /**
   * ALWAYS keep generic :id LAST
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single confession by ID (increments view count)',
  })
  @ApiParam({ name: 'id', description: 'Confession UUID' })
  getById(@Param('id') id: string, @Req() req: Request) {
    return this.service.getConfessionByIdWithViewCount(id, req);
  }
}
