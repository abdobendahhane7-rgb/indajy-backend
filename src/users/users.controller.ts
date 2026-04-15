import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(@Req() req: any) {
    return this.usersService.getCurrentUserProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("pending")
  getPendingUsers() {
    return this.usersService.getPendingUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get("all")
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/approve")
  approveUser(@Param("id") id: string) {
    return this.usersService.approveUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/reject")
  rejectUser(
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.usersService.rejectUser(id, body?.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post("save-fcm-token")
  saveFcmToken(
    @Req() req: any,
    @Body() body: { fcmToken: string },
  ) {
    return this.usersService.saveFcmToken(
      req.user.userId,
      body.fcmToken,
    );
  }
}