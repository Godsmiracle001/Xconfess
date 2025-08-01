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
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<UserResponse> {
    try {
      // Check if user with this email already exists
      const existingUser = await this.userService.findByEmail(
        registerDto.email,
      );
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create the new user
      const user = await this.userService.create(
        registerDto.email,
        registerDto.password,
        registerDto.username,
      );
      // Decrypt email for response
      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...result } = user;
      const email = CryptoUtil.decrypt(user.emailEncrypted, user.emailIv, user.emailTag);
      return { ...result, email };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // Handle generic errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Failed to register user: ' + errorMessage);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ access_token: string; user: UserResponse }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await this.authService.login(loginDto.email, loginDto.password);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Handle generic errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Failed to login: ' + errorMessage);
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: User): Promise<UserResponse> {
    try {
      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...result } = user;
      const email = CryptoUtil.decrypt(user.emailEncrypted, user.emailIv, user.emailTag);
      return { ...result, email };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Failed to get profile: ' + errorMessage);
    }
  }

  @Post('deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivateAccount(@GetUser() user: User): Promise<UserResponse> {
    try {
      const updatedUser = await this.userService.deactivateAccount(user.id);
      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...result } = updatedUser;
      const email = CryptoUtil.decrypt(updatedUser.emailEncrypted, updatedUser.emailIv, updatedUser.emailTag);
      return { ...result, email };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Failed to deactivate account: ' + errorMessage);
    }
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  async reactivateAccount(@GetUser() user: User): Promise<UserResponse> {
    try {
      const updatedUser = await this.userService.reactivateAccount(user.id);
      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...result } = updatedUser;
      const email = CryptoUtil.decrypt(updatedUser.emailEncrypted, updatedUser.emailIv, updatedUser.emailTag);
      return { ...result, email };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Failed to reactivate account: ' + errorMessage);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Request() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    const updatedUser = await this.userService.updateProfile(req.user.id, updateUserProfileDto);
    const { password, emailEncrypted, emailIv, emailTag, emailHash, ...result } = updatedUser;
    const email = CryptoUtil.decrypt(updatedUser.emailEncrypted, updatedUser.emailIv, updatedUser.emailTag);
    return { ...result, email };
  }

}
