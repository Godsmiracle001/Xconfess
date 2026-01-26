import { Injectable, ForbiddenException, NotFoundException,BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto, ReplyMessageDto } from './dto/message.dto';
import { User } from '../user/entities/user.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';

interface SenderContext {
  userId?: number | string;
  id?: number | string;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(AnonymousConfession)
    private readonly confessionRepository: Repository<AnonymousConfession>,
  ) {}

  async create(createMessageDto: CreateMessageDto, sender: SenderContext): Promise<Message> {
    const confession = await this.confessionRepository.findOne({ where: { id: createMessageDto.confession_id } });
    if (!confession) throw new NotFoundException('Confession not found');

    const senderIdRaw = sender?.userId ?? sender?.id;
    const senderId = typeof senderIdRaw === 'string' ? parseInt(senderIdRaw, 10) : senderIdRaw;
    if (!senderId || Number.isNaN(senderId)) {
      throw new BadRequestException('Invalid sender id');
    }
    const senderUser = senderId
      ? await this.confessionRepository.manager.findOne(User, { where: { id: senderId } })
      : null;
    if (!senderUser) throw new NotFoundException('User not found');

    const message = this.messageRepository.create({
      sender: senderUser,
      confession,
      content: createMessageDto.content,
    });
    return this.messageRepository.save(message);
  }

  async findForConfessionAuthor(confessionId: string, user: User): Promise<Message[]> {
    // Validate confessionId format
    if (!confessionId || confessionId.trim() === '') {
      throw new BadRequestException('Invalid confession ID');
    }
    const confession = await this.confessionRepository.findOne({ where: { id: confessionId } });
    if (!confession) throw new NotFoundException('Confession not found');
     // Consider adding pagination for large message lists
    return this.messageRepository.find({ 
      where: { confession: { id: confessionId } }, 
      order: { createdAt: 'DESC' },
      take: 100 // Limit to prevent performance issues
    });
  }

  async reply(dto: ReplyMessageDto, user: User): Promise<Message> {
    // Validate reply content
    if (!dto.reply || dto.reply.trim() === '') {
      throw new BadRequestException('Reply content cannot be empty');
    }
    const message = await this.messageRepository.findOne({ where: { id: dto.message_id }, relations: ['confession', 'confession.anonymousUser'] });
    if (!message) throw new NotFoundException('Message not found');
    if (message.hasReply) throw new ForbiddenException('Already replied');
   
    // Use a transaction to ensure atomicity
    return this.messageRepository.manager.transaction(async manager => {
      message.hasReply = true;
      message.replyContent = dto.reply.trim();
      message.repliedAt = new Date();
      return manager.save(message);
    });
  }
}
