import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createConversation(
    userId: string,
    otherUserId: string,
    listingId?: string,
  ) {
    if (!otherUserId) {
      throw new BadRequestException("otherUserId is required");
    }

    if (userId === otherUserId) {
      throw new BadRequestException("You cannot chat with yourself");
    }

    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
    });

    if (!otherUser) {
      throw new NotFoundException("Other user not found");
    }

    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        OR: [
          {
            userOneId: userId,
            userTwoId: otherUserId,
            listingId: listingId ?? null,
          },
          {
            userOneId: otherUserId,
            userTwoId: userId,
            listingId: listingId ?? null,
          },
        ],
      },
      include: this.conversationInclude(),
    });

    if (existing) return existing;

    return this.prisma.chatConversation.create({
      data: {
        userOneId: userId,
        userTwoId: otherUserId,
        listingId: listingId ?? null,
      },
      include: this.conversationInclude(),
    });
  }

  async checkConversationAccess(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (
      conversation.userOneId !== userId &&
      conversation.userTwoId !== userId
    ) {
      throw new ForbiddenException("Not allowed");
    }

    return conversation;
  }

  async getMyConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      include: this.conversationInclude(),
      orderBy: {
        lastMessageAt: "desc",
      },
    });
  }

  async getMessages(userId: string, conversationId: string) {
    await this.checkConversationAccess(userId, conversationId);

    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException("Message is empty");
    }

    await this.checkConversationAccess(userId, conversationId);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
      },
    });

    return message;
  }

  private conversationInclude() {
    return {
      userOne: {
        select: {
          id: true,
          fullName: true,
          role: true,
          phone: true,
        },
      },
      userTwo: {
        select: {
          id: true,
          fullName: true,
          role: true,
          phone: true,
        },
      },
      listing: true,
      messages: {
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 1,
      },
    };
  }
  async markMessagesAsRead(userId: string, conversationId: string) {
  await this.checkConversationAccess(userId, conversationId);

  await this.prisma.chatMessage.updateMany({
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

  return this.prisma.chatMessage.findMany({
    where: {
      conversationId,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
 }
}