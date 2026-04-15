import { Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus, Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        location: true,
        userDocuments: true,
      },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async getPendingUsers() {
    return this.prisma.user.findMany({
      where: {
        approvalStatus: ApprovalStatus.PENDING,
      },
      include: {
        userDocuments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        city: true,
        approvalStatus: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });
  }

  async approveUser(id: string) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException("هاد المستخدم ما تلقيناهش.");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        rejectionReason: null,
        isVerified: true,
        isActive: true,
      },
      include: {
        userDocuments: true,
      },
    });

    await this.notificationsService.sendToUser({
      userId: id,
      title: "تم قبول الحساب",
      body: "الحساب ديالك تقبل وولات تقدر تستعمل التطبيق.",
      type: "ACCOUNT_APPROVED",
      metadata: {
        userId: id,
      },
    });

    return updatedUser;
  }

  async rejectUser(id: string, reason?: string) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException("هاد المستخدم ما تلقيناهش.");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        rejectionReason: reason || "تم رفض الحساب من طرف الإدارة.",
        isVerified: false,
        isActive: false,
      },
      include: {
        userDocuments: true,
      },
    });

    await this.notificationsService.sendToUser({
      userId: id,
      title: "تم رفض الحساب",
      body: reason || "للأسف، الحساب ديالك ترفض من طرف الإدارة.",
      type: "ACCOUNT_REJECTED",
      metadata: {
        userId: id,
      },
    });

    return updatedUser;
  }

  async saveFcmToken(userId: string, fcmToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("المستخدم ما موجودش.");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fcmToken,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        fcmToken: true,
      },
    });
  }

  async getCurrentUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        location: true,
        userDocuments: true,
      },
    });

    if (!user) {
      throw new NotFoundException("المستخدم ما موجودش.");
    }

    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      city: user.city,
      fcmToken: user.fcmToken,
      approvalStatus: user.approvalStatus,
      rejectionReason: user.rejectionReason,
      isActive: user.isActive,
      isVerified: user.isVerified,
      wallet: user.wallet,
      location: user.location,
      userDocuments: user.userDocuments,
      createdAt: user.createdAt,
    };
  }
}