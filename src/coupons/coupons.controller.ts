import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import {
  ValidateCouponDto,
  CreateCouponDto,
  UpdateCouponDto,
} from './dto/coupons.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // Public endpoint: Validate coupon and calculate discount amount
  @Post('validate')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validateCoupon(dto);
  }

  // Admin endpoints
  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
