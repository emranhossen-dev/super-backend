import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  async updateSettingsPut(@Body() body: any) {
    return this.settingsService.updateSettings(body);
  }

  @Post()
  async updateSettingsPost(@Body() body: any) {
    return this.settingsService.updateSettings(body);
  }
}
