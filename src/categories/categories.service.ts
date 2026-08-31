import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all top-level categories with their subcategories
  async findAll() {
    return this.prisma.categories.findMany({
      where: { parentId: null }, // only top-level
      orderBy: { createdAt: 'desc' },
      include: {
        children: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // Get flat list of all categories (for product form dropdowns)
  async findAllFlat() {
    return this.prisma.categories.findMany({
      orderBy: [{ parentId: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // Get subcategories of a parent
  async findChildren(parentId: string) {
    return this.prisma.categories.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.categories.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { children: true },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(data: {
    name: string;
    slug?: string;
    description?: string;
    image?: string;
    parentId?: string | null;
  }) {
    const id = `cat-${Date.now()}`;
    let slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const existingSlug = await this.prisma.categories.findFirst({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    return this.prisma.categories.create({
      data: {
        id,
        name: data.name,
        slug,
        description: data.description || null,
        image: data.image || null,
        productCount: 0,
        parentId: data.parentId || null,
      },
      include: { children: true, parent: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    image?: string;
    parentId?: string | null;
  }) {
    const existing = await this.prisma.categories.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!existing) {
      return this.create({
        name: data.name || 'Category',
        slug: data.slug || id,
        description: data.description,
        image: data.image,
        parentId: data.parentId,
      });
    }

    return this.prisma.categories.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        slug: data.slug ?? existing.slug,
        description: data.description !== undefined ? data.description : existing.description,
        image: data.image !== undefined ? data.image : existing.image,
        parentId: data.parentId !== undefined ? data.parentId : existing.parentId,
      },
      include: { children: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.categories.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
          { name: { equals: id, mode: 'insensitive' } }
        ]
      },
    });

    if (!existing) {
      return { success: true, message: 'Category removed' };
    }

    // Move children to parent's parent (or make them top-level) before deleting
    await this.prisma.categories.updateMany({
      where: { parentId: existing.id },
      data: { parentId: existing.parentId || null },
    });

    return this.prisma.categories.delete({
      where: { id: existing.id },
    });
  }
}
