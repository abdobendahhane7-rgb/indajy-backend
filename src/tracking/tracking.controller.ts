import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { TrackingService } from "./tracking.service";

@Controller("tracking")
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Get("driver/orders")
  getMyDriverOrders(@CurrentUser() user: any) {
    return this.trackingService.getMyDriverOrders(user.id);
  }

  @Post("orders/:orderId/location")
  updateLocation(
    @CurrentUser() user: any,
    @Param("orderId") orderId: string,
    @Body()
    body: {
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
    },
  ) {
    return this.trackingService.updateDriverLocation(user.id, orderId, body);
  }

  @Get("orders/:orderId/location")
  getLocation(@CurrentUser() user: any, @Param("orderId") orderId: string) {
    return this.trackingService.getLiveLocation(user.id, orderId);
  }

  @Patch("orders/:orderId/assign-driver")
  assignDriver(
    @Param("orderId") orderId: string,
    @Body() body: { driverId: string },
  ) {
    return this.trackingService.assignDriver(orderId, body.driverId);
  }
}