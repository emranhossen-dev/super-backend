import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  private productsCache: any = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds microsecond RAM cache

  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string, search?: string) {
    const isDefaultQuery = (!category || category === 'All') && (!search || search.trim() === '');
    const now = Date.now();

    // 1ms RAM Response if cache is valid
    if (isDefaultQuery && this.productsCache && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.productsCache;
    }

    const where: any = {};

    if (category && category !== 'All') {
      where.category = { equals: category };
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const results = await this.prisma.products.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        brand: true,
        urlSlug: true,
        sku: true,
        category: true,
        buyingPrice: true,
        price: true,
        comparePrice: true,
        stock: true,
        status: true,
        image: true,
        shortDescription: true,
        description: true,
        createdAt: true,
      },
    });

    if (isDefaultQuery) {
      this.productsCache = results;
      this.cacheTimestamp = now;
    }

    return results;
  }

  async findOneBySlugOrId(identifier: string) {
    const product = await this.prisma.products.findFirst({
      where: {
        OR: [{ id: identifier }, { urlSlug: identifier }],
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with identifier '${identifier}' not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const id = `prod-${Date.now()}`;
    const slug = dto.urlSlug || dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const sku = dto.sku || `SKU-${Date.now().toString().slice(-6)}`;

    const existingSlug = await this.prisma.products.findUnique({ where: { urlSlug: slug } });
    if (existingSlug) {
      throw new ConflictException(`Product URL Slug '${slug}' already exists`);
    }

    const created = await this.prisma.products.create({
      data: {
        id,
        title: dto.title,
        brand: dto.brand || null,
        urlSlug: slug,
        sku: sku,
        category: dto.category,
        buyingPrice: dto.buyingPrice ?? 0,
        price: dto.price,
        comparePrice: dto.comparePrice || null,
        stock: dto.stock ?? 10,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
        status: dto.status || 'in_stock',
        image: dto.image,
        shortDescription: dto.shortDescription || null,
        description: dto.description,
        color: dto.color || null,
        material: dto.material || null,
        warranty: dto.warranty || null,
      },
    });

    // Invalidate cache immediately on new product creation
    this.productsCache = null;
    return created;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOneBySlugOrId(id);

    const updated = await this.prisma.products.update({
      where: { id },
      data: dto as any,
    });

    // Invalidate cache immediately on update
    this.productsCache = null;
    return updated;
  }

  async remove(id: string) {
    await this.findOneBySlugOrId(id);
    const deleted = await this.prisma.products.delete({
      where: { id },
    });

    // Invalidate cache immediately on delete
    this.productsCache = null;
    return deleted;
  }
}
