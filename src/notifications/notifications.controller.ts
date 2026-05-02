import { Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getMine(@CurrentUser() user: any) {
    return this.service.getMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("unread-count")
  unread(@CurrentUser() user: any) {
    return this.service.countUnread(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("read-all")
  readAll(@CurrentUser() user: any) {
    return this.service.markAllRead(user.id);
  }
}