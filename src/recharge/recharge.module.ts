import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RechargeController } from "./recharge.controller";
import { RechargeService } from "./recharge.service";

@Module({
  imports: [PrismaModule],
  controllers: [RechargeController],
  providers: [RechargeService],
})
export class RechargeModule {}