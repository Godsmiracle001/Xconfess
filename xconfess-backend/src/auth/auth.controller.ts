import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from '../user/dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { User } from '../user/entities/user.entity';
import { CryptoUtil } from '../common/crypto.util';

@ApiTags('Authentication')
@Controller('auth')

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ access_token: string; user: any }> {
    try {
      const result = await this.authService.login(loginDto.email, loginDto.password);
      
      if (!result) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Login failed: ' + errorMessage);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser('id') userId: number): Promise<any> {
    try {
      const user = await this.authService.validateUserById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user; // Already formatted by validateUserById
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Failed to get profile: ' + errorMessage);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<{ message: string }> {
    // In a stateless JWT setup, logout is mainly client-side
    // but we can add token blacklisting here if needed
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    try {
      const ipAddress = request.ip || 
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
      return { message: 'If the user exists, a password reset email has been sent.' };
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
      throw new BadRequestException('Failed to reset password: ' + errorMessage);
    }
  }
} 