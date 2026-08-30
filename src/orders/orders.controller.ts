import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(
    @CurrentUser() user: any,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(
      user.id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyOrders(
    @CurrentUser() user: any,
  ) {
    return this.ordersService.getOrdersByUser(
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/status")
  updateOrderStatus(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(
      user.id,
      id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/all")
  getAllOrders() {
    return this.ordersService.getAllOrdersForAdmin();
  }

  // =========================
  // ADMIN DELETE ORDER
  // =========================

  @UseGuards(JwtAuthGuard)
  @Delete("admin/:id")
  deleteOrder(
    @CurrentUser() user: any,
    @Param("id") id: string,
  ) {
    return this.ordersService.deleteOrderForAdmin(
      user.id,
      id,
    );
  }
}