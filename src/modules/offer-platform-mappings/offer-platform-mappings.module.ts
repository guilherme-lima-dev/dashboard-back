import { Module } from '@nestjs/common';
import { OfferPlatformMappingsService } from './offer-platform-mappings.service';
import { OfferPlatformMappingsController } from './offer-platform-mappings.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OfferPlatformMappingsController],
  providers: [OfferPlatformMappingsService],
  exports: [OfferPlatformMappingsService],
})
export class OfferPlatformMappingsModule {}
