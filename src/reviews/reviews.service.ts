import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/reviews.dto';
import { v4 as uuidv4 } from 'uuid';

export interface ReviewRecord {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  avatar?: string;
  image?: string;
  role?: string;
  productId?: string;
  isHomepage?: boolean;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_SEEDED_REVIEWS: ReviewRecord[] = [
  {
    id: 'rev-home-1',
    userName: 'Tamim Iqbal',
    role: 'Verified Buyer',
    rating: 5,
    comment:
      'Outstanding product quality and packaging! Delivered inside Dhaka within 24 hours via Steadfast Courier. Highly recommended storefront!',
    avatar: '/logo.png',
    image: '',
    productId: '',
    isHomepage: true,
    status: 'approved',
    createdAt: new Date('2026-08-30T10:00:00Z'),
    updatedAt: new Date('2026-08-30T10:00:00Z'),
  },
  {
    id: 'rev-home-2',
    userName: 'Nusrat Jahan',
    role: 'Verified Buyer',
    rating: 5,
    comment:
      'The minimalist ceramic vase looks even better in real life. Smooth checkout experience and fast customer service support.',
    avatar: '/logo.png',
    image: '',
    productId: '',
    isHomepage: true,
    status: 'approved',
    createdAt: new Date('2026-08-28T14:30:00Z'),
    updatedAt: new Date('2026-08-28T14:30:00Z'),
  },
  {
    id: 'rev-home-3',
    userName: 'Tanvir Hossain',
    role: 'Verified Buyer',
    rating: 5,
    comment:
      'Cash on delivery was smooth and the rider let me inspect product before paying. Best e-commerce shopping experience in BD!',
    avatar: '/logo.png',
    image: '',
    productId: '',
    isHomepage: true,
    status: 'approved',
    createdAt: new Date('2026-08-25T18:15:00Z'),
    updatedAt: new Date('2026-08-25T18:15:00Z'),
  },
];

@Injectable()
export class ReviewsService implements OnModuleInit {
  private readonly logger = new Logger(ReviewsService.name);
  private memoryStore: ReviewRecord[] = [...DEFAULT_SEEDED_REVIEWS];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await (this.prisma as any).reviews?.count?.().catch(() => null);
      if (count === 0) {
        for (const item of DEFAULT_SEEDED_REVIEWS) {
          await (this.prisma as any).reviews?.create?.({
            data: {
              id: item.id,
              userName: item.userName,
              role: item.role,
              rating: item.rating,
              comment: item.comment,
              avatar: item.avatar,
              image: item.image,
              isHomepage: item.isHomepage,
              status: item.status,
            },
          }).catch(() => null);
        }
        this.logger.log('✅ Seeded default homepage testimonials into DB');
      }
    } catch (e) {
      this.logger.warn('Reviews initialization fallback active:', e);
    }
  }

  async findAll(query?: { isHomepage?: string; productId?: string }) {
    try {
      const where: any = {};
      if (query?.isHomepage === 'true') {
        where.isHomepage = true;
      } else if (query?.productId) {
        where.productId = query.productId;
      }

      const dbResults = await (this.prisma as any).reviews?.findMany?.({
        where,
        orderBy: { createdAt: 'desc' },
      });

      if (Array.isArray(dbResults) && dbResults.length > 0) {
        return dbResults;
      }
    } catch (e) {
      // fallback to memoryStore
    }

    let filtered = [...this.memoryStore];
    if (query?.isHomepage === 'true') {
      filtered = filtered.filter((r) => r.isHomepage);
    } else if (query?.productId) {
      filtered = filtered.filter((r) => r.productId === query.productId);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findOne(id: string) {
    try {
      const found = await (this.prisma as any).reviews?.findUnique?.({
        where: { id },
      });
      if (found) return found;
    } catch (e) {}

    const mem = this.memoryStore.find((r) => r.id === id);
    if (!mem) throw new NotFoundException('Review not found');
    return mem;
  }

  async create(dto: CreateReviewDto) {
    const newRecord: ReviewRecord = {
      id: uuidv4(),
      userName: dto.userName,
      rating: Number(dto.rating || 5),
      comment: dto.comment,
      avatar: dto.avatar || '/logo.png',
      image: dto.image || '',
      role: dto.role || 'Verified Buyer',
      productId: dto.productId || '',
      isHomepage: Boolean(dto.isHomepage),
      status: dto.status || 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const created = await (this.prisma as any).reviews?.create?.({
        data: newRecord,
      });
      if (created) {
        this.memoryStore.unshift(created);
        return created;
      }
    } catch (e) {
      this.logger.warn('Failed to insert review into database, keeping in memory:', e);
    }

    this.memoryStore.unshift(newRecord);
    return newRecord;
  }

  async update(id: string, dto: UpdateReviewDto) {
    const updatedData: any = {
      ...dto,
      rating: dto.rating !== undefined ? Number(dto.rating) : undefined,
      isHomepage: dto.isHomepage !== undefined ? Boolean(dto.isHomepage) : undefined,
      updatedAt: new Date(),
    };

    try {
      const updated = await (this.prisma as any).reviews?.update?.({
        where: { id },
        data: updatedData,
      });
      if (updated) {
        const idx = this.memoryStore.findIndex((r) => r.id === id);
        if (idx !== -1) this.memoryStore[idx] = updated;
        return updated;
      }
    } catch (e) {}

    const idx = this.memoryStore.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException('Review not found');

    this.memoryStore[idx] = {
      ...this.memoryStore[idx],
      ...updatedData,
    };
    return this.memoryStore[idx];
  }

  async delete(id: string) {
    try {
      await (this.prisma as any).reviews?.delete?.({
        where: { id },
      });
    } catch (e) {}

    this.memoryStore = this.memoryStore.filter((r) => r.id !== id);
    return { success: true, message: 'Review deleted successfully' };
  }
}
