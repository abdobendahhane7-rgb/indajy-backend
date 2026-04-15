import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { StatsService } from "./stats.service";

@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("admin")
  getAdminStats() {
    return this.statsService.getAdminStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get("farmer")
  getFarmerStats(@Req() req: any) {
    return this.statsService.getFarmerStats(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("distributor")
  getDistributorStats(@Req() req: any) {
    return this.statsService.getDistributorStats(req.user.userId);
  }
}