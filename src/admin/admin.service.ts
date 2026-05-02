import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ApprovalStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

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
      this.prisma.user.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
      this.prisma.listing.count(),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: "FARMER" } }),
      this.prisma.user.count({ where: { role: "DISTRIBUTOR" } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
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
        orderBy: { createdAt: "desc" },
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
      select: { createdAt: true },
    });

    const listings = await this.prisma.listing.findMany({
      select: { createdAt: true },
    });

    const orders = await this.prisma.order.findMany({
      select: { createdAt: true, totalAmount: true },
    });

    const walletTransactions = await this.prisma.walletTransaction.findMany({
      select: { createdAt: true, amount: true, type: true, status: true },
    });

    const days = this.last7Days();

    return {
      usersByDay: this.countByDay(users, days),
      listingsByDay: this.countByDay(listings, days),
      ordersByDay: this.countByDay(orders, days),
      revenueByDay: this.sumByDay(walletTransactions, days),
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        approvalStatus: true,
        isActive: true,
        city: true,
        createdAt: true,
      },
    });
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        documents: true,
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 30,
            },
          },
        },
        listings: {
          orderBy: { createdAt: "desc" },
        },
        orders: {
          include: { listing: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    return user;
  }

  async updateApproval(id: string, approvalStatus: ApprovalStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id },
      data: { approvalStatus },
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

  async updateActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
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

  async rechargeWallet(userId: string, amount: number, note?: string) {
    if (!amount || amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
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

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: WalletTransactionType.CREDIT,
          status: WalletTransactionStatus.COMPLETED,
          amount,
          fee: 0,
          netAmount: amount,
          note: note || "Admin wallet recharge",
        },
      });

      return {
        message: "Wallet recharged successfully",
        wallet,
        transaction,
      };
    });
  }

  private last7Days() {
    const days: string[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    return days;
  }

  private countByDay(items: { createdAt: Date }[], days: string[]) {
    return days.map((day) => ({
      day,
      count: items.filter((x) => x.createdAt.toISOString().startsWith(day)).length,
    }));
  }

  private sumByDay(
    items: { createdAt: Date; amount: any; status: WalletTransactionStatus }[],
    days: string[],
  ) {
    return days.map((day) => ({
      day,
      total: items
        .filter(
          (x) =>
            x.createdAt.toISOString().startsWith(day) &&
            x.status === WalletTransactionStatus.COMPLETED,
        )
        .reduce((sum, x) => sum + Number(x.amount), 0),
    }));
  }
}