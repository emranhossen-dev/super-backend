import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string, search?: string) {
    const where: any = {};

    if (category && category !== 'All') {
      where.category = { equals: category };
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.products.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneBySlugOrId(identifier: string) {
    const product = await this.prisma.products.findFirst({
      where: {
        OR: [
          { id: identifier },
          { urlSlug: identifier },
        ],
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with identifier '${identifier}' not found`);
    }

    return product;
  }

  generateSkuFromTitle(titleText: string, category?: string): string {
    const stopWords = new Set([
      'THE', 'AND', 'FOR', 'WITH', 'NEW', 'HOT', 'BEST', 'PRO', 'PLUS',
      'ER', 'O', 'EBONG', 'JONNO', 'NIYE', 'SHUNDOR', 'ORIGINAL'
    ]);

    const cleanTitle = (titleText || '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .trim();

    const words = cleanTitle.split(/\s+/).filter((w) => w.length > 0 && !stopWords.has(w));

    let part1 = '';
    let part2 = '';

    if (words.length >= 2) {
      part1 = words[0].slice(0, 3).padEnd(3, 'X');
      part2 = words[1].slice(0, 3).padEnd(3, 'Y');
    } else if (words.length === 1) {
      part1 = words[0].slice(0, 3).padEnd(3, 'X');
      part2 = (words[0].slice(3, 6) || (category || 'PRD').slice(0, 3)).padEnd(3, 'Y');
    } else {
      const cleanCat = (category || 'PRD')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
      part1 = cleanCat.slice(0, 3).padEnd(3, 'P');
      part2 = 'ITM';
    }

    part1 = part1.slice(0, 3).toUpperCase();
    part2 = part2.slice(0, 3).toUpperCase();

    const randomDigits = Math.floor(100 + Math.random() * 900); // 3 digits (100-999)
    return `${part1}-${part2}-${randomDigits}`.slice(0, 11);
  }

  async checkSkuAvailability(sku: string, excludeId?: string) {
    if (!sku || !sku.trim()) {
      return { available: false, sku: '', message: 'SKU code is required' };
    }

    const cleanSku = sku.trim().toUpperCase();
    if (cleanSku.length > 11) {
      return { available: false, sku: cleanSku, message: 'SKU must be maximum 11 characters' };
    }

    const existing = await this.prisma.products.findFirst({
      where: {
        sku: cleanSku,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return {
      available: !existing,
      sku: cleanSku,
      message: existing ? 'SKU code is already in use by another product' : 'SKU code is available',
    };
  }

  async create(dto: CreateProductDto) {
    const id = `prod-${Date.now()}`;
    const productTitle = dto.title || dto.name || 'Untitled Product';

    // Safe Slug Generation supporting both English and Bengali / Unicode Titles
    let rawSlug = dto.urlSlug || '';
    if (!rawSlug.trim()) {
      const asciiSlug = productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (asciiSlug.length >= 2) {
        rawSlug = asciiSlug;
      } else {
        rawSlug = `product-${Date.now().toString(36)}`;
      }
    }

    // Ensure Slug Uniqueness
    let slug = rawSlug;
    let counter = 1;
    while (await this.prisma.products.findUnique({ where: { urlSlug: slug } })) {
      slug = `${rawSlug}-${counter}`;
      counter++;
    }

    // Ensure SKU Uniqueness & Max 11 Characters Limit
    let rawSku = (dto.sku || '').trim().toUpperCase();
    if (!rawSku || rawSku.length > 11) {
      rawSku = this.generateSkuFromTitle(productTitle, dto.category);
    }

    let sku = rawSku.slice(0, 11);
    let skuCounter = 1;
    while (await this.prisma.products.findFirst({ where: { sku: sku } })) {
      const suffix = `${skuCounter}`;
      const base = rawSku.slice(0, Math.max(1, 11 - suffix.length));
      sku = `${base}${suffix}`.slice(0, 11);
      skuCounter++;
    }

    const category = dto.category || 'Electronics';
    const price = Number(dto.price || 0);
    const buyingPrice = dto.buyingPrice ? Number(dto.buyingPrice) : 0;
    const comparePrice = dto.comparePrice && Number(dto.comparePrice) > 0 ? Number(dto.comparePrice) : null;
    const image = dto.image || '/logo.png';
    const description = dto.description || productTitle;

    // Format array / object fields to string for Prisma DB
    const galleryImages = Array.isArray(dto.galleryImages) ? dto.galleryImages.join(', ') : (dto.galleryImages || null);
    const keywords = Array.isArray(dto.keywords) ? dto.keywords.join(', ') : (dto.keywords || null);
    const tags = Array.isArray(dto.tags) ? dto.tags.join(', ') : (dto.tags || null);
    const features = Array.isArray(dto.features) ? dto.features.join('\n') : (dto.features || null);
    const seoKeywords = Array.isArray(dto.seoKeywords) ? dto.seoKeywords.join(', ') : (dto.seoKeywords || null);
    const specifications = typeof dto.specifications === 'object' ? JSON.stringify(dto.specifications) : (dto.specifications || null);

    try {
      const created = await this.prisma.products.create({
        data: {
          id,
          title: productTitle,
          brand: dto.brand || null,
          urlSlug: slug,
          sku: sku,
          category: category,
          buyingPrice: buyingPrice,
          price: price,
          comparePrice: comparePrice,
          stock: Number(dto.stock ?? 10),
          lowStockThreshold: Number(dto.lowStockThreshold ?? 5),
          status: dto.status || 'in_stock',
          image: image,
          galleryImages: galleryImages,
          keywords: keywords,
          tags: tags,
          shortDescription: dto.shortDescription || null,
          description: description,
          features: features,
          specifications: specifications,
          usability: dto.usability || null,
          color: dto.color || null,
          material: dto.material || null,
          warranty: dto.warranty || null,
          deliveryInsideDhaka: dto.deliveryInsideDhaka !== undefined && dto.deliveryInsideDhaka !== null && dto.deliveryInsideDhaka !== '' ? Number(dto.deliveryInsideDhaka) : 70,
          deliveryOutsideDhaka: dto.deliveryOutsideDhaka !== undefined && dto.deliveryOutsideDhaka !== null && dto.deliveryOutsideDhaka !== '' ? Number(dto.deliveryOutsideDhaka) : 130,
          metaTitle: dto.metaTitle || null,
          metaDescription: dto.metaDescription || null,
          seoKeywords: seoKeywords,
        },
      });

      return created;
    } catch (err: any) {
      console.error('[ProductsService] Error creating product:', err);
      throw new BadRequestException(err.message || 'Failed to create product due to database error.');
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOneBySlugOrId(id);

    const updateData: any = {};
    if (dto.title || dto.name) updateData.title = dto.title || dto.name;
    if (dto.brand !== undefined) updateData.brand = dto.brand || null;
    if (dto.urlSlug) updateData.urlSlug = dto.urlSlug;
    if (dto.sku) {
      const cleanSku = dto.sku.trim().toUpperCase().slice(0, 11);
      if (cleanSku !== existing.sku) {
        const skuCheck = await this.checkSkuAvailability(cleanSku, existing.id);
        if (!skuCheck.available) {
          throw new ConflictException(skuCheck.message);
        }
      }
      updateData.sku = cleanSku;
    }
    if (dto.category) updateData.category = dto.category;
    if (dto.buyingPrice !== undefined) updateData.buyingPrice = Number(dto.buyingPrice || 0);
    if (dto.price !== undefined) updateData.price = Number(dto.price || 0);
    if (dto.comparePrice !== undefined) updateData.comparePrice = dto.comparePrice && Number(dto.comparePrice) > 0 ? Number(dto.comparePrice) : null;
    if (dto.stock !== undefined) updateData.stock = Number(dto.stock || 0);
    if (dto.lowStockThreshold !== undefined) updateData.lowStockThreshold = Number(dto.lowStockThreshold || 5);
    if (dto.status) updateData.status = dto.status;
    if (dto.image) updateData.image = dto.image;
    if (dto.galleryImages !== undefined) updateData.galleryImages = Array.isArray(dto.galleryImages) ? dto.galleryImages.join(', ') : (dto.galleryImages || null);
    if (dto.keywords !== undefined) updateData.keywords = Array.isArray(dto.keywords) ? dto.keywords.join(', ') : (dto.keywords || null);
    if (dto.tags !== undefined) updateData.tags = Array.isArray(dto.tags) ? dto.tags.join(', ') : (dto.tags || null);
    if (dto.shortDescription !== undefined) updateData.shortDescription = dto.shortDescription || null;
    if (dto.description) updateData.description = dto.description;
    if (dto.features !== undefined) updateData.features = Array.isArray(dto.features) ? dto.features.join('\n') : (dto.features || null);
    if (dto.specifications !== undefined) updateData.specifications = typeof dto.specifications === 'object' ? JSON.stringify(dto.specifications) : (dto.specifications || null);
    if (dto.usability !== undefined) updateData.usability = dto.usability || null;
    if (dto.color !== undefined) updateData.color = dto.color || null;
    if (dto.material !== undefined) updateData.material = dto.material || null;
    if (dto.warranty !== undefined) updateData.warranty = dto.warranty || null;
    if (dto.deliveryInsideDhaka !== undefined) updateData.deliveryInsideDhaka = dto.deliveryInsideDhaka !== null && dto.deliveryInsideDhaka !== '' ? Number(dto.deliveryInsideDhaka) : 70;
    if (dto.deliveryOutsideDhaka !== undefined) updateData.deliveryOutsideDhaka = dto.deliveryOutsideDhaka !== null && dto.deliveryOutsideDhaka !== '' ? Number(dto.deliveryOutsideDhaka) : 130;
    if (dto.metaTitle !== undefined) updateData.metaTitle = dto.metaTitle || null;
    if (dto.metaDescription !== undefined) updateData.metaDescription = dto.metaDescription || null;
    if (dto.seoKeywords !== undefined) updateData.seoKeywords = Array.isArray(dto.seoKeywords) ? dto.seoKeywords.join(', ') : (dto.seoKeywords || null);

    try {
      const updated = await this.prisma.products.update({
        where: { id: existing.id },
        data: updateData,
      });

      return updated;
    } catch (err: any) {
      console.error('[ProductsService] Error updating product:', err);
      throw new BadRequestException(err.message || 'Failed to update product due to database error.');
    }
  }

  async remove(id: string) {
    // Gracefully handle not found — don't throw 404
    const existing = await this.prisma.products.findFirst({
      where: { OR: [{ id }, { urlSlug: id }] },
    });

    if (!existing) {
      return { success: true, message: 'Product not found or already deleted' };
    }

    return this.prisma.products.delete({
      where: { id: existing.id },
    });
  }

  async bulkRemove(ids: string[]) {
    const result = await this.prisma.products.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: result.count };
  }
}
