import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApprovalStatus, ListingStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  private roundTo2(value: number) {
    return Number(value.toFixed(2));
  }

  private calculateTotalStockValue(quantityKg: number, pricePerKg: number) {
    return this.roundTo2(quantityKg * pricePerKg);
  }

  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.roundTo2(earthRadiusKm * c);
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }

  async createListing(userId: string, dto: CreateListingDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role !== UserRole.FARMER) {
      throw new ForbiddenException("Only farmers can create listings");
    }

    if (user.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException("Your account is not approved yet");
    }

    if (dto.quantityKg <= 0 || dto.pricePerKg <= 0) {
      throw new BadRequestException("Quantity and price must be greater than 0");
    }

    const totalStockValue = this.calculateTotalStockValue(
      dto.quantityKg,
      dto.pricePerKg,
    );

    return this.prisma.listing.create({
      data: {
        farmerId: userId,
        title: dto.title,
        category: dto.category,
        variant: dto.variant,
        description: dto.description,
        quantityKg: dto.quantityKg,
        availableKg: dto.quantityKg,
        pricePerKg: dto.pricePerKg,
        totalStockValue,
        city: dto.city,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isGpsEnabled: dto.isGpsEnabled ?? true,
        status: ListingStatus.ACTIVE,
      },
      include: {
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            latitude: true,
            longitude: true,
            approvalStatus: true,
          },
        },
        images: true,
      },
    });
  }

  async getAllListings(query: {
    city?: string;
    category?: string;
    variant?: string;
    latitude?: number;
    longitude?: number;
    maxDistanceKm?: number;
  }) {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        availableKg: {
          gt: 0,
        },
        city: query.city || undefined,
        category: query.category || undefined,
        variant: query.variant || undefined,
      },
      include: {
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            latitude: true,
            longitude: true,
            approvalStatus: true,
          },
        },
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (query.latitude === undefined || query.longitude === undefined) {
      return listings;
    }

    const withDistance = listings.map((listing) => {
      const distanceKm = this.calculateDistanceKm(
        query.latitude!,
        query.longitude!,
        listing.latitude,
        listing.longitude,
      );

      return {
        ...listing,
        distanceKm,
      };
    });

    const filtered = query.maxDistanceKm
      ? withDistance.filter((item) => item.distanceKm <= query.maxDistanceKm!)
      : withDistance;

    return filtered.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async getMyListings(userId: string) {
    return this.prisma.listing.findMany({
      where: {
        farmerId: userId,
      },
      include: {
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getListingById(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            latitude: true,
            longitude: true,
            approvalStatus: true,
          },
        },
        images: true,
      },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    return listing;
  }

  async updateMyListing(userId: string, listingId: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    if (listing.farmerId !== userId) {
      throw new ForbiddenException("You cannot update this listing");
    }

    const quantityKg = dto.quantityKg ?? listing.quantityKg;
    const pricePerKg = dto.pricePerKg ?? Number(listing.pricePerKg);
    const totalStockValue = this.calculateTotalStockValue(quantityKg, pricePerKg);

    let nextStatus = listing.status;

    if (dto.availableKg !== undefined) {
      nextStatus =
        dto.availableKg <= 0 ? ListingStatus.OUT_OF_STOCK : ListingStatus.ACTIVE;
    }

    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        title: dto.title,
        category: dto.category,
        variant: dto.variant,
        description: dto.description,
        quantityKg: dto.quantityKg,
        availableKg: dto.availableKg,
        pricePerKg: dto.pricePerKg,
        totalStockValue,
        city: dto.city,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isGpsEnabled: dto.isGpsEnabled,
        status: nextStatus,
      },
      include: {
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
        images: true,
      },
    });
  }

  async deactivateMyListing(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    if (listing.farmerId !== userId) {
      throw new ForbiddenException("You cannot deactivate this listing");
    }

    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.INACTIVE,
      },
    });
  }

  async deleteMyListing(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    if (listing.farmerId !== userId) {
      throw new ForbiddenException("You cannot delete this listing");
    }

    await this.prisma.listing.delete({
      where: { id: listingId },
    });

    return {
      message: "Listing deleted successfully",
    };
  }
}