import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { DocumentsModule } from "./documents/documents.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { ListingsModule } from "./listings/listings.module";
import { OrdersModule } from "./orders/orders.module";
import { SettingsModule } from "./settings/settings.module";
import { UploadModule } from "./upload/upload.module";
import { WalletModule } from "./wallet/wallet.module";
import { ChatModule } from "./chat/chat.module";
import { AdminModule } from "./admin/admin.module";
import { TrackingModule } from "./tracking/tracking.module";
import { RechargeModule } from "./recharge/recharge.module";

// Posts
import { PostsModule } from "./posts/posts.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,

    UsersModule,

    DocumentsModule,

    FavoritesModule,

    ListingsModule,

    TrackingModule,

    OrdersModule,

    SettingsModule,

    UploadModule,

    WalletModule,

    ChatModule,

    AdminModule,

    RechargeModule,

    // Admin posts / announcements
    PostsModule,
  ],
})
export class AppModule {}