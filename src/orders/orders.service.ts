import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrder(
    distributorId: string,
    dto: { listingId: string; quantity: number; note?: string },
  ) {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: dto.listingId },
      include: {
        farmer: true,
      },
    });

    if (!listing) {
      throw new NotFoundException("العرض ما موجودش.");
    }

    if (!listing.isActive) {
      throw new BadRequestException("هاد العرض ما بقاش متاح.");
    }

    if (dto.quantity > listing.availableQuantity) {
      throw new BadRequestException("الكمية المطلوبة أكبر من المتوفر.");
    }

    const unitPrice = Number(listing.unitPrice);
    const subtotal = unitPrice * dto.quantity;
    const commissionRate = 5;
    const commissionAmount = (subtotal * commissionRate) / 100;
    const totalAmount = subtotal + commissionAmount;

    const orderNumber = `IND-${Date.now()}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        listingId: listing.id,
        farmerId: listing.farmerId,
        distributorId,
        quantity: dto.quantity,
        unitPrice: unitPrice.toString(),
        subtotal: subtotal.toString(),
        commissionRate: commissionRate.toString(),
        commissionAmount: commissionAmount.toString(),
        totalAmount: totalAmount.toString(),
        note: dto.note,
      },
      include: {
        listing: true,
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
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
      },
    });

    await this.prisma.productListing.update({
      where: { id: listing.id },
      data: {
        availableQuantity: listing.availableQuantity - dto.quantity,
      },
    });

    await this.notificationsService.createNotification({
      userId: listing.farmerId,
      title: "طلب جديد",
      body: `كاين طلب جديد على العرض ديالك. الكمية: ${dto.quantity}`,
      type: "NEW_ORDER",
      metadata: {
        orderId: order.id,
        listingId: listing.id,
        distributorId,
      },
    });

    return order;
  }

  async getDistributorOrders(distributorId: string) {
    return this.prisma.order.findMany({
      where: {
        distributorId,
      },
      include: {
        listing: true,
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getFarmerOrders(farmerId: string) {
    return this.prisma.order.findMany({
      where: {
        farmerId,
      },
      include: {
        listing: true,
        distributor: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateFarmerOrderStatus(
    farmerId: string,
    orderId: string,
    dto: { status: "ACCEPTED" | "REJECTED" | "COMPLETED"; note?: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: true,
      },
    });

    if (!order) {
      throw new NotFoundException("الطلب ما موجودش.");
    }

    if (order.farmerId !== farmerId) {
      throw new BadRequestException("ما عندكش الحق تبدل هاد الطلب.");
    }

    const updateData: any = {
      status: dto.status as OrderStatus,
    };

    if (dto.note && dto.note.trim() !== "") {
      updateData.note = dto.note.trim();
    }

    if (dto.status === "ACCEPTED") {
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException("غير الطلبات المعلقة لي كتقدر تقبلها.");
      }
      updateData.acceptedAt = new Date();
    }

    if (dto.status === "REJECTED") {
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException("غير الطلبات المعلقة لي كتقدر ترفضها.");
      }

      updateData.rejectedAt = new Date();

      await this.prisma.productListing.update({
        where: { id: order.listingId },
        data: {
          availableQuantity: order.listing.availableQuantity + order.quantity,
        },
      });
    }

    if (dto.status === "COMPLETED") {
      if (order.status !== OrderStatus.ACCEPTED) {
        throw new BadRequestException("غير الطلبات المقبولة لي كتقدر تكملها.");
      }
      updateData.completedAt = new Date();
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        listing: true,
        distributor: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
          },
        },
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
          },
        },
      },
    });

    let title = "تحديث الطلب";
    let body = "تم تحديث حالة الطلب ديالك.";
    let type = "ORDER_STATUS_UPDATE";

    if (dto.status === "ACCEPTED") {
      title = "تم قبول الطلب";
      body = "المربي قبل الطلب ديالك.";
      type = "ORDER_ACCEPTED";
    } else if (dto.status === "REJECTED") {
      title = "تم رفض الطلب";
      body = "المربي رفض الطلب ديالك.";
      type = "ORDER_REJECTED";
    } else if (dto.status === "COMPLETED") {
      title = "تم إكمال الطلب";
      body = "الطلب ديالك ولى مكتمل.";
      type = "ORDER_COMPLETED";
    }

    await this.notificationsService.createNotification({
      userId: order.distributorId,
      title,
      body,
      type,
      metadata: {
        orderId: order.id,
        status: dto.status,
      },
    });

    return updatedOrder;
  }
}