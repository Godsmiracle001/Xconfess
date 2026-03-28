import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TippingController } from './tipping.controller';
import { TippingService } from './tipping.service';
import { Tip } from './entities/tip.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip, AnonymousConfession]),
    StellarModule,
  ],
  controllers: [TippingController],
  providers: [TippingService],
  exports: [TippingService],
})
export class TippingModule {}
