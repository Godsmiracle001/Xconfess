import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Get,
  UseGuards,
  Put,
  Request,
  Patch,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { User, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateUserProfileDto } from './dto/updateProfile.dto';
import { CryptoUtil } from '../common/crypto.util';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import {
  UpdatePrivacySettingsDto,
  PrivacySettingsResponseDto,
} from './dto/update-privacy-settings.dto';

// Add decrypted email and privacy metadata to the response type for API output
export interface UserResponse {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  email: string;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  notificationPreferences: Record<string, boolean>;
  privacy: {
    isDiscoverable: boolean;
    canReceiveReplies: boolean;
    showReactions: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  // Helper method to keep DRY (Don't Repeat Yourself)
  private formatUserResponse(user: User): UserResponse {
    const email = CryptoUtil.decrypt(
      user.emailEncrypted,
      user.emailIv,
      user.emailTag,
    );
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      email,
      resetPasswordToken: user.resetPasswordToken,
      resetPasswordExpires: user.resetPasswordExpires,
      notificationPreferences: user.notificationPreferences || {},
      privacy: {
        isDiscoverable: user.isDiscoverable(),
        canReceiveReplies: user.canReceiveReplies(),
        showReactions: user.shouldShowReactions(),
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ user: UserResponse }> {
    const existingEmail = await this.userService.findByEmail(registerDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingUsername = await this.userService.findByUsername(
      registerDto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already in use');
    }

    const user = await this.userService.create(
      registerDto.email,
      registerDto.password,
      registerDto.username,
    );

    return { user: this.formatUserResponse(user) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{
    access_token: string;
    user: UserResponse;
    anonymousUserId: string;
  }> {
    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
      );
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Login failed: ' + message);
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser('id') userId: number): Promise<UserResponse> {
    try {
      const user = await this.userService.findById(userId); // Use canonical ID
      if (!user) throw new UnauthorizedException();
      return this.formatUserResponse(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Failed to get profile: ' + message);
    }
  }

  @Post('deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivateAccount(
    @GetUser('id') userId: number,
  ): Promise<UserResponse> {
    const updatedUser = await this.userService.deactivateAccount(userId);
    return this.formatUserResponse(updatedUser);
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  async reactivateAccount(
    @GetUser('id') userId: number,
  ): Promise<UserResponse> {
    const updatedUser = await this.userService.reactivateAccount(userId);
    return this.formatUserResponse(updatedUser);
  }

  @Get('notification-preferences')
  async getNotificationPreferences(@Req() req) {
    return req.user.notificationPreferences || {};
  }

  @Patch('notification-preferences')
  async updateNotificationPreferences(
    @Req() req,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const user = await this.userService.findById(req.user.id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.notificationPreferences = {
      ...(user.notificationPreferences || {}),
      ...dto,
    };

    const savedUser = await this.userService.saveUser(user);

    return savedUser.notificationPreferences;
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @GetUser('id') userId: number, // Replaced @Request() req
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserResponse> {
    const updatedUser = await this.userService.updateProfile(
      userId,
      updateUserProfileDto,
    );
    return this.formatUserResponse(updatedUser);
  }

  @Get('privacy-settings')
  @UseGuards(JwtAuthGuard)
  async getPrivacySettings(
    @GetUser('id') userId: number,
  ): Promise<PrivacySettingsResponseDto> {
    return this.userService.getPrivacySettings(userId);
  }

  @Patch('privacy-settings')
  @UseGuards(JwtAuthGuard)
  async updatePrivacySettings(
    @GetUser('id') userId: number,
    @Body() dto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettingsResponseDto> {
    return this.userService.updatePrivacySettings(userId, dto);
  }
}
