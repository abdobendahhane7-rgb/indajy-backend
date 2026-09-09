import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  ApprovalStatus,
  ListingStatus,
  UserRole,
} from "@prisma/client";

import {
  PrismaService,
} from "../prisma/prisma.service";

import {
  CreateFarmDto,
} from "./dto/create-farm.dto";

import {
  CreateListingDto,
} from "./dto/create-listing.dto";

import {
  UpdateFarmDto,
} from "./dto/update-farm.dto";

import {
  UpdateListingDto,
} from "./dto/update-listing.dto";

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly allowedProducts = [
    "دجاج اللحم",
    "الديك الرومي",
  ];

  // =========================================================
  // HELPERS
  // =========================================================

  private roundTo2(
    value: number,
  ) {
    return Number(
      value.toFixed(2),
    );
  }

  private calculateTotalStockValue(
    quantityKg: number,
    pricePerKg: number,
  ) {
    return this.roundTo2(
      quantityKg * pricePerKg,
    );
  }

  private toRadians(
    value: number,
  ) {
    return (
      value * Math.PI
    ) / 180;
  }

  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const earthRadiusKm =
      6371;

    const dLat =
      this.toRadians(
        lat2 - lat1,
      );

    const dLon =
      this.toRadians(
        lon2 - lon1,
      );

    const a =
      Math.sin(
        dLat / 2,
      ) *
        Math.sin(
          dLat / 2,
        ) +
      Math.cos(
        this.toRadians(
          lat1,
        ),
      ) *
        Math.cos(
          this.toRadians(
            lat2,
          ),
        ) *
        Math.sin(
          dLon / 2,
        ) *
        Math.sin(
          dLon / 2,
        );

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(
          1 - a,
        ),
      );

    return this.roundTo2(
      earthRadiusKm *
        c,
    );
  }

  // =========================================================
  // PRODUCT VALIDATION
  // =========================================================

  private validateProduct(
    category?: string,
    variant?: string,
  ) {
    const validCategory =
      category
        ? this.allowedProducts.includes(
            category,
          )
        : true;

    const validVariant =
      variant
        ? this.allowedProducts.includes(
            variant,
          )
        : true;

    if (
      !validCategory ||
      !validVariant
    ) {
      throw new BadRequestException(
        "Product must be دجاج اللحم or الديك الرومي",
      );
    }
  }

  // =========================================================
  // NET WEIGHT VALIDATION
  // =========================================================

  private validateNetWeight(
    netWeight?: string,
  ) {
    if (
      !netWeight ||
      !netWeight.trim()
    ) {
      throw new BadRequestException(
        "Net weight is required",
      );
    }

    if (
      netWeight.trim().length >
      50
    ) {
      throw new BadRequestException(
        "Invalid net weight",
      );
    }
  }

  // =========================================================
  // GET FARMER
  // =========================================================

  private async getFarmer(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    if (
      user.role !==
      UserRole.FARMER
    ) {
      throw new ForbiddenException(
        "Only breeders have farms",
      );
    }

    return user;
  }

  // =========================================================
  // HIDE PRIVATE FARM INFORMATION
  // =========================================================

  private hidePrivateFarmInfo(
    listing: any,
  ) {
    if (!listing) {
      return listing;
    }

    return {
      ...listing,

      address: null,

      latitude: null,

      longitude: null,

      farmLink: null,

      farmer:
        listing.farmer
          ? {
              ...listing.farmer,

              phone: null,

              latitude: null,

              longitude: null,
            }
          : null,
    };
  }

  // =========================================================
  // GET MY FARMS
  // =========================================================

  async getMyFarms(
    userId: string,
  ) {
    await this.getFarmer(
      userId,
    );

    return this.prisma.farm.findMany({
      where: {
        farmerId:
          userId,
      },

      select: {
        id: true,

        name: true,

        stockTons: true,

        createdAt: true,

        updatedAt: true,

        _count: {
          select: {
            listings:
              true,
          },
        },
      },

      orderBy: {
        createdAt:
          "asc",
      },
    });
  }

  // =========================================================
  // CREATE FARM
  // =========================================================

  async createFarm(
    userId: string,
    dto: CreateFarmDto,
  ) {
    await this.getFarmer(
      userId,
    );

    const name =
      String(
        dto.name ?? "",
      ).trim();

    if (!name) {
      throw new BadRequestException(
        "Farm name is required",
      );
    }

    const stockTons =
      Number(
        dto.stockTons,
      );

    if (
      !Number.isFinite(
        stockTons,
      ) ||
      stockTons < 0
    ) {
      throw new BadRequestException(
        "Invalid farm stock",
      );
    }

    const farms =
      await this.prisma.farm.findMany({
        where: {
          farmerId:
            userId,
        },

        select: {
          id: true,
          name: true,
        },
      });

    const duplicate =
      farms.some(
        (farm) =>
          farm.name
            .trim()
            .toLowerCase() ===
          name
            .trim()
            .toLowerCase(),
      );

    if (duplicate) {
      throw new BadRequestException(
        "Farm name already exists",
      );
    }

    return this.prisma.farm.create({
      data: {
        farmerId:
          userId,

        name,

        stockTons:
          this.roundTo2(
            stockTons,
          ),
      },

      select: {
        id: true,

        name: true,

        stockTons: true,

        createdAt: true,

        updatedAt: true,
      },
    });
  }

  // =========================================================
  // UPDATE FARM
  // =========================================================

  async updateFarm(
    userId: string,
    farmId: string,
    dto: UpdateFarmDto,
  ) {
    await this.getFarmer(
      userId,
    );

    const farm =
      await this.prisma.farm.findFirst({
        where: {
          id:
            farmId,

          farmerId:
            userId,
        },
      });

    if (!farm) {
      throw new NotFoundException(
        "Farm not found",
      );
    }

    let nextName:
      string | undefined =
      undefined;

    if (
      dto.name !== undefined
    ) {
      nextName =
        dto.name.trim();

      if (!nextName) {
        throw new BadRequestException(
          "Farm name is required",
        );
      }

      const otherFarms =
        await this.prisma.farm.findMany({
          where: {
            farmerId:
              userId,

            id: {
              not:
                farmId,
            },
          },

          select: {
            name: true,
          },
        });

      const duplicate =
        otherFarms.some(
          (item) =>
            item.name
              .trim()
              .toLowerCase() ===
            nextName!
              .trim()
              .toLowerCase(),
        );

      if (duplicate) {
        throw new BadRequestException(
          "Farm name already exists",
        );
      }
    }

    let nextStock:
      number | undefined =
      undefined;

    if (
      dto.stockTons !==
      undefined
    ) {
      nextStock =
        Number(
          dto.stockTons,
        );

      if (
        !Number.isFinite(
          nextStock,
        ) ||
        nextStock < 0
      ) {
        throw new BadRequestException(
          "Invalid farm stock",
        );
      }

      nextStock =
        this.roundTo2(
          nextStock,
        );
    }

    return this.prisma.farm.update({
      where: {
        id:
          farmId,
      },

      data: {
        name:
          nextName,

        stockTons:
          nextStock,
      },

      select: {
        id: true,

        name: true,

        stockTons: true,

        createdAt: true,

        updatedAt: true,

        _count: {
          select: {
            listings:
              true,
          },
        },
      },
    });
  }

  // =========================================================
  // DELETE FARM
  // =========================================================

  async deleteFarm(
    userId: string,
    farmId: string,
  ) {
    await this.getFarmer(
      userId,
    );

    const farm =
      await this.prisma.farm.findFirst({
        where: {
          id:
            farmId,

          farmerId:
            userId,
        },

        include: {
          _count: {
            select: {
              listings:
                true,
            },
          },
        },
      });

    if (!farm) {
      throw new NotFoundException(
        "Farm not found",
      );
    }

    if (
      farm._count.listings >
      0
    ) {
      throw new BadRequestException(
        "Cannot delete a farm that has listings",
      );
    }

    await this.prisma.farm.delete({
      where: {
        id:
          farmId,
      },
    });

    return {
      message:
        "Farm deleted successfully",
    };
  }

  // =========================================================
  // CREATE LISTING
  // =========================================================

  async createListing(
    userId: string,
    dto: CreateListingDto,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id:
            userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    if (
      user.role !==
      UserRole.FARMER
    ) {
      throw new ForbiddenException(
        "Only breeders can create listings",
      );
    }

    if (
      user.approvalStatus !==
      ApprovalStatus.APPROVED
    ) {
      throw new ForbiddenException(
        "Your account is not approved yet",
      );
    }

    // =======================================================
    // FARM
    // =======================================================

    const farm =
      await this.prisma.farm.findFirst({
        where: {
          id:
            dto.farmId,

          farmerId:
            userId,
        },
      });

    if (!farm) {
      throw new BadRequestException(
        "Invalid farm",
      );
    }

    // =======================================================
    // QUANTITY + PRICE
    // =======================================================

    if (
      dto.quantityKg <=
        0 ||
      dto.pricePerKg <=
        0
    ) {
      throw new BadRequestException(
        "Quantity and price must be greater than 0",
      );
    }

    this.validateProduct(
      dto.category,
      dto.variant,
    );

    this.validateNetWeight(
      dto.netWeight,
    );

    const totalStockValue =
      this.calculateTotalStockValue(
        dto.quantityKg,
        dto.pricePerKg,
      );

    // =======================================================
    // CREATE
    // =======================================================

    return this.prisma.listing.create({
      data: {
        farmerId:
          userId,

        farmId:
          farm.id,

        title:
          dto.title.trim(),

        category:
          dto.category.trim(),

        variant:
          dto.variant.trim(),

        description:
          dto.description?.trim(),

        netWeight:
          dto.netWeight.trim(),

        quantityKg:
          dto.quantityKg,

        availableKg:
          dto.quantityKg,

        pricePerKg:
          dto.pricePerKg,

        totalStockValue,

        city:
          dto.city.trim(),

        address:
          dto.address?.trim(),

        latitude:
          dto.latitude,

        longitude:
          dto.longitude,

        farmLink:
          dto.farmLink
            ?.trim() ||
          null,

        isGpsEnabled:
          dto.isGpsEnabled ??
          true,

        status:
          ListingStatus.ACTIVE,
      },

      include: {
        farm: {
          select: {
            id: true,
            name: true,
            stockTons: true,
          },
        },

        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            latitude: true,
            longitude: true,
            approvalStatus:
              true,
          },
        },

        images:
          true,
      },
    });
  }

  // =========================================================
  // GET ALL PUBLIC LISTINGS
  // =========================================================

  async getAllListings(
    query: {
      city?: string;
      category?: string;
      variant?: string;
      latitude?: number;
      longitude?: number;
      maxDistanceKm?: number;
    },
  ) {
    if (
      query.category
    ) {
      this.validateProduct(
        query.category,
        undefined,
      );
    }

    if (
      query.variant
    ) {
      this.validateProduct(
        undefined,
        query.variant,
      );
    }

    const listings =
      await this.prisma.listing.findMany({
        where: {
          status:
            ListingStatus.ACTIVE,

          availableKg: {
            gt: 0,
          },

          city:
            query.city ||
            undefined,

          category:
            query.category ||
            undefined,

          variant:
            query.variant ||
            undefined,
        },

        include: {
          farm: {
            select: {
              id: true,
              name: true,
            },
          },

          farmer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              city: true,
              latitude: true,
              longitude: true,
              approvalStatus:
                true,
            },
          },

          images:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      });

    if (
      query.latitude ===
        undefined ||
      query.longitude ===
        undefined
    ) {
      return listings.map(
        (listing) =>
          this.hidePrivateFarmInfo(
            listing,
          ),
      );
    }

    const withDistance =
      listings.map(
        (listing) => {
          const distanceKm =
            this.calculateDistanceKm(
              query.latitude!,
              query.longitude!,
              listing.latitude,
              listing.longitude,
            );

          return {
            ...listing,
            distanceKm,
          };
        },
      );

    const filtered =
      query.maxDistanceKm !==
      undefined
        ? withDistance.filter(
            (item) =>
              item.distanceKm <=
              query.maxDistanceKm!,
          )
        : withDistance;

    return filtered
      .sort(
        (a, b) =>
          a.distanceKm -
          b.distanceKm,
      )
      .map(
        (listing) =>
          this.hidePrivateFarmInfo(
            listing,
          ),
      );
  }

  // =========================================================
  // FARMER OWN LISTINGS
  // =========================================================

  async getMyListings(
    userId: string,
  ) {
    return this.prisma.listing.findMany({
      where: {
        farmerId:
          userId,
      },

      include: {
        farm: {
          select: {
            id: true,
            name: true,
            stockTons: true,
          },
        },

        images:
          true,
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });
  }

  // =========================================================
  // GET PUBLIC LISTING
  // =========================================================

  async getListingById(
    id: string,
  ) {
    const listing =
      await this.prisma.listing.findUnique({
        where: {
          id,
        },

        include: {
          farm: {
            select: {
              id: true,
              name: true,
            },
          },

          farmer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              city: true,
              latitude: true,
              longitude: true,
              approvalStatus:
                true,
            },
          },

          images:
            true,
        },
      });

    if (!listing) {
      throw new NotFoundException(
        "Listing not found",
      );
    }

    return this.hidePrivateFarmInfo(
      listing,
    );
  }

  // =========================================================
  // UPDATE MY LISTING
  // =========================================================

  async updateMyListing(
    userId: string,
    listingId: string,
    dto: UpdateListingDto,
  ) {
    const listing =
      await this.prisma.listing.findUnique({
        where: {
          id:
            listingId,
        },
      });

    if (!listing) {
      throw new NotFoundException(
        "Listing not found",
      );
    }

    if (
      listing.farmerId !==
      userId
    ) {
      throw new ForbiddenException(
        "You cannot update this listing",
      );
    }

    this.validateProduct(
      dto.category,
      dto.variant,
    );

    if (
      dto.netWeight !==
      undefined
    ) {
      this.validateNetWeight(
        dto.netWeight,
      );
    }

    const quantityKg =
      dto.quantityKg ??
      listing.quantityKg;

    const pricePerKg =
      dto.pricePerKg ??
      Number(
        listing.pricePerKg,
      );

    if (
      quantityKg <=
        0 ||
      pricePerKg <=
        0
    ) {
      throw new BadRequestException(
        "Quantity and price must be greater than 0",
      );
    }

    const totalStockValue =
      this.calculateTotalStockValue(
        quantityKg,
        pricePerKg,
      );

    let nextStatus =
      listing.status;

    if (
      dto.availableKg !==
      undefined
    ) {
      nextStatus =
        dto.availableKg <=
        0
          ? ListingStatus.OUT_OF_STOCK
          : ListingStatus.ACTIVE;
    }

    return this.prisma.listing.update({
      where: {
        id:
          listingId,
      },

      data: {
        title:
          dto.title,

        category:
          dto.category,

        variant:
          dto.variant,

        description:
          dto.description,

        netWeight:
          dto.netWeight,

        quantityKg:
          dto.quantityKg,

        availableKg:
          dto.availableKg,

        pricePerKg:
          dto.pricePerKg,

        totalStockValue,

        city:
          dto.city,

        address:
          dto.address,

        latitude:
          dto.latitude,

        longitude:
          dto.longitude,

        farmLink:
          dto.farmLink,

        isGpsEnabled:
          dto.isGpsEnabled,

        status:
          nextStatus,
      },

      include: {
        farm: {
          select: {
            id: true,
            name: true,
            stockTons: true,
          },
        },

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

        images:
          true,
      },
    });
  }

  // =========================================================
  // DEACTIVATE
  // =========================================================

  async deactivateMyListing(
    userId: string,
    listingId: string,
  ) {
    const listing =
      await this.prisma.listing.findUnique({
        where: {
          id:
            listingId,
        },
      });

    if (!listing) {
      throw new NotFoundException(
        "Listing not found",
      );
    }

    if (
      listing.farmerId !==
      userId
    ) {
      throw new ForbiddenException(
        "You cannot deactivate this listing",
      );
    }

    return this.prisma.listing.update({
      where: {
        id:
          listingId,
      },

      data: {
        status:
          ListingStatus.INACTIVE,
      },
    });
  }

  // =========================================================
  // DELETE
  // =========================================================

  async deleteMyListing(
    userId: string,
    listingId: string,
  ) {
    const listing =
      await this.prisma.listing.findUnique({
        where: {
          id:
            listingId,
        },
      });

    if (!listing) {
      throw new NotFoundException(
        "Listing not found",
      );
    }

    if (
      listing.farmerId !==
      userId
    ) {
      throw new ForbiddenException(
        "You cannot delete this listing",
      );
    }

    await this.prisma.listing.delete({
      where: {
        id:
          listingId,
      },
    });

    return {
      message:
        "Listing deleted successfully",
    };
  }
}