import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @UseGuards(FirebaseAuthGuard)
  async syncUser(@Req() req: any) {
    return this.authService.syncUser(req.user);
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    return this.authService.login(body);
  }
}
