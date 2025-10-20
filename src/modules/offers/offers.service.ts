import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OfferDto } from './dto/offer.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOfferDto: CreateOfferDto): Promise<OfferDto> {
    // Verificar se produto existe
    const product = await this.prisma.product.findUnique({
      where: { id: createOfferDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Verificar se slug já existe para este produto
    const existingOffer = await this.prisma.offer.findFirst({
      where: { 
        productId: createOfferDto.productId,
        slug: createOfferDto.slug 
      },
    });

    if (existingOffer) {
      throw new ConflictException('Oferta com este slug já existe para este produto');
    }

    const offer = await this.prisma.offer.create({
      data: createOfferDto,
    });

    return offer as OfferDto;
  }

  async findAll(): Promise<OfferDto[]> {
    const offers = await this.prisma.offer.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return offers as OfferDto[];
  }

  async findByProduct(productId: string): Promise<OfferDto[]> {
    const offers = await this.prisma.offer.findMany({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return offers as OfferDto[];
  }

  async findOne(id: string): Promise<OfferDto> {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    return offer as OfferDto;
  }

  async findBySlug(slug: string): Promise<OfferDto> {
    const offer = await this.prisma.offer.findFirst({
      where: { slug },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    return offer as OfferDto;
  }

  async findByBillingType(billingType: string): Promise<OfferDto[]> {
    const offers = await this.prisma.offer.findMany({
      where: { billingType },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return offers as OfferDto[];
  }

  async findActive(): Promise<OfferDto[]> {
    const offers = await this.prisma.offer.findMany({
      where: { isActive: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return offers as OfferDto[];
  }

  async update(id: string, updateOfferDto: UpdateOfferDto): Promise<OfferDto> {
    // Verificar se oferta existe
    const existingOffer = await this.prisma.offer.findUnique({
      where: { id },
    });

    if (!existingOffer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    // Se está alterando o produto, verificar se existe
    if (updateOfferDto.productId && updateOfferDto.productId !== existingOffer.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: updateOfferDto.productId },
      });

      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }
    }

    // Se está alterando o slug, verificar se não existe outro com o mesmo slug para o produto
    if (updateOfferDto.slug && updateOfferDto.slug !== existingOffer.slug) {
      const productId = updateOfferDto.productId || existingOffer.productId;
      const slugExists = await this.prisma.offer.findFirst({
        where: { 
          productId,
          slug: updateOfferDto.slug,
          id: { not: id }
        },
      });

      if (slugExists) {
        throw new ConflictException('Oferta com este slug já existe para este produto');
      }
    }

    const offer = await this.prisma.offer.update({
      where: { id },
      data: updateOfferDto,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return offer as OfferDto;
  }

  async remove(id: string): Promise<void> {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
    });

    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    await this.prisma.offer.delete({
      where: { id },
    });
  }
}
