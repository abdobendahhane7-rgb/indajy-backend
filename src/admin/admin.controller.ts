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

import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get("analytics")
  analytics() {
    return this.adminService.analytics();
  }

  @Get("users")
  users() {
    return this.adminService.getUsers();
  }

  @Get("users/:id")
  getUser(@Param("id") id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Patch("users/:id/approval")
  updateApproval(
    @Param("id") id: string,
    @Body()
    body: {
      approvalStatus: "APPROVED" | "REJECTED" | "PENDING";
    },
  ) {
    return this.adminService.updateApproval(
      id,
      body.approvalStatus,
    );
  }

  @Patch("users/:id/active")
  updateActive(
    @Param("id") id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.updateActive(
      id,
      body.isActive,
    );
  }

  @Post("users/:id/wallet/recharge")
  rechargeWallet(
    @Param("id") id: string,
    @Body() body: { amount: number; note?: string },
  ) {
    return this.adminService.rechargeWallet(
      id,
      body.amount,
      body.note,
    );
  }

  // DELETE USER
  @Delete("users/:id")
  deleteUser(@Param("id") id: string) {
    return this.adminService.deleteUser(id);
  }
}