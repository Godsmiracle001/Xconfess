import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as crypto from 'crypto';
import { DataExportService } from './data-export.service';

@Controller('data-export')
export class DataExportController {
  constructor(private readonly exportService: DataExportService) {}

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
    const secret = process.env.APP_SECRET;
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
