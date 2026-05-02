import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getMine(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
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
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async toggle(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });

      return {
        isFavorite: false,
        message: "Removed from favorites",
      };
    }

    await this.prisma.favorite.create({
      data: {
        userId,
        listingId,
      },
    });

    return {
      isFavorite: true,
      message: "Added to favorites",
    };
  }

  async ids(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { listingId: true },
    });

    return favorites.map((f) => f.listingId);
  }
}