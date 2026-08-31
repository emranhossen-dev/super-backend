import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CustomerData {
  id?: string;
  uid?: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  provider?: string;
  cartItems?: any[];
  joinedAt?: string;
  lastLogin?: string;
  status?: string;
  totalOrders?: number;
  totalSpent?: number;
}

@Injectable()
export class CustomersService {
  private syncedCustomers = new Map<string, CustomerData>();

  constructor(private prisma: PrismaService) {
    // Initial demo customer records
    const demoCustomers: CustomerData[] = [
      {
        id: 'cust-1',
        uid: 'demo-uid-01',
        name: 'Shamshed Rahman',
        email: 'shamshed.dev@gmail.com',
        phone: '01895627138',
        avatar: '/logo.png',
        provider: 'google.com',
        joinedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        status: 'active',
        totalOrders: 2,
        totalSpent: 5650,
        cartItems: [
          {
            id: '1',
            title: 'Smart LED Digital Pen Holder',
            price: 2450,
            quantity: 1,
            image: '/images/ardhimart-smart-pen-holder.webp',
          },
        ],
      },
      {
        id: 'cust-2',
        uid: 'demo-uid-02',
        name: 'Rafiqul Islam',
        email: 'rafiq.bd@example.com',
        phone: '01700000000',
        avatar: '/logo.png',
        provider: 'password',
        joinedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        lastLogin: new Date(Date.now() - 3600000 * 5).toISOString(),
        status: 'active',
        totalOrders: 1,
        totalSpent: 1800,
        cartItems: [],
      },
    ];

    demoCustomers.forEach((c) => {
      this.syncedCustomers.set(c.email.toLowerCase(), c);
    });
  }

  async syncCustomer(data: CustomerData) {
    const key = (data.email || data.uid || data.phone || 'anonymous').toLowerCase();
    const existing = this.syncedCustomers.get(key);

    const updatedCustomer: CustomerData = {
      id: existing?.id || data.uid || `cust-${this.syncedCustomers.size + 1}`,
      uid: data.uid || existing?.uid || '',
      name: data.name || existing?.name || 'Customer',
      email: data.email || existing?.email || '',
      avatar: data.avatar || existing?.avatar || '/logo.png',
      phone: data.phone || existing?.phone || 'N/A',
      provider: data.provider || existing?.provider || 'google.com',
      cartItems: data.cartItems !== undefined ? data.cartItems : (existing?.cartItems || []),
      joinedAt: existing?.joinedAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: 'active',
      totalOrders: existing?.totalOrders || 0,
      totalSpent: existing?.totalSpent || 0,
    };

    this.syncedCustomers.set(key, updatedCustomer);
    return { success: true, customer: updatedCustomer };
  }

  async findAll() {
    try {
      const orders = await (this.prisma as any).orders.findMany({
        orderBy: { createdAt: 'desc' },
      });

      orders.forEach((order: any) => {
        const key = (order.customerEmail || order.customerPhone || order.customerName || '').toLowerCase();
        if (key) {
          const existing = this.syncedCustomers.get(key);
          if (existing) {
            existing.totalOrders = (existing.totalOrders || 0) + 1;
            existing.totalSpent = (existing.totalSpent || 0) + Number(order.totalAmount || 0);
          } else {
            this.syncedCustomers.set(key, {
              id: `cust-${this.syncedCustomers.size + 1}`,
              name: order.customerName || 'Anonymous Customer',
              email: order.customerEmail || 'customer@example.com',
              phone: order.customerPhone || 'N/A',
              avatar: '/logo.png',
              provider: 'password',
              joinedAt: order.createdAt || new Date().toISOString(),
              lastLogin: order.createdAt || new Date().toISOString(),
              status: 'active',
              totalOrders: 1,
              totalSpent: Number(order.totalAmount || 0),
              cartItems: [],
            });
          }
        }
      });
    } catch (e) {
      console.warn('Orders query fallback for customers:', e);
    }

    return Array.from(this.syncedCustomers.values());
  }

  async findOne(id: string) {
    const all = await this.findAll();
    return all.find((c) => c.id === id || c.uid === id) || all[0];
  }
}
