import { Injectable } from '@nestjs/common';
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
}
