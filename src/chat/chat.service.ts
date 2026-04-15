import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ChatGateway } from "./chat.gateway";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createConversation(params: {
    farmerId: string;
    distributorId: string;
    orderId?: string;
  }) {
    const farmer = await this.prisma.user.findUnique({
      where: { id: params.farmerId },
    });

    const distributor = await this.prisma.user.findUnique({
      where: { id: params.distributorId },
    });

    if (!farmer || !distributor) {
      throw new NotFoundException("أحد المستخدمين ما موجودش.");
    }

    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        farmerId: params.farmerId,
        distributorId: params.distributorId,
        orderId: params.orderId ?? null,
      },
      include: {
        farmer: {
          select: { id: true, fullName: true, phone: true, city: true },
        },
        distributor: {
          select: { id: true, fullName: true, phone: true, city: true },
        },
        order: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.chatConversation.create({
      data: {
        farmerId: params.farmerId,
        distributorId: params.distributorId,
        orderId: params.orderId,
      },
      include: {
        farmer: {
          select: { id: true, fullName: true, phone: true, city: true },
        },
        distributor: {
          select: { id: true, fullName: true, phone: true, city: true },
        },
        order: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  async getMyConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: {
        OR: [{ farmerId: userId }, { distributorId: userId }],
      },
      include: {
        farmer: {
          select: { id: true, fullName: true, phone: true, city: true },
        },
        distributor: {
          select: { id: true, fullName: true, phone: true, city: true },
        },
        order: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException("المحادثة ما موجوداش.");
    }

    if (
      conversation.farmerId !== userId &&
      conversation.distributorId !== userId
    ) {
      throw new BadRequestException("ما عندكش الحق لهاد المحادثة.");
    }

    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async sendMessage(userId: string, conversationId: string, text: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        farmer: true,
        distributor: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException("المحادثة ما موجوداش.");
    }

    if (
      conversation.farmerId !== userId &&
      conversation.distributorId !== userId
    ) {
      throw new BadRequestException("ما عندكش الحق تصيفط فهاد المحادثة.");
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        text,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
      },
    });

    const receiverId =
      conversation.farmerId === userId
        ? conversation.distributorId
        : conversation.farmerId;

    await this.notificationsService.createNotification({
      userId: receiverId,
      title: "رسالة جديدة",
      body: text.length > 60 ? `${text.substring(0, 60)}...` : text,
      type: "CHAT_MESSAGE",
      metadata: {
        conversationId,
        senderId: userId,
      },
    });

    this.chatGateway.emitNewMessage(conversationId, message);

    return message;
  }

  async markConversationAsRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException("المحادثة ما موجوداش.");
    }

    if (
      conversation.farmerId !== userId &&
      conversation.distributorId !== userId
    ) {
      throw new BadRequestException("ما عندكش الحق لهاد المحادثة.");
    }

    return this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId,
        },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.chatMessage.count({
      where: {
        conversation: {
          OR: [{ farmerId: userId }, { distributorId: userId }],
        },
        senderId: {
          not: userId,
        },
        isRead: false,
      },
    });

    return { unread: count };
  }
}