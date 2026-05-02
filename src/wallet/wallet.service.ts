import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DepositWalletDto } from "./dto/deposit-wallet.dto";
import { AdminDepositWalletDto } from "./dto/admin-deposit-wallet.dto";

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  private roundTo2(value: number) {
    return Number(value.toFixed(2));
  }

  async getOrCreateWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (wallet) {
      return wallet;
    }

    return this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
      include: {
        transactions: true,
      },
    });
  }

  async getMyWallet(userId: string) {
    return this.getOrCreateWallet(userId);
  }

  async requestDeposit(userId: string, dto: DepositWalletDto) {
    const amount = this.roundTo2(dto.amount);

    if (amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    const wallet = await this.getOrCreateWallet(userId);

    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: WalletTransactionType.DEPOSIT,
        status: WalletTransactionStatus.PENDING,
        amount,
        fee: 0,
        netAmount: amount,
        note: dto.note ?? "Deposit request",
      },
    });

    return {
      message: "Deposit request created. Waiting for admin approval.",
      transaction,
    };
  }

  async adminDeposit(dto: AdminDepositWalletDto) {
    const amount = this.roundTo2(dto.amount);

    if (amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    const wallet = await this.getOrCreateWallet(dto.userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId: dto.userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: dto.userId,
          type: WalletTransactionType.DEPOSIT,
          status: WalletTransactionStatus.COMPLETED,
          amount,
          fee: 0,
          netAmount: amount,
          note: dto.note ?? "Admin wallet deposit",
        },
      });

      return {
        updatedWallet,
        transaction,
      };
    });

    return {
      message: "Wallet deposited successfully by admin.",
      ...result,
    };
  }

  async getAllTransactions() {
    return this.prisma.walletTransaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
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

  async getPendingDeposits() {
    return this.prisma.walletTransaction.findMany({
      where: {
        type: WalletTransactionType.DEPOSIT,
        status: WalletTransactionStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
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

  async approveDeposit(transactionId: string) {
    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.type !== WalletTransactionType.DEPOSIT) {
      throw new BadRequestException("Only deposit transactions can be approved");
    }

    if (transaction.status !== WalletTransactionStatus.PENDING) {
      throw new BadRequestException("Only pending deposits can be approved");
    }

    const amount = Number(transaction.netAmount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: transaction.walletId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      const updatedTransaction = await tx.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: WalletTransactionStatus.COMPLETED,
        },
      });

      return {
        updatedWallet,
        updatedTransaction,
      };
    });

    return {
      message: "Deposit approved successfully.",
      ...result,
    };
  }

  async rejectDeposit(transactionId: string) {
    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.type !== WalletTransactionType.DEPOSIT) {
      throw new BadRequestException("Only deposit transactions can be rejected");
    }

    if (transaction.status !== WalletTransactionStatus.PENDING) {
      throw new BadRequestException("Only pending deposits can be rejected");
    }

    const updatedTransaction = await this.prisma.walletTransaction.update({
      where: { id: transactionId },
      data: {
        status: WalletTransactionStatus.REJECTED,
      },
    });

    return {
      message: "Deposit rejected successfully.",
      transaction: updatedTransaction,
    };
  }
}