import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { UploadModule } from "../upload/upload.module";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}