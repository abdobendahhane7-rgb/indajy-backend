import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Patch,
  Param,
} from "@nestjs/common";

import { OrdersService } from "./orders.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@Controller("orders")
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@CurrentUser() user: any, @Body() body: any) {
    return this.ordersService.createOrder(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.getOrdersByUser(user.id);
  }

  // ✅🔥 هادي هي المهمة
  @UseGuards(JwtAuthGuard)
  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/all")
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }
}