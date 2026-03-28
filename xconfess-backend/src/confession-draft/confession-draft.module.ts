import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfessionDraft } from './entities/confession-draft.entity';
import { ConfessionDraftService } from './confession-draft.service';
import { ConfessionDraftController } from './confession-draft.controller';
import { ConfessionModule } from '../confession/confession.module';
import { ConfessionDraftQueue } from './confession-draft.queue';

@Module({
  imports: [TypeOrmModule.forFeature([ConfessionDraft]), ConfessionModule],
  controllers: [ConfessionDraftController],
  providers: [ConfessionDraftService, ConfessionDraftQueue],
  exports: [ConfessionDraftService],
})
export class ConfessionDraftModule {}
