import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferPlatformMappingDto } from './dto/create-offer-platform-mapping.dto';
import { UpdateOfferPlatformMappingDto } from './dto/update-offer-platform-mapping.dto';
import { OfferPlatformMappingDto } from './dto/offer-platform-mapping.dto';

@Injectable()
export class OfferPlatformMappingsService {
  constructor(private prisma: PrismaService) {}

  async create(createOfferPlatformMappingDto: CreateOfferPlatformMappingDto): Promise<OfferPlatformMappingDto> {
    // Verificar se a oferta existe
    const offer = await this.prisma.offer.findUnique({
      where: { id: createOfferPlatformMappingDto.offerId },
    });

    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    // Verificar se a plataforma existe
    const platform = await this.prisma.platform.findUnique({
      where: { id: createOfferPlatformMappingDto.platformId },
    });

    if (!platform) {
      throw new NotFoundException('Plataforma não encontrada');
    }

    // Verificar se já existe um mapeamento para esta plataforma e externalProductId
    const existingMapping = await this.prisma.offerPlatformMapping.findFirst({
      where: {
        platformId: createOfferPlatformMappingDto.platformId,
        externalProductId: createOfferPlatformMappingDto.externalProductId,
      },
    });

    if (existingMapping) {
      throw new ConflictException('Já existe um mapeamento para esta plataforma e produto externo');
    }

    // Verificar se já existe um mapeamento para esta oferta e plataforma
    const existingOfferMapping = await this.prisma.offerPlatformMapping.findFirst({
      where: {
        offerId: createOfferPlatformMappingDto.offerId,
        platformId: createOfferPlatformMappingDto.platformId,
      },
    });

    if (existingOfferMapping) {
      throw new ConflictException('Já existe um mapeamento para esta oferta e plataforma');
    }

    const mapping = await this.prisma.offerPlatformMapping.create({
      data: createOfferPlatformMappingDto,
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
    });

    return mapping as OfferPlatformMappingDto;
  }

  async findAll(): Promise<OfferPlatformMappingDto[]> {
    const mappings = await this.prisma.offerPlatformMapping.findMany({
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return mappings as OfferPlatformMappingDto[];
  }

  async findOne(id: string): Promise<OfferPlatformMappingDto> {
    const mapping = await this.prisma.offerPlatformMapping.findUnique({
      where: { id },
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
    });

    if (!mapping) {
      throw new NotFoundException('Mapeamento não encontrado');
    }

    return mapping as OfferPlatformMappingDto;
  }

  async findByOffer(offerId: string): Promise<OfferPlatformMappingDto[]> {
    const mappings = await this.prisma.offerPlatformMapping.findMany({
      where: { offerId },
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return mappings as OfferPlatformMappingDto[];
  }

  async findByPlatform(platformId: string): Promise<OfferPlatformMappingDto[]> {
    const mappings = await this.prisma.offerPlatformMapping.findMany({
      where: { platformId },
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return mappings as OfferPlatformMappingDto[];
  }

  async findByExternalProduct(platformId: string, externalProductId: string): Promise<OfferPlatformMappingDto | null> {
    const mapping = await this.prisma.offerPlatformMapping.findFirst({
      where: {
        platformId,
        externalProductId,
      },
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
    });

    return mapping as OfferPlatformMappingDto | null;
  }

  async findActive(): Promise<OfferPlatformMappingDto[]> {
    const mappings = await this.prisma.offerPlatformMapping.findMany({
      where: { isActive: true },
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return mappings as OfferPlatformMappingDto[];
  }

  async update(id: string, updateOfferPlatformMappingDto: UpdateOfferPlatformMappingDto): Promise<OfferPlatformMappingDto> {
    // Verificar se o mapeamento existe
    const existingMapping = await this.prisma.offerPlatformMapping.findUnique({
      where: { id },
    });

    if (!existingMapping) {
      throw new NotFoundException('Mapeamento não encontrado');
    }

    // Se estiver atualizando a plataforma ou externalProductId, verificar conflitos
    if (updateOfferPlatformMappingDto.platformId || updateOfferPlatformMappingDto.externalProductId) {
      const platformId = updateOfferPlatformMappingDto.platformId || existingMapping.platformId;
      const externalProductId = updateOfferPlatformMappingDto.externalProductId || existingMapping.externalProductId;

      const conflictingMapping = await this.prisma.offerPlatformMapping.findFirst({
        where: {
          platformId,
          externalProductId,
          id: { not: id },
        },
      });

      if (conflictingMapping) {
        throw new ConflictException('Já existe um mapeamento para esta plataforma e produto externo');
      }
    }

    // Se estiver atualizando a oferta ou plataforma, verificar conflitos de oferta-plataforma
    if (updateOfferPlatformMappingDto.offerId || updateOfferPlatformMappingDto.platformId) {
      const offerId = updateOfferPlatformMappingDto.offerId || existingMapping.offerId;
      const platformId = updateOfferPlatformMappingDto.platformId || existingMapping.platformId;

      const conflictingOfferMapping = await this.prisma.offerPlatformMapping.findFirst({
        where: {
          offerId,
          platformId,
          id: { not: id },
        },
      });

      if (conflictingOfferMapping) {
        throw new ConflictException('Já existe um mapeamento para esta oferta e plataforma');
      }
    }

    const mapping = await this.prisma.offerPlatformMapping.update({
      where: { id },
      data: updateOfferPlatformMappingDto,
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
    });

    return mapping as OfferPlatformMappingDto;
  }

  async remove(id: string): Promise<void> {
    const mapping = await this.prisma.offerPlatformMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException('Mapeamento não encontrado');
    }

    await this.prisma.offerPlatformMapping.delete({
      where: { id },
    });
  }

  async toggleActive(id: string): Promise<OfferPlatformMappingDto> {
    const mapping = await this.prisma.offerPlatformMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException('Mapeamento não encontrado');
    }

    const updatedMapping = await this.prisma.offerPlatformMapping.update({
      where: { id },
      data: { isActive: !mapping.isActive },
      include: {
        offer: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
    });

    return updatedMapping as OfferPlatformMappingDto;
  }
}
