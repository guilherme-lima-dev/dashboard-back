import { PartialType } from '@nestjs/swagger';
import { CreateOfferPlatformMappingDto } from './create-offer-platform-mapping.dto';

export class UpdateOfferPlatformMappingDto extends PartialType(CreateOfferPlatformMappingDto) {}
