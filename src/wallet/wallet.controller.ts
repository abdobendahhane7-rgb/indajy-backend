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
import { WalletService } from "./wallet.service";
import { CreateTopupRequestDto } from "./dto/create-topup-request.dto";

@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Post("topup-request")
  createTopupRequest(
    @Req() req: any,
    @Body() dto: CreateTopupRequestDto,
  ) {
    return this.walletService.createTopupRequest(
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("transactions")
  getMyTransactions(@Req() req: any) {
    return this.walletService.getMyWalletTransactions(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/pending-topups")
  getPendingTopups() {
    return this.walletService.getPendingTopupRequests();
  }

  @UseGuards(JwtAuthGuard)
  @Patch("admin/approve-topup/:id")
  approveTopup(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.walletService.approveTopupRequest(
      req.user.userId,
      id,
    );
  }
}