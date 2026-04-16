import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { DocumentsModule } from "./documents/documents.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { OrdersModule } from "./orders/orders.module";
import { WalletModule } from "./wallet/wallet.module";
import { UploadModule } from "./upload/upload.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { StatsModule } from "./stats/stats.module";
import { ChatModule } from "./chat/chat.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    MarketplaceModule,
    OrdersModule,
    WalletModule,
    UploadModule,
    NotificationsModule,
    StatsModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}