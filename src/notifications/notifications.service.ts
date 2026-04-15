import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FirebaseAdminService } from "./firebase-admin.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async createNotification(params: {
    userId: string;
    title: string;
    body: string;
    type: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        type: params.type,
        metadata: params.metadata,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        fcmToken: true,
      },
    });

    if (user?.fcmToken && user.fcmToken.trim().length > 0) {
      try {
        await this.firebaseAdminService.sendPushToToken({
          token: user.fcmToken,
          title: params.title,
          body: params.body,
          data: {
            type: params.type,
            userId: params.userId,
          },
        });
      } catch (e) {
        console.error("Push notification error:", e);
      }
    }

    return notification;
  }

  async sendToUser(params: {
    userId: string;
    title: string;
    body: string;
    type?: string;
    metadata?: any;
  }) {
    return this.createNotification({
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type ?? "GENERAL",
      metadata: params.metadata,
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unread: count };
  }
}