import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApprovalStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        documents: true,
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async getPendingUsers() {
    return this.prisma.user.findMany({
      where: {
        approvalStatus: ApprovalStatus.PENDING,
        role: {
          in: [UserRole.FARMER, UserRole.DISTRIBUTOR],
        },
      },
      include: {
        documents: true,
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        documents: true,
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateApprovalStatus(params: {
    userId: string;
    approvalStatus: ApprovalStatus;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException("Cannot update admin approval status");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        approvalStatus: params.approvalStatus,
        isActive: params.approvalStatus === ApprovalStatus.APPROVED,
      },
      include: {
        documents: true,
        wallet: true,
      },
    });

    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId: updatedUser.id },
    });

    if (
      params.approvalStatus === ApprovalStatus.APPROVED &&
      !existingWallet
    ) {
      await this.prisma.wallet.create({
        data: {
          userId: updatedUser.id,
          balance: 0,
        },
      });
    }

    return updatedUser;
  }

  async getApprovalStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        role: true,
        approvalStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }
}