import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  ApprovalStatus,
  ListingStatus,
  OrderStatus,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private roundTo2(value: number) {
    return Number(value.toFixed(2));
  }

  // =========================================================
  // CREATE ORDER
  // =========================================================

  async createOrder(userId: string, dto: CreateOrderDto) {
    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!buyer) {
      throw new NotFoundException("User not found");
    }

    if (buyer.role !== UserRole.DISTRIBUTOR) {
      throw new ForbiddenException(
        "Only distributors can create orders",
      );
    }

    if (buyer.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        "Your account is not approved yet",
      );
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      include: {
        farmer: true,
        images: true,
      },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException(
        "This listing is not active",
      );
    }

    if (listing.availableKg < dto.quantityKg) {
      throw new BadRequestException(
        "Not enough stock available",
      );
    }

    if (listing.farmerId === userId) {
      throw new BadRequestException(
        "You cannot order your own listing",
      );
    }

    const settings =
      await this.prisma.appSetting.findFirst();

    if (!settings) {
      throw new NotFoundException(
        "App settings not found",
      );
    }

    if (!settings.isOrderingOpen) {
      throw new BadRequestException(
        "Ordering is currently disabled by admin",
      );
    }

    if (dto.quantityKg < settings.minOrderKg) {
      throw new BadRequestException(
        `Minimum order quantity is ${settings.minOrderKg} kg`,
      );
    }

    const operationFee = this.roundTo2(
      Number(settings.operationFee),
    );

    const pricePerKg = Number(listing.pricePerKg);

    const subtotal = this.roundTo2(
      dto.quantityKg * pricePerKg,
    );

    const totalAmount = subtotal;

    const newAvailableKg = this.roundTo2(
      listing.availableKg - dto.quantityKg,
    );

    const order = await this.prisma.$transaction(
      async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            listingId: dto.listingId,
            distributorId: userId,
            quantityKg: dto.quantityKg,
            pricePerKg,
            subtotal,
            operationFee,
            totalAmount,
            deliveryAddress: dto.deliveryAddress,
            deliveryCity: dto.deliveryCity,
            deliveryLat: dto.deliveryLat,
            deliveryLng: dto.deliveryLng,
            note: dto.note,
            status: OrderStatus.PENDING,
          },
          include: this.orderInclude(),
        });

        await tx.listing.update({
          where: {
            id: dto.listingId,
          },
          data: {
            availableKg: newAvailableKg,
            status:
              newAvailableKg <= 0
                ? ListingStatus.OUT_OF_STOCK
                : ListingStatus.ACTIVE,
          },
        });

        return createdOrder;
      },
    );

    return {
      message:
        "Order created successfully. Waiting for breeder confirmation. Operation fee will be deducted only after confirmation.",
      order,
      paymentInfo: {
        subtotal,
        operationFee,
        totalAmount,
        buyerWalletDeducted: 0,
        adminWalletAdded: 0,
        note:
          "Operation fee will be deducted when breeder confirms the order.",
      },
    };
  }

  // =========================================================
  // GET ORDERS BY USER
  // =========================================================

  async getOrdersByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === UserRole.ADMIN) {
      return this.getAllOrders();
    }

    if (user.role === UserRole.FARMER) {
      return this.getMyOrdersAsFarmer(userId);
    }

    return this.getMyOrdersAsDistributor(userId);
  }

  // =========================================================
  // DISTRIBUTOR ORDERS
  // =========================================================

  async getMyOrdersAsDistributor(userId: string) {
    return this.prisma.order.findMany({
      where: {
        distributorId: userId,
      },
      include: this.orderInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // =========================================================
  // FARMER ORDERS
  // =========================================================

  async getMyOrdersAsFarmer(userId: string) {
    return this.prisma.order.findMany({
      where: {
        listing: {
          farmerId: userId,
        },
      },
      include: this.orderInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // =========================================================
  // GET ORDER BY ID
  // =========================================================

  async getOrderById(
    userId: string,
    orderId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const isDistributor =
      order.distributorId === userId;

    const isFarmer =
      order.listing.farmerId === userId;

    const isAdmin =
      user.role === UserRole.ADMIN;

    if (
      !isDistributor &&
      !isFarmer &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        "You are not allowed to access this order",
      );
    }

    return order;
  }

  // =========================================================
  // UPDATE ORDER STATUS
  // =========================================================

  async updateOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        listing: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const nextStatus =
      dto.status as OrderStatus;

    const allowedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_TRANSIT,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
      OrderStatus.REJECTED,
    ];

    if (!allowedStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        "Invalid order status",
      );
    }

    const isFarmer =
      order.listing.farmerId === userId;

    const isDistributor =
      order.distributorId === userId;

    const isAdmin =
      user.role === UserRole.ADMIN;

    if (
      !isFarmer &&
      !isDistributor &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        "You are not allowed to update this order",
      );
    }

    // DISTRIBUTOR
    if (isDistributor && !isAdmin) {
      if (
        nextStatus !== OrderStatus.CANCELLED
      ) {
        throw new ForbiddenException(
          "Distributor can only cancel orders",
        );
      }

      if (
        order.status !== OrderStatus.PENDING
      ) {
        throw new BadRequestException(
          "Only pending orders can be cancelled",
        );
      }
    }

    // FARMER
    if (isFarmer && !isAdmin) {
      const farmerAllowedStatuses: OrderStatus[] = [
        OrderStatus.CONFIRMED,
        OrderStatus.REJECTED,
        OrderStatus.IN_TRANSIT,
        OrderStatus.COMPLETED,
      ];

      if (
        !farmerAllowedStatuses.includes(
          nextStatus,
        )
      ) {
        throw new ForbiddenException(
          "Breeder cannot set this status",
        );
      }
    }

    const updated = await this.prisma.$transaction(
      async (tx) => {
        // =====================================================
        // CONFIRM ORDER
        // =====================================================

        if (
          nextStatus === OrderStatus.CONFIRMED
        ) {
          if (
            order.status !== OrderStatus.PENDING
          ) {
            throw new BadRequestException(
              "Only pending orders can be confirmed",
            );
          }

          const buyerWallet =
            await tx.wallet.findUnique({
              where: {
                userId: order.distributorId,
              },
            });

          if (!buyerWallet) {
            throw new BadRequestException(
              "Distributor wallet not found. Please recharge first.",
            );
          }

          const operationFee = Number(
            order.operationFee,
          );

          if (
            Number(buyerWallet.balance) <
            operationFee
          ) {
            throw new BadRequestException(
              "Distributor does not have enough wallet balance to pay operation fee",
            );
          }

          const admin = await tx.user.findFirst({
            where: {
              role: UserRole.ADMIN,
              isActive: true,
            },
          });

          if (!admin) {
            throw new NotFoundException(
              "Admin user not found",
            );
          }

          const adminWallet =
            await tx.wallet.upsert({
              where: {
                userId: admin.id,
              },
              update: {},
              create: {
                userId: admin.id,
                balance: 0,
              },
            });

          // Deduct fee from distributor
          await tx.wallet.update({
            where: {
              userId: order.distributorId,
            },
            data: {
              balance: {
                decrement: operationFee,
              },
            },
          });

          // Distributor transaction
          await tx.walletTransaction.create({
            data: {
              walletId: buyerWallet.id,
              userId: order.distributorId,
              type:
                WalletTransactionType.ORDER_FEE,
              status:
                WalletTransactionStatus.COMPLETED,
              amount: operationFee,
              fee: operationFee,
              netAmount: 0,
              note:
                `Operation fee deducted after order confirmation: ${order.id}`,
            },
          });

          // Add fee to admin wallet
          await tx.wallet.update({
            where: {
              userId: admin.id,
            },
            data: {
              balance: {
                increment: operationFee,
              },
            },
          });

          // Admin transaction
          await tx.walletTransaction.create({
            data: {
              walletId: adminWallet.id,
              userId: admin.id,
              type:
                WalletTransactionType.ORDER_FEE,
              status:
                WalletTransactionStatus.COMPLETED,
              amount: operationFee,
              fee: 0,
              netAmount: operationFee,
              note:
                `Operation fee received after order confirmation: ${order.id}`,
            },
          });
        }

        // =====================================================
        // UPDATE STATUS
        // =====================================================

        const updatedOrder =
          await tx.order.update({
            where: {
              id: orderId,
            },
            data: {
              status: nextStatus,
            },
            include: this.orderInclude(),
          });

        // =====================================================
        // RESTORE STOCK IF CANCELLED / REJECTED
        // =====================================================

        if (
          nextStatus === OrderStatus.CANCELLED ||
          nextStatus === OrderStatus.REJECTED
        ) {
          if (
            order.status === OrderStatus.PENDING
          ) {
            const listingData =
              await tx.listing.findUnique({
                where: {
                  id: order.listingId,
                },
              });

            if (listingData) {
              const restoredKg =
                this.roundTo2(
                  listingData.availableKg +
                    order.quantityKg,
                );

              await tx.listing.update({
                where: {
                  id: order.listingId,
                },
                data: {
                  availableKg: restoredKg,
                  status: ListingStatus.ACTIVE,
                },
              });
            }
          }
        }

        return updatedOrder;
      },
    );

    return {
      message:
        nextStatus === OrderStatus.CONFIRMED
          ? "Order confirmed successfully. Operation fee deducted from distributor wallet and added to admin wallet."
          : "Order status updated successfully",
      order: updated,
    };
  }

  // =========================================================
  // GET ALL ORDERS
  // =========================================================

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: this.orderInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // =========================================================
  // ADMIN GET ALL ORDERS
  // =========================================================

  async getAllOrdersForAdmin() {
    return this.getAllOrders();
  }

  // =========================================================
  // ADMIN DELETE ORDER
  // =========================================================

  async deleteOrderForAdmin(
    userId: string,
    orderId: string,
  ) {
    // Check admin
    const admin = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!admin) {
      throw new NotFoundException(
        "User not found",
      );
    }

    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Only admin can delete orders",
      );
    }

    // Find order
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        listing: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        "Order not found",
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        // If order is still PENDING,
        // return quantity to listing stock
        if (
          order.status === OrderStatus.PENDING
        ) {
          const listing =
            await tx.listing.findUnique({
              where: {
                id: order.listingId,
              },
            });

          if (listing) {
            const restoredKg =
              this.roundTo2(
                listing.availableKg +
                  order.quantityKg,
              );

            await tx.listing.update({
              where: {
                id: order.listingId,
              },
              data: {
                availableKg: restoredKg,
                status: ListingStatus.ACTIVE,
              },
            });
          }
        }

        // Delete order
        await tx.order.delete({
          where: {
            id: orderId,
          },
        });
      },
    );

    return {
      message:
        "Order deleted successfully",
    };
  }

  // =========================================================
  // ORDER INCLUDE
  // =========================================================

  private orderInclude() {
    return {
      listing: {
        include: {
          farmer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              city: true,
            },
          },
          images: true,
        },
      },

      distributor: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          city: true,
        },
      },
    };
  }
}