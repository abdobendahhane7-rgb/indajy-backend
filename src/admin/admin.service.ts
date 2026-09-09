import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  ApprovalStatus,
  PasswordResetStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { randomInt } from "crypto";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [
      usersCount,
      pendingUsers,
      listingsCount,
      ordersCount,
      farmersCount,
      distributorsCount,
      suspendedUsers,
      latestUsers,
      latestOrders,
    ] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.user.count({
        where: {
          approvalStatus: ApprovalStatus.PENDING,
        },
      }),

      this.prisma.listing.count(),

      this.prisma.order.count(),

      this.prisma.user.count({
        where: {
          role: "FARMER",
        },
      }),

      this.prisma.user.count({
        where: {
          role: "DISTRIBUTOR",
        },
      }),

      this.prisma.user.count({
        where: {
          isActive: false,
        },
      }),

      this.prisma.user.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          role: true,
          approvalStatus: true,
          isActive: true,
          city: true,
          createdAt: true,
        },
      }),

      this.prisma.order.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          listing: true,
          distributor: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      stats: {
        usersCount,
        pendingUsers,
        listingsCount,
        ordersCount,
        farmersCount,
        distributorsCount,
        suspendedUsers,
      },

      latestUsers,
      latestOrders,
    };
  }

  async analytics() {
    const users = await this.prisma.user.findMany({
      select: {
        createdAt: true,
      },
    });

    const listings = await this.prisma.listing.findMany({
      select: {
        createdAt: true,
      },
    });

    const orders = await this.prisma.order.findMany({
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const walletTransactions =
        await this.prisma.walletTransaction.findMany({
      select: {
        createdAt: true,
        amount: true,
        type: true,
        status: true,
      },
    });

    const days = this.last7Days();

    return {
      usersByDay: this.countByDay(
        users,
        days,
      ),

      listingsByDay: this.countByDay(
        listings,
        days,
      ),

      ordersByDay: this.countByDay(
        orders,
        days,
      ),

      revenueByDay: this.sumByDay(
        walletTransactions,
        days,
      ),
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        documents: true,
      },
    });
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },

      include: {
        documents: true,

        wallet: {
          include: {
            transactions: {
              orderBy: {
                createdAt: "desc",
              },

              take: 30,
            },
          },
        },

        listings: {
          orderBy: {
            createdAt: "desc",
          },
        },

        orders: {
          include: {
            listing: true,
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    return user;
  }

  async updateApproval(
    id: string,
    approvalStatus: ApprovalStatus,
  ) {
    const user =
        await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        approvalStatus,
      },

      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        approvalStatus: true,
        isActive: true,
      },
    });
  }

  async updateActive(
    id: string,
    isActive: boolean,
  ) {
    const user =
        await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        isActive,
      },

      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        approvalStatus: true,
        isActive: true,
      },
    });
  }

  async rechargeWallet(
    userId: string,
    amount: number,
    note?: string,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException(
        "Amount must be greater than 0",
      );
    }

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

    return this.prisma.$transaction(
      async (tx) => {
        const wallet =
            await tx.wallet.upsert({
          where: {
            userId,
          },

          update: {
            balance: {
              increment: amount,
            },
          },

          create: {
            userId,
            balance: amount,
          },
        });

        const transaction =
            await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,

            type:
                WalletTransactionType.CREDIT,

            status:
                WalletTransactionStatus.COMPLETED,

            amount,

            fee: 0,

            netAmount: amount,

            note:
                note ??
                "Admin wallet recharge",
          },
        });

        return {
          message:
              "Wallet recharged successfully",

          wallet,

          transaction,
        };
      },
    );
  }

  // =================================
  // DELETE USER
  // =================================

  async deleteUser(id: string) {
    const user =
        await this.prisma.user.findUnique({
      where: {
        id,
      },

      include: {
        orders: true,

        driverOrders: true,

        listings: {
          include: {
            orders: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    // ما نمسحوش Admin
    if (user.role === "ADMIN") {
      throw new BadRequestException(
        "Admin account cannot be deleted",
      );
    }

    // Orders كمشتري
    if (user.orders.length > 0) {
      throw new BadRequestException(
        "This user has orders and cannot be deleted. Suspend the account instead.",
      );
    }

    // Listings ديال الفلاح اللي فيهم orders
    const listingHasOrders =
        user.listings.some(
      (listing) =>
          listing.orders.length > 0,
    );

    if (listingHasOrders) {
      throw new BadRequestException(
        "This farmer has listings with orders and cannot be deleted. Suspend the account instead.",
      );
    }

    // Driver عندو orders
    // ماشي مشكل حيث schema عندك onDelete SetNull
    // ولكن نخلي Prisma يدبرها

    await this.prisma.user.delete({
      where: {
        id,
      },
    });

    return {
      message:
          "User deleted successfully",
    };
  }

  // =========================================================
  // PASSWORD RESET REQUESTS
  // =========================================================

  async getPasswordResetRequests() {
    return this.prisma.passwordResetRequest.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            approvalStatus: true,
            isActive: true,
            city: true,
          },
        },
      },
    });
  }

  async approvePasswordReset(id: string) {
    const request =
      await this.prisma.passwordResetRequest.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              role: true,
              approvalStatus: true,
              isActive: true,
            },
          },
        },
      });

    if (!request) {
      throw new NotFoundException(
        "Password reset request not found",
      );
    }

    if (request.user.role === "ADMIN") {
      throw new BadRequestException(
        "Admin password cannot be reset from this flow",
      );
    }

    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    const approvedAt = new Date();
    const expiresAt = new Date(
      approvedAt.getTime() + 30 * 60 * 1000,
    );

    const updated =
      await this.prisma.passwordResetRequest.update({
        where: { id },
        data: {
          status: PasswordResetStatus.APPROVED,
          codeHash,
          approvedAt,
          expiresAt,
          usedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              role: true,
            },
          },
        },
      });

    // IMPORTANT:
    // code is returned only in this approve response.
    // Database stores only bcrypt hash.
    return {
      message: "Password reset approved",
      code,
      expiresAt,
      request: updated,
    };
  }

  async rejectPasswordReset(id: string) {
    const request =
      await this.prisma.passwordResetRequest.findUnique({
        where: { id },
      });

    if (!request) {
      throw new NotFoundException(
        "Password reset request not found",
      );
    }

    return this.prisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: PasswordResetStatus.REJECTED,
        codeHash: null,
        approvedAt: null,
        expiresAt: null,
        usedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
          },
        },
      },
    });
  }

  private last7Days() {
    const days: string[] = [];

    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);

      d.setDate(
        now.getDate() - i,
      );

      days.push(
        d.toISOString().split("T")[0],
      );
    }

    return days;
  }

  private countByDay(
    items: {
      createdAt: Date;
    }[],
    days: string[],
  ) {
    return days.map((day) => ({
      day,

      count: items.filter((x) =>
        x.createdAt
            .toISOString()
            .startsWith(day),
      ).length,
    }));
  }

  private sumByDay(
    items: {
      createdAt: Date;
      amount: any;
      status: WalletTransactionStatus;
    }[],
    days: string[],
  ) {
    return days.map((day) => ({
      day,

      total: items
        .filter(
          (x) =>
              x.createdAt
                  .toISOString()
                  .startsWith(day) &&
              x.status ===
                  WalletTransactionStatus.COMPLETED,
        )
        .reduce(
          (sum, x) =>
              sum + Number(x.amount),
          0,
        ),
    }));
  }
}