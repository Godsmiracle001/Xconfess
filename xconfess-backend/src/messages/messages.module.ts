import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { User } from '../user/entities/user.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { NotificationModule } from '../notification/notification.module';
import { UserAnonymousUser } from '../user/entities/user-anonymous-link.entity';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';
import { UserModule } from '../user/user.module';
import { OutboxEvent } from '../common/entities/outbox-event.entity';
import { MessageRepository } from './repository/message.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      User,
      AnonymousConfession,
      UserAnonymousUser,
      AnonymousUser,
      OutboxEvent,
    ]),
    forwardRef(() => NotificationModule),
    UserModule,
  ],
  providers: [MessagesService, MessageRepository],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
