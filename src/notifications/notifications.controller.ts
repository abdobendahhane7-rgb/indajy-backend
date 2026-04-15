import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyNotifications(@Req() req: any) {
    return this.notificationsService.getMyNotifications(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("unread-count")
  unreadCount(@Req() req: any) {
    return this.notificationsService.unreadCount(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("read-all")
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/read")
  markAsRead(@Req() req: any, @Param("id") id: string) {
    return this.notificationsService.markAsRead(
      req.user.userId,
      id,
    );
  }
}