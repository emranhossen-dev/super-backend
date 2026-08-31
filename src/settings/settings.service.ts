import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.store_settings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.store_settings.create({
        data: {
          id: 'default',
          storeName: 'ArdhiMart',
          storeEmail: 'support@ardhimart.com',
          storePhone: '01700000000',
          currency: '৳',
          enableCardImageAutoSlide: true,
          enableGridCarouselAutoSlide: true,
          autoSlideSpeed: 3000,
        },
      });
    }

    return settings;
  }

  async updateSettings(data: any) {
    await this.getSettings(); // ensure record exists
    return this.prisma.store_settings.update({
      where: { id: 'default' },
      data: {
        storeName: data.storeName,
        storeEmail: data.storeEmail,
        storePhone: data.storePhone,
        currency: data.currency,
        logoUrl: data.logoUrl,
        bkashMerchant: data.bkashMerchant,
        nagadMerchant: data.nagadMerchant,
        stripeKey: data.stripeKey,
        flatShippingFee: data.flatShippingFee !== undefined ? data.flatShippingFee : undefined,
        freeShippingThreshold: data.freeShippingThreshold !== undefined ? data.freeShippingThreshold : undefined,
        taxRate: data.taxRate !== undefined ? data.taxRate : undefined,
        enableCardImageAutoSlide: data.enableCardImageAutoSlide !== undefined ? Boolean(data.enableCardImageAutoSlide) : undefined,
        enableGridCarouselAutoSlide: data.enableGridCarouselAutoSlide !== undefined ? Boolean(data.enableGridCarouselAutoSlide) : undefined,
        autoSlideSpeed: data.autoSlideSpeed !== undefined ? Number(data.autoSlideSpeed) : undefined,
      },
    });
  }
}
