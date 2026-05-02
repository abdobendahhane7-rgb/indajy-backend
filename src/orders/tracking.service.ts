import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  async updateTracking(
    userId: string,
    orderId: string,
    body: { lat: number; lng: number },
  ) {
    if (body.lat == null || body.lng == null) {
      throw new BadRequestException("lat and lng are required");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true },
    });

    if (!order) throw new NotFoundException("Order not found");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    const isFarmer = order.listing.farmerId === userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isFarmer && !isAdmin) {
      throw new ForbiddenException("Only farmer can update tracking");
    }

    if (order.status !== OrderStatus.IN_TRANSIT) {
      throw new BadRequestException("Tracking only works when order is in transit");
    }

    return this.prisma.orderTracking.create({
      data: {
        orderId,
        lat: Number(body.lat),
        lng: Number(body.lng),
      },
    });
  }

  async getTracking(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true },
    });

    if (!order) throw new NotFoundException("Order not found");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    const isFarmer = order.listing.farmerId === userId;
    const isDistributor = order.distributorId === userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isFarmer && !isDistributor && !isAdmin) {
      throw new ForbiddenException("Not allowed");
    }

    const last = await this.prisma.orderTracking.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    return {
      orderId,
      tracking: last,
    };
  }
}