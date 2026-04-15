import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WalletTransactionStatus, WalletTransactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createTopupRequest(
    userId: string,
    dto: { amount: string; note?: string; paymentProofUrl?: string },
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException("المحفظة ما موجوداش.");
    }

    return this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: WalletTransactionType.TOP_UP,
        amount: dto.amount,
        note: dto.note,
        status: WalletTransactionStatus.PENDING,
        reference: dto.paymentProofUrl,
      },
    });
  }

  async getMyWalletTransactions(userId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getPendingTopupRequests() {
    return this.prisma.walletTransaction.findMany({
      where: {
        type: WalletTransactionType.TOP_UP,
        status: WalletTransactionStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            role: true,
          },
        },
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async approveTopupRequest(adminId: string, requestId: string) {
    const request = await this.prisma.walletTransaction.findUnique({
      where: { id: requestId },
      include: {
        wallet: true,
      },
    });

    if (!request) {
      throw new NotFoundException("طلب الشحن ما موجودش.");
    }

    if (request.status !== WalletTransactionStatus.PENDING) {
      throw new BadRequestException("هاد الطلب متعالج من قبل.");
    }

    const currentBalance = Number(request.wallet.balance);
    const amount = Number(request.amount);
    const newBalance = currentBalance + amount;

    await this.prisma.wallet.update({
      where: { id: request.walletId },
      data: {
        balance: newBalance,
      },
    });

    const updatedRequest = await this.prisma.walletTransaction.update({
      where: { id: requestId },
      data: {
        status: WalletTransactionStatus.COMPLETED,
        note: `Approved by admin: ${adminId}`,
      },
      include: {
        user: true,
        wallet: true,
      },
    });

    await this.notificationsService.createNotification({
      userId: request.userId,
      title: "تم شحن المحفظة",
      body: `تم قبول طلب الشحن ديالك بمبلغ ${request.amount} درهم.`,
      type: "TOPUP_APPROVED",
      metadata: {
        requestId: request.id,
        amount: request.amount,
      },
    });

    return updatedRequest;
  }
}