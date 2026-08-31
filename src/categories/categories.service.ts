import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.categories.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.categories.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(data: { name: string; slug?: string; description?: string; image?: string }) {
    const id = `cat-${Date.now()}`;
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    return this.prisma.categories.create({
      data: {
        id,
        name: data.name,
        slug,
        description: data.description || null,
        image: data.image || null,
        productCount: 0,
      },
    });
  }

  async update(id: string, data: { name?: string; slug?: string; description?: string; image?: string }) {
    const existing = await this.prisma.categories.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    return this.prisma.categories.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        slug: data.slug ?? existing.slug,
        description: data.description !== undefined ? data.description : existing.description,
        image: data.image !== undefined ? data.image : existing.image,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.categories.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    return this.prisma.categories.delete({
      where: { id },
    });
  }
}
