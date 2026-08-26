import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class AuthService {
  async syncUser(decodedToken: DecodedIdToken) {
    const { uid, email, name, picture } = decodedToken;

    return {
      message: 'User authenticated and synced successfully',
      user: {
        firebaseUid: uid,
        email: email || '',
        name: name || '',
        photoUrl: picture || '',
        role: 'CUSTOMER',
      },
    };
  }

  async login(credentials: { email?: string; password?: string }) {
    const { email, password } = credentials;
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'agency.nextstation@gmail.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Emran404@';

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nextstation26.asia';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin2026@';

    if (email === superAdminEmail && password === superAdminPassword) {
      return {
        message: 'Super Admin login successful',
        access_token: `jwt_superadmin_${Date.now()}`,
        user: {
          id: 'usr_super_admin_01',
          name: 'NextStation26 Super Admin',
          email: superAdminEmail,
          role: 'Super-Admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          phone: '+880 1700-000000',
        },
      };
    }

    if (email === adminEmail && password === adminPassword) {
      return {
        message: 'Admin login successful',
        access_token: `jwt_admin_${Date.now()}`,
        user: {
          id: 'usr_admin_01',
          name: 'ArdhiMart Admin',
          email: adminEmail,
          role: 'Admin',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          phone: '+880 1700-111111',
        },
      };
    }

    throw new UnauthorizedException('Invalid email address or password');
  }
}
