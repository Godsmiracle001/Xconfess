import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { EmailModule } from '../email/email.module';
import { AnonymousUser } from './entities/anonymous-user.entity';
import { AnonymousUserService } from './anonymous-user.service';
import { UserAnonymousUser } from './entities/user-anonymous-link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AnonymousUser, UserAnonymousUser]),
    forwardRef(() => EmailModule),
  ],
  providers: [UserService, AnonymousUserService],
  controllers: [UserController],
  exports: [UserService, AnonymousUserService],
})
export class UserModule {}
