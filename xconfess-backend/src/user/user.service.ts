import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UpdateUserProfileDto } from './dto/updateProfile.dto';
import { EmailService } from '../email/email.service';
import { CryptoUtil } from '../common/crypto.util';
import { maskUserId } from '../utils/mask-user-id';
 


@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(forwardRef(() => EmailService))
    private emailService: EmailService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by email (hashed)`);
      const normalizedEmail = email.trim().toLowerCase();
      const emailHash = CryptoUtil.hash(normalizedEmail);
      const user = await this.userRepository.findOne({ where: { emailHash } });

      if (user) {
        this.logger.debug(`User found with ID: ${user.id}`);
      } else {
        this.logger.debug(`No user found with email: ${email}`);
      }

      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding user by email: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Error finding user: ${errorMessage}`,
      );
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by ID: ${id}`);
      const user = await this.userRepository.findOne({ where: { id } });

      if (user) {
        this.logger.debug(`User found with ID: ${user.id}`);
      } else {
        this.logger.debug(`No user found with ID: ${id}`);
      }

      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding user by ID: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Error finding user: ${errorMessage}`,
      );
    }
  }

  async findByResetToken(token: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by reset token`);
      const user = await this.userRepository.findOne({ 
        where: { 
          resetPasswordToken: token,
        },
      });

      if (user) {
        this.logger.debug(`User found with reset token, ID: ${user.id}`);
      } else {
        this.logger.debug(`No user found with reset token`);
      }

      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding user by reset token: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Error finding user by reset token: ${errorMessage}`,
      );
    }
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    try {
      this.logger.log(`Updating password for masked user ID: ${maskUserId(userId)}`);

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password and clear reset token fields
      await this.userRepository.update(userId, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });

      this.logger.log(`Password updated successfully for masked user ID: ${maskUserId(userId)}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      this.logger.error(`Failed to update password for masked user ID ${maskUserId(userId)}: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Failed to update password: ${errorMessage}`,
      );
    }
  }

  async setResetPasswordToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    try {
      this.logger.log(`Setting reset password token for masked user ID: ${maskUserId(userId)}`);

      await this.userRepository.update(userId, {
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt,
      });

      this.logger.log(`Reset password token set successfully for masked user ID: ${maskUserId(userId)}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      this.logger.error(`Failed to set reset token for masked user ID ${maskUserId(userId)}: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Failed to set reset token: ${errorMessage}`,
      );
    }
  }

  async create(
    email: string,
    password: string,
    username: string,
  ): Promise<User> {
    try {
      this.logger.log(`Creating new user with email: [PROTECTED]`);

      const normalizedEmail = email.trim().toLowerCase();

      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // Encrypt and hash email
      const { encrypted, iv, tag } = CryptoUtil.encrypt(normalizedEmail);
      const emailHash = CryptoUtil.hash(normalizedEmail);

      // Create user entity
      const user = this.userRepository.create({
        emailEncrypted: encrypted,
        emailIv: iv,
        emailTag: tag,
        emailHash,
        password: hashedPassword,
        username,
      });

      // Save user to database
      const savedUser = await this.userRepository.save(user);
      this.logger.log(`User created successfully with masked user ID: ${maskUserId(savedUser.id)}`);

      // Send welcome email (fire and forget)
      try {
        const decryptedEmail = normalizedEmail; // already have it
        await this.emailService.sendWelcomeEmail(decryptedEmail, savedUser.username);
        this.logger.log(`Welcome email sent to [PROTECTED]`);
      } catch (emailError) {
        // Log but don't fail the user registration if email sending fails
        this.logger.error(
          `Failed to send welcome email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`,
          emailError instanceof Error ? emailError.stack : ''
        );
      }

      return savedUser;
    } catch (error) {
      // Handle error safely
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      this.logger.error(`Failed to create user: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Failed to create user: ${errorMessage}`,
      );
    }
  }


  async updateProfile(userId: number, updateDto: UpdateUserProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, updateDto);
    return this.userRepository.save(user);
  }

  async deactivateAccount(userId: number): Promise<User> {
    try {
      this.logger.log(`Deactivating account for masked user ID: ${maskUserId(userId)}`);
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.is_active = false;
      const updatedUser = await this.userRepository.save(user);
      
      this.logger.log(`Account deactivated successfully for masked user ID: ${maskUserId(userId)}`);
      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to deactivate account: ${errorMessage}`);
      throw error instanceof NotFoundException ? error : new InternalServerErrorException(`Failed to deactivate account: ${errorMessage}`);
    }
  }

  async reactivateAccount(userId: number): Promise<User> {
    try {
      this.logger.log(`Reactivating account for masked user ID: ${maskUserId(userId)}`);
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.is_active = true;
      const updatedUser = await this.userRepository.save(user);
      
      this.logger.log(`Account reactivated successfully for masked user ID: ${maskUserId(userId)}`);
      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reactivate account: ${errorMessage}`);
      throw error instanceof NotFoundException ? error : new InternalServerErrorException(`Failed to reactivate account: ${errorMessage}`);
    }
  }

  async setUserRole(userId: number, role: UserRole): Promise<User> {
    try {
      this.logger.log(`Setting role to ${role} for masked user ID: ${maskUserId(userId)}`);
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.role = role;
      const updatedUser = await this.userRepository.save(user);
      
      this.logger.log(`Role set to ${role} successfully for masked user ID: ${maskUserId(userId)}`);
      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set user role: ${errorMessage}`);
      throw error instanceof NotFoundException ? error : new InternalServerErrorException(`Failed to set user role: ${errorMessage}`);
    }
  }

  async saveUser(user: User): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save user: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to save user: ${errorMessage}`);
    }
  }
}
