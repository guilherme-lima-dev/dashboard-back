import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDto> {
    // Verificar se slug já existe
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug: createProductDto.slug },
    });

    if (existingProduct) {
      throw new ConflictException('Produto com este slug já existe');
    }

    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    return product as ProductDto;
  }

  async findAll(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return products as ProductDto[];
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product as ProductDto;
  }

  async findBySlug(slug: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product as ProductDto;
  }

  async findByType(productType: string): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: { productType },
      orderBy: { createdAt: 'desc' },
    });

    return products as ProductDto[];
  }

  async findActive(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return products as ProductDto[];
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductDto> {
    // Verificar se produto existe
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Se está alterando o slug, verificar se não existe outro com o mesmo slug
    if (updateProductDto.slug && updateProductDto.slug !== existingProduct.slug) {
      const slugExists = await this.prisma.product.findUnique({
        where: { slug: updateProductDto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Produto com este slug já existe');
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });

    return product as ProductDto;
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    await this.prisma.product.delete({
      where: { id },
    });
  }
}
