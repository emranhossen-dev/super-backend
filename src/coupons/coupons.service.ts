import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ValidateCouponDto,
  CreateCouponDto,
  UpdateCouponDto,
} from './dto/coupons.dto';

@Injectable()
export class CouponsService implements OnModuleInit {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // 1. Ensure any obsolete mock 'FIRST50' coupon is removed if it exists
      await (this.prisma as any).coupons.deleteMany({
        where: { code: { in: ['FIRST50', 'first50'] } },
      }).catch(() => null);

      // 2. Ensure official 'FD20' welcome coupon (20% OFF) is seeded
      const fd20 = await (this.prisma as any).coupons.findFirst({
        where: { code: 'FD20' },
      });

      if (!fd20) {
        await (this.prisma as any).coupons.create({
          data: {
            code: 'FD20',
            type: 'percentage',
            value: 20,
            minSpend: 0,
            usageLimit: 10000,
            usedCount: 0,
            expiryDate: new Date('2028-12-31T23:59:59Z'),
            status: 'active',
          },
        });
        this.logger.log('✅ Seeded default Welcome Coupon FD20 (20% OFF)');
      }
    } catch (err) {
      this.logger.warn('Coupons initialization warning:', err);
    }
  }

  async validateCoupon(dto: ValidateCouponDto) {
    if (!dto.code || !dto.code.trim()) {
      throw new BadRequestException('Coupon code is required');
    }

    const normalizedCode = dto.code.trim().toUpperCase();
    const orderAmount = Number(dto.orderAmount || 0);

    const coupon = await (this.prisma as any).coupons.findFirst({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon code "${normalizedCode}" does not exist`);
    }

    if (coupon.status !== 'active') {
      throw new BadRequestException(`Coupon code "${normalizedCode}" is not active`);
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      throw new BadRequestException(`Coupon code "${normalizedCode}" has expired`);
    }

    if (
      coupon.usageLimit &&
      (coupon.usedCount || 0) >= Number(coupon.usageLimit)
    ) {
      throw new BadRequestException(`Coupon code "${normalizedCode}" has reached its usage limit`);
    }

    const minSpend = Number(coupon.minSpend || 0);
    if (orderAmount < minSpend) {
      throw new BadRequestException(
        `Minimum order amount of ৳${minSpend} required to use coupon "${normalizedCode}"`,
      );
    }

    const couponType = coupon.type === 'percentage' ? 'percentage' : 'fixed';
    const couponVal = Number(coupon.value || 0);
    let discountAmount = 0;

    if (couponType === 'percentage') {
      discountAmount = Math.round((orderAmount * couponVal) / 100);
    } else {
      discountAmount = Math.min(orderAmount, Math.round(couponVal));
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return {
      valid: true,
      code: coupon.code,
      type: couponType,
      value: couponVal,
      discountAmount,
      minSpend,
      finalAmount,
      message:
        couponType === 'percentage'
          ? `Coupon ${coupon.code} applied: ${couponVal}% OFF (Saved ৳${discountAmount})`
          : `Coupon ${coupon.code} applied: ৳${discountAmount} flat discount`,
    };
  }

  async findAll() {
    return (this.prisma as any).coupons.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coupon = await (this.prisma as any).coupons.findUnique({
      where: { id },
    });
    if (!coupon) {
      throw new NotFoundException(`Coupon not found`);
    }
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    const normalizedCode = dto.code.trim().toUpperCase();

    const existing = await (this.prisma as any).coupons.findFirst({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new BadRequestException(`Coupon with code "${normalizedCode}" already exists`);
    }

    return (this.prisma as any).coupons.create({
      data: {
        code: normalizedCode,
        type: dto.type,
        value: Number(dto.value),
        minSpend: Number(dto.minSpend || 0),
        usageLimit: Number(dto.usageLimit || 100),
        usedCount: 0,
        expiryDate: new Date(dto.expiryDate),
        status: dto.status || 'active',
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.findOne(id);

    const updateData: any = {};
    if (dto.code) updateData.code = dto.code.trim().toUpperCase();
    if (dto.type) updateData.type = dto.type;
    if (dto.value !== undefined) updateData.value = Number(dto.value);
    if (dto.minSpend !== undefined) updateData.minSpend = Number(dto.minSpend);
    if (dto.usageLimit !== undefined) updateData.usageLimit = Number(dto.usageLimit);
    if (dto.expiryDate) updateData.expiryDate = new Date(dto.expiryDate);
    if (dto.status) updateData.status = dto.status;

    return (this.prisma as any).coupons.update({
      where: { id: coupon.id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const coupon = await this.findOne(id);
    return (this.prisma as any).coupons.delete({
      where: { id: coupon.id },
    });
  }
}
