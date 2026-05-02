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

  async updateDriverLocation(
    userId: string,
    orderId: string,
    body: {
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
    },
  ) {
    if (body.lat == null || body.lng == null) {
      throw new BadRequestException("lat and lng are required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    if (user.role !== UserRole.DRIVER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only driver can update live location");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: true,
      },
    });

    if (!order) throw new NotFoundException("Order not found");

    if (order.status !== OrderStatus.IN_TRANSIT) {
      throw new BadRequestException("Tracking works only in transit");
    }

    if (user.role === UserRole.DRIVER && order.driverId !== userId) {
      throw new ForbiddenException("This order is not assigned to you");
    }

    const tracking = await this.prisma.orderTracking.create({
      data: {
        orderId,
        driverId: userId,
        lat: Number(body.lat),
        lng: Number(body.lng),
        speed: body.speed == null ? null : Number(body.speed),
        heading: body.heading == null ? null : Number(body.heading),
      },
    });

    return {
      message: "Location updated",
      tracking,
    };
  }

  async getLiveLocation(userId: string, orderId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: true,
        distributor: true,
        driver: true,
      },
    });

    if (!order) throw new NotFoundException("Order not found");

    const isAdmin = user.role === UserRole.ADMIN;
    const isDistributor = order.distributorId === userId;
    const isFarmer = order.listing.farmerId === userId;
    const isDriver = order.driverId === userId;

    if (!isAdmin && !isDistributor && !isFarmer && !isDriver) {
      throw new ForbiddenException("Not allowed");
    }

    const tracking = await this.prisma.orderTracking.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    return {
      orderId,
      status: order.status,
      driver: order.driver,
      tracking,
    };
  }

  async assignDriver(orderId: string, driverId: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
    });

    if (!driver) throw new NotFoundException("Driver not found");

    if (driver.role !== UserRole.DRIVER) {
      throw new BadRequestException("Selected user is not a driver");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException("Order not found");

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId,
      },
      include: {
        driver: true,
        listing: true,
        distributor: true,
      },
    });
  }

  async getMyDriverOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        driverId: userId,
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.IN_TRANSIT],
        },
      },
      include: {
        listing: true,
        distributor: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}