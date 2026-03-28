import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchDiscoveryService } from './search-discovery.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Search Discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('confessions/search/discovery')
export class SearchDiscoveryController {
  constructor(private readonly service: SearchDiscoveryService) {}

  @Post('presets')
  @ApiOperation({ summary: 'Save a search preset' })
  savePreset(@Req() req: any, @Body() dto: CreateSavedSearchDto) {
    return this.service.savePreset(req.user.id, dto);
  }

  @Get('presets')
  @ApiOperation({ summary: 'List saved search presets' })
  listPresets(@Req() req: any) {
    return this.service.listPresets(req.user.id);
  }

  @Delete('presets/:id')
  @ApiOperation({ summary: 'Delete a search preset' })
  deletePreset(@Req() req: any, @Param('id') id: string) {
    return this.service.deletePreset(req.user.id, id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get recent search history' })
  getHistory(@Req() req: any) {
    return this.service.getRecentSearches(req.user.id);
  }
}
