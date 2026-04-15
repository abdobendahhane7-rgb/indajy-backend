import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateListingDto } from "./dto/create-listing.dto";

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async createListing(
    farmerId: string,
    dto: CreateListingDto,
    imageUrl?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: farmerId },
    });

    if (!user) {
      throw new NotFoundException("المستخدم ما موجودش.");
    }

    const listing = await this.prisma.productListing.create({
      data: {
        farmerId,
        title: dto.title,
        description: dto.description,
        poultryType: dto.poultryType,
        quantity: dto.quantity,
        availableQuantity: dto.availableQuantity,
        unitPrice: dto.unitPrice,
        averageWeightKg: dto.averageWeightKg,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      include: {
        images: true,
      },
    });

    if (imageUrl) {
      await this.prisma.productImage.create({
        data: {
          listingId: listing.id,
          imageUrl,
        },
      });
    }

    return this.prisma.productListing.findUnique({
      where: { id: listing.id },
      include: {
        images: true,
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
  }

  async getMyListings(farmerId: string) {
    return this.prisma.productListing.findMany({
      where: {
        farmerId,
      },
      include: {
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getActiveListings() {
    return this.prisma.productListing.findMany({
      where: {
        isActive: true,
      },
      include: {
        images: true,
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
}