import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RechargeService } from "./recharge.service";

@Controller("recharge")
@UseGuards(JwtAuthGuard)
export class RechargeController {
  constructor(
    private readonly rechargeService: RechargeService,
  ) {}

  // USER - CREATE RECHARGE REQUEST
  @Post("requests")
  createRequest(
    @CurrentUser() user: any,
    @Body()
    body: {
      amount: number;
      method: string;
      receiptUrl: string;
    },
  ) {
    return this.rechargeService.createRequest(
      user.id,
      body,
    );
  }

  // USER - MY REQUESTS
  @Get("requests/me")
  getMyRequests(
    @CurrentUser() user: any,
  ) {
    return this.rechargeService.getMyRequests(
      user.id,
    );
  }

  // ADMIN - ALL REQUESTS
  @Get("admin/requests")
  getAllRequests(
    @CurrentUser() user: any,
  ) {
    return this.rechargeService.getAllRequests(
      user.id,
    );
  }

  // ADMIN - APPROVE
  @Patch("admin/requests/:id/approve")
  approveRequest(
    @CurrentUser() user: any,
    @Param("id") id: string,
  ) {
    return this.rechargeService.approveRequest(
      user.id,
      id,
    );
  }

  // ADMIN - REJECT
  @Patch("admin/requests/:id/reject")
  rejectRequest(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() body: { note?: string },
  ) {
    return this.rechargeService.rejectRequest(
      user.id,
      id,
      body?.note,
    );
  }
}