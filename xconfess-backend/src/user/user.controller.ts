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
  Request
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateUserProfileDto } from './dto/updateProfile.dto';
import { CryptoUtil } from '../common/crypto.util';

// Add decrypted email to the response type for API output
export type UserResponse = Omit<User, 'password' | 'emailEncrypted' | 'emailIv' | 'emailTag' | 'emailHash'> & { email: string };

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) { }

  // Helper method to keep DRY (Don't Repeat Yourself)
  private formatUserResponse(user: User): UserResponse {
    const { password, emailEncrypted, emailIv, emailTag, emailHash, ...result } = user;
    const email = CryptoUtil.decrypt(emailEncrypted, emailIv, emailTag);
    return { ...result, email } as unknown as UserResponse;
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
  async deactivateAccount(@GetUser('id') userId: number): Promise<UserResponse> {
    const updatedUser = await this.userService.deactivateAccount(userId);
    return this.formatUserResponse(updatedUser);
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  async reactivateAccount(@GetUser('id') userId: number): Promise<UserResponse> {
    const updatedUser = await this.userService.reactivateAccount(userId);
    return this.formatUserResponse(updatedUser);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @GetUser('id') userId: number, // Replaced @Request() req
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserResponse> {
    const updatedUser = await this.userService.updateProfile(userId, updateUserProfileDto);
    return this.formatUserResponse(updatedUser);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{ access_token: string; user: any; anonymousUserId: string }> {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<{ access_token: string; user: any; anonymousUserId: string }> {
    await this.userService.create(
      registerDto.email,
      registerDto.password,
      registerDto.username,
    );
    // Automatically login after registration
    return this.authService.login(registerDto.email, registerDto.password);
  }
}
