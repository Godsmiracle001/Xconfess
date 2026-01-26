import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    try {
      const ipAddress =
        request.ip ||
        (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        request.connection.remoteAddress;
      const userAgent = request.headers['user-agent'];

      return await this.authService.forgotPassword(
        forgotPasswordDto,
        ipAddress,
        userAgent,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Handle generic errors gracefully - don't expose internal details
      return {
        message: 'If the user exists, a password reset email has been sent.',
      };
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      return await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Handle generic errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        'Failed to reset password: ' + errorMessage,
      );
    }
  }
}
