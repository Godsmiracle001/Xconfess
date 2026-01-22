import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { EmailModule } from '../email/email.module';
import { AnonymousUser } from './entities/anonymous-user.entity';
import { AnonymousUserService } from './anonymous-user.service';
import { ProfileStatsService } from './profile-stats.service';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { Reaction } from '../reaction/entities/reaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AnonymousUser, AnonymousConfession, Reaction]),
    forwardRef(() => EmailModule),
  ],
  providers: [UserService, AnonymousUserService, ProfileStatsService],
  controllers: [UserController],
  exports: [UserService, AnonymousUserService, ProfileStatsService],
})
export class UserModule {}
