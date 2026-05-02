import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { TrackingService } from "./tracking.service";

@Controller("orders")
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @UseGuards(JwtAuthGuard)
  @Post(":id/tracking")
  updateTracking(
    @CurrentUser() user: any,
    @Param("id") orderId: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.trackingService.updateTracking(user.id, orderId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/tracking")
  getTracking(@CurrentUser() user: any, @Param("id") orderId: string) {
    return this.trackingService.getTracking(user.id, orderId);
  }
}