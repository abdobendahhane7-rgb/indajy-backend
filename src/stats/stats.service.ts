import { Injectable } from "@nestjs/common";
import { OrderStatus, WalletTransactionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const [
      pendingUsers,
      pendingTopups,
      totalUsers,
      totalListings,
      totalOrders,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { approvalStatus: "PENDING" },
      }),
      this.prisma.walletTransaction.count({
        where: {
          status: WalletTransactionStatus.PENDING,
          type: "TOP_UP",
        },
      }),
      this.prisma.user.count(),
      this.prisma.productListing.count(),
      this.prisma.order.count(),
    ]);

    return {
      pendingUsers,
      pendingTopups,
      totalUsers,
      totalListings,
      totalOrders,
    };
  }

  async getFarmerStats(userId: string) {
    const [myListings, myOrders, completedOrders, revenue] =
        await Promise.all([
      this.prisma.productListing.count({
        where: { farmerId: userId },
      }),
      this.prisma.order.count({
        where: { farmerId: userId },
      }),
      this.prisma.order.count({
        where: {
          farmerId: userId,
          status: OrderStatus.COMPLETED,
        },
      }),
      this.prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          farmerId: userId,
          status: OrderStatus.COMPLETED,
        },
      }),
    ]);

    return {
      myListings,
      myOrders,
      completedOrders,
      revenue: revenue._sum.totalAmount ?? 0,
    };
  }

  async getDistributorStats(userId: string) {
    const [myOrders, acceptedOrders, completedOrders, wallet] =
        await Promise.all([
      this.prisma.order.count({
        where: { distributorId: userId },
      }),
      this.prisma.order.count({
        where: {
          distributorId: userId,
          status: OrderStatus.ACCEPTED,
        },
      }),
      this.prisma.order.count({
        where: {
          distributorId: userId,
          status: OrderStatus.COMPLETED,
        },
      }),
      this.prisma.wallet.findUnique({
        where: { userId },
      }),
    ]);

    return {
      myOrders,
      acceptedOrders,
      completedOrders,
      walletBalance: wallet?.balance ?? 0,
    };
  }
}