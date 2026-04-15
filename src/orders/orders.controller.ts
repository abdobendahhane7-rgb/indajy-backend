import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(
    @Req() req: any,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(req.user.userId, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my-distributor-orders")
  getDistributorOrders(@Req() req: any) {
    return this.ordersService.getDistributorOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my-farmer-orders")
  getFarmerOrders(@Req() req: any) {
    return this.ordersService.getFarmerOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/status")
  updateOrderStatus(
    @Req() req: any,
    @Param("id") id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateFarmerOrderStatus(
      req.user.userId,
      id,
      updateOrderStatusDto,
    );
  }
}