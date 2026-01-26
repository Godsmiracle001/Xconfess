import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('App') 
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Throttle(10, 60) 
  @ApiOperation({ summary: 'Get the welcome message for the API' })
  @ApiResponse({
    status: 200,
    description: 'Returns a greeting message',
    schema: { example: 'Hello, world!' },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
