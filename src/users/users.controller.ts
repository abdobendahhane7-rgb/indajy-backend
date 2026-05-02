import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApprovalStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(@CurrentUser() user: any) {
    return this.usersService.getMyProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("approval-status")
  getApprovalStatus(@CurrentUser() user: any) {
    return this.usersService.getApprovalStatus(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get("pending")
  getPendingUsers() {
    return this.usersService.getPendingUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch(":id/approve")
  approveUser(@Param("id") id: string) {
    return this.usersService.updateApprovalStatus({
      userId: id,
      approvalStatus: ApprovalStatus.APPROVED,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch(":id/reject")
  rejectUser(@Param("id") id: string) {
    return this.usersService.updateApprovalStatus({
      userId: id,
      approvalStatus: ApprovalStatus.REJECTED,
    });
  }
}