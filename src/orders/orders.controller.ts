import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    const rawIp =
      req?.headers?.['x-forwarded-for'] ||
      req?.socket?.remoteAddress ||
      req?.ip;
    const clientIp =
      typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined;
    const userAgent = req?.headers?.['user-agent'];

    return this.ordersService.create(dto, { clientIp, userAgent });
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.ordersService.findAll(status, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updates: any,
  ) {
    return this.ordersService.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
