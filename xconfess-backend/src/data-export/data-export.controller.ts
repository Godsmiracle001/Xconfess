import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UnauthorizedException,
  BadRequestException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import * as crypto from 'crypto';
import { DataExportService } from './data-export.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('data-export')
export class DataExportController {
  constructor(
    private readonly exportService: DataExportService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('request')
  async requestExport(@Req() req: any) {
    return this.exportService.requestExport(String(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async history(@Req() req: any) {
    const userId = String(req.user.id);
    const latest = await this.exportService.getLatestExport(userId);
    const history = await this.exportService.getExportHistory(userId);

    return {
      latest,
      history,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/redownload')
  async redownload(@Param('id') id: string, @Req() req: any) {
    return this.exportService.getRedownloadLink(id, String(req.user.id));
  }

  @Get('download/:id')
  async download(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res() res: Response,
  ) {
    // 1. Check Expiration
    if (Date.now() > parseInt(expires)) {
      throw new UnauthorizedException('Download link has expired (24h limit).');
    }

    // 2. Verify Signature
    const secret = this.configService.get<string>('app.appSecret', '');
    const dataToVerify = `${id}:${userId}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret || 'APP_SECRET_NOT_SET')
      .update(dataToVerify)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid download signature.');
    }

    // 3. Fetch from Service (Only if signature is valid)
    const exportReq = await this.exportService.getExportFile(id, userId);

    if (!exportReq || !exportReq.fileData) {
      throw new BadRequestException('File not found or expired.');
    }

    // 4. Stream to User
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="xconfess-data-${userId}.zip"`,
      'Content-Length': exportReq.fileData.length,
    });

    res.send(exportReq.fileData);
  }
}
