import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { PasswordResetService } from './password-reset.service';
import { UserModule } from '../user/user.module';
import { EmailModule } from '../email/email.module';
import { PasswordReset } from './entities/password-reset.entity';

@Module({
  imports: [
    forwardRef(() => UserModule),
    EmailModule,
    PassportModule,
    TypeOrmModule.forFeature([PasswordReset]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordResetService, WsJwtGuard],
  exports: [AuthService, WsJwtGuard],
})
export class AuthModule {}