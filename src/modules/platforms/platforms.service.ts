import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { PlatformDto } from './dto/platform.dto';

@Injectable()
export class PlatformsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPlatformDto: CreatePlatformDto): Promise<PlatformDto> {
    // Verificar se slug já existe
    const existingPlatform = await this.prisma.platform.findUnique({
      where: { slug: createPlatformDto.slug },
    });

    if (existingPlatform) {
      throw new ConflictException('Plataforma com este slug já existe');
    }

    const platform = await this.prisma.platform.create({
      data: createPlatformDto,
    });

    return platform as PlatformDto;
  }

  async findAll(): Promise<PlatformDto[]> {
    const platforms = await this.prisma.platform.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return platforms as PlatformDto[];
  }

  async findOne(id: string): Promise<PlatformDto> {
    const platform = await this.prisma.platform.findUnique({
      where: { id },
    });

    if (!platform) {
      throw new NotFoundException('Plataforma não encontrada');
    }

    return platform as PlatformDto;
  }

  async findBySlug(slug: string): Promise<PlatformDto> {
    const platform = await this.prisma.platform.findUnique({
      where: { slug },
    });

    if (!platform) {
      throw new NotFoundException('Plataforma não encontrada');
    }

    return platform as PlatformDto;
  }

  async update(id: string, updatePlatformDto: UpdatePlatformDto): Promise<PlatformDto> {
    // Verificar se plataforma existe
    const existingPlatform = await this.prisma.platform.findUnique({
      where: { id },
    });

    if (!existingPlatform) {
      throw new NotFoundException('Plataforma não encontrada');
    }

    // Se está alterando o slug, verificar se não existe outro com o mesmo slug
    if (updatePlatformDto.slug && updatePlatformDto.slug !== existingPlatform.slug) {
      const slugExists = await this.prisma.platform.findUnique({
        where: { slug: updatePlatformDto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Plataforma com este slug já existe');
      }
    }

    const platform = await this.prisma.platform.update({
      where: { id },
      data: updatePlatformDto,
    });

    return platform as PlatformDto;
  }

  async remove(id: string): Promise<void> {
    const platform = await this.prisma.platform.findUnique({
      where: { id },
    });

    if (!platform) {
      throw new NotFoundException('Plataforma não encontrada');
    }

    await this.prisma.platform.delete({
      where: { id },
    });
  }
}
