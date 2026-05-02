import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController, TrackingController],
  providers: [OrdersService, TrackingService],
})
export class OrdersModule {}