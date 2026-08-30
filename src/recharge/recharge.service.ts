import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  RechargeRequestStatus,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RechargeService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // CREATE RECHARGE REQUEST
  // =========================================================

  async createRequest(
    userId: string,
    body: {
      amount: number;
      method: string;
      receiptUrl: string;
    },
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    const amount = Number(body.amount);

    const method = String(
      body.method || "",
    ).trim();

    const receiptUrl = String(
      body.receiptUrl || "",
    ).trim();

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Amount must be greater than 0",
      );
    }

    if (method.length === 0) {
      throw new BadRequestException(
        "Payment method is required",
      );
    }

    if (receiptUrl.length === 0) {
      throw new BadRequestException(
        "Receipt is required",
      );
    }

    return this.prisma.rechargeRequest.create({
      data: {
        userId,
        amount,
        method,
        receiptUrl,
        status:
          RechargeRequestStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            city: true,
          },
        },
      },
    });
  }

  // =========================================================
  // USER - MY REQUESTS
  // =========================================================

  async getMyRequests(
    userId: string,
  ) {
    return this.prisma.rechargeRequest.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // =========================================================
  // ADMIN - GET ALL REQUESTS
  // =========================================================

  async getAllRequests(
    adminId: string,
  ) {
    await this.checkAdmin(adminId);

    return this.prisma.rechargeRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            city: true,
            wallet: {
              select: {
                id: true,
                balance: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // =========================================================
  // ADMIN - APPROVE REQUEST
  // =========================================================

  async approveRequest(
    adminId: string,
    requestId: string,
  ) {
    await this.checkAdmin(adminId);

    const request =
      await this.prisma.rechargeRequest.findUnique({
        where: {
          id: requestId,
        },
        include: {
          user: true,
        },
      });

    if (!request) {
      throw new NotFoundException(
        "Recharge request not found",
      );
    }

    if (
      request.status !==
      RechargeRequestStatus.PENDING
    ) {
      throw new BadRequestException(
        "Request already processed",
      );
    }

    const amount = Number(
      request.amount,
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid recharge amount",
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Wallet dyal user
        const wallet =
          await tx.wallet.upsert({
            where: {
              userId:
                request.userId,
            },
            update: {
              balance: {
                increment:
                  amount,
              },
            },
            create: {
              userId:
                request.userId,
              balance:
                amount,
            },
          });

        // Transaction history
        await tx.walletTransaction.create({
          data: {
            walletId:
              wallet.id,
            userId:
              request.userId,
            type:
              WalletTransactionType.DEPOSIT,
            status:
              WalletTransactionStatus.COMPLETED,
            amount:
              amount,
            fee:
              0,
            netAmount:
              amount,
            note:
              `Recharge approved via ${request.method}`,
          },
        });

        // Update recharge request
        const updatedRequest =
          await tx.rechargeRequest.update({
            where: {
              id:
                requestId,
            },
            data: {
              status:
                RechargeRequestStatus.APPROVED,
              note:
                "Approved by admin",
            },
            include: {
              user: {
                select: {
                  id:
                    true,
                  fullName:
                    true,
                  phone:
                    true,
                  role:
                    true,
                  city:
                    true,
                  wallet: {
                    select: {
                      balance:
                        true,
                    },
                  },
                },
              },
            },
          });

        return {
          message:
            "Recharge approved successfully",
          request:
            updatedRequest,
          newBalance:
            wallet.balance,
        };
      },
    );
  }

  // =========================================================
  // ADMIN - REJECT REQUEST
  // =========================================================

  async rejectRequest(
    adminId: string,
    requestId: string,
    note?: string,
  ) {
    await this.checkAdmin(adminId);

    const request =
      await this.prisma.rechargeRequest.findUnique({
        where: {
          id: requestId,
        },
      });

    if (!request) {
      throw new NotFoundException(
        "Recharge request not found",
      );
    }

    if (
      request.status !==
      RechargeRequestStatus.PENDING
    ) {
      throw new BadRequestException(
        "Request already processed",
      );
    }

    return this.prisma.rechargeRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status:
          RechargeRequestStatus.REJECTED,
        note:
          note && note.trim().length > 0
            ? note!.trim()
            : "Rejected by admin",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            city: true,
          },
        },
      },
    });
  }

  // =========================================================
  // CHECK ADMIN
  // =========================================================

  async checkAdmin(
    adminId: string,
  ) {
    const admin =
      await this.prisma.user.findUnique({
        where: {
          id: adminId,
        },
      });

    if (!admin) {
      throw new NotFoundException(
        "Admin not found",
      );
    }

    if (
      admin.role !==
      UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Admin only",
      );
    }

    return admin;
  }
}