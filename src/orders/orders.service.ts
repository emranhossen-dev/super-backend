import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const order = await this.prisma.orders.create({
      data: {
        id: orderId,
        orderNumber,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail || null,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress,
        city: dto.city || 'Dhaka',
        postalCode: dto.postalCode || '1200',
        subtotal: dto.subtotal,
        shippingFee: dto.shippingFee ?? 120,
        discount: dto.discount ?? 0,
        totalAmount: dto.totalAmount,
        paymentMethod: dto.paymentMethod || 'COD',
        status: 'pending',
        paymentStatus: 'unpaid',
        order_items: {
          create: dto.items.map((item) => ({
            id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            image: item.image || '',
          })),
        },
      },
      include: {
        order_items: true,
      },
    });

    // Update customer record or create new customer
    const existingCustomer = await this.prisma.customers.findFirst({
      where: { phone: dto.customerPhone },
    });

    if (existingCustomer) {
      await this.prisma.customers.update({
        where: { id: existingCustomer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: dto.totalAmount },
        },
      });
    } else {
      await this.prisma.customers.create({
        data: {
          id: `cust-${Date.now()}`,
          name: dto.customerName,
          phone: dto.customerPhone,
          email: dto.customerEmail || `${dto.customerPhone}@customer.store`,
          address: dto.shippingAddress,
          totalOrders: 1,
          totalSpent: dto.totalAmount,
        },
      });
    }

    return order;
  }

  async findAll(status?: string, search?: string) {
    const where: any = {};

    if (status && status !== 'All') {
      where.status = status;
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    return this.prisma.orders.findMany({
      where,
      include: { order_items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.orders.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: { order_items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);

    return this.prisma.orders.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
        ...(dto.courierProvider && { courierProvider: dto.courierProvider }),
        ...(dto.trackingCode && { trackingCode: dto.trackingCode }),
      },
      include: { order_items: true },
    });
  }
}
