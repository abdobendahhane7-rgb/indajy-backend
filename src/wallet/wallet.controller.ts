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
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminDepositWalletDto } from "./dto/admin-deposit-wallet.dto";
import { DepositWalletDto } from "./dto/deposit-wallet.dto";
import { WalletService } from "./wallet.service";

@Controller("wallet")
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyWallet(@CurrentUser() user: any) {
    return this.walletService.getMyWallet(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("deposit-request")
  requestDeposit(@CurrentUser() user: any, @Body() dto: DepositWalletDto) {
    return this.walletService.requestDeposit(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("admin/deposit")
  adminDeposit(@Body() dto: AdminDepositWalletDto) {
    return this.walletService.adminDeposit(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get("admin/transactions")
  getAllTransactions() {
    return this.walletService.getAllTransactions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get("admin/pending-deposits")
  getPendingDeposits() {
    return this.walletService.getPendingDeposits();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch("admin/deposits/:id/approve")
  approveDeposit(@Param("id") id: string) {
    return this.walletService.approveDeposit(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch("admin/deposits/:id/reject")
  rejectDeposit(@Param("id") id: string) {
    return this.walletService.rejectDeposit(id);
  }
}