import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  JwtAuthGuard,
} from "../auth/jwt-auth.guard";

import {
  CurrentUser,
} from "../common/decorators/current-user.decorator";

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

import {
  ListingsService,
} from "./listings.service";

@Controller("listings")
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
  ) {}

  // =========================================================
  // CREATE LISTING
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Post()
  createListing(
    @CurrentUser() user: any,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.createListing(
      user.id,
      dto,
    );
  }

  // =========================================================
  // GET MY FARMS
  // IMPORTANT: BEFORE :id
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Get("farms/me")
  getMyFarms(
    @CurrentUser() user: any,
  ) {
    return this.listingsService.getMyFarms(
      user.id,
    );
  }

  // =========================================================
  // CREATE FARM
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Post("farms")
  createFarm(
    @CurrentUser() user: any,
    @Body() dto: CreateFarmDto,
  ) {
    return this.listingsService.createFarm(
      user.id,
      dto,
    );
  }

  // =========================================================
  // UPDATE FARM
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Patch("farms/:farmId")
  updateFarm(
    @CurrentUser() user: any,
    @Param("farmId") farmId: string,
    @Body() dto: UpdateFarmDto,
  ) {
    return this.listingsService.updateFarm(
      user.id,
      farmId,
      dto,
    );
  }

  // =========================================================
  // DELETE FARM
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Delete("farms/:farmId")
  deleteFarm(
    @CurrentUser() user: any,
    @Param("farmId") farmId: string,
  ) {
    return this.listingsService.deleteFarm(
      user.id,
      farmId,
    );
  }

  // =========================================================
  // GET ALL PUBLIC LISTINGS
  // =========================================================

  @Get()
  getAllListings(
    @Query("city")
    city?: string,

    @Query("category")
    category?: string,

    @Query("variant")
    variant?: string,

    @Query("latitude")
    latitude?: string,

    @Query("longitude")
    longitude?: string,

    @Query("maxDistanceKm")
    maxDistanceKm?: string,
  ) {
    return this.listingsService.getAllListings({
      city,
      category,
      variant,

      latitude:
        latitude !== undefined
          ? Number(latitude)
          : undefined,

      longitude:
        longitude !== undefined
          ? Number(longitude)
          : undefined,

      maxDistanceKm:
        maxDistanceKm !== undefined
          ? Number(maxDistanceKm)
          : undefined,
    });
  }

  // =========================================================
  // MY LISTINGS
  // IMPORTANT: BEFORE :id
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyListings(
    @CurrentUser() user: any,
  ) {
    return this.listingsService.getMyListings(
      user.id,
    );
  }

  // =========================================================
  // GET ONE
  // =========================================================

  @Get(":id")
  getListingById(
    @Param("id") id: string,
  ) {
    return this.listingsService.getListingById(
      id,
    );
  }

  // =========================================================
  // UPDATE LISTING
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  updateMyListing(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.updateMyListing(
      user.id,
      id,
      dto,
    );
  }

  // =========================================================
  // DEACTIVATE LISTING
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Patch(":id/deactivate")
  deactivateMyListing(
    @CurrentUser() user: any,
    @Param("id") id: string,
  ) {
    return this.listingsService.deactivateMyListing(
      user.id,
      id,
    );
  }

  // =========================================================
  // DELETE LISTING
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  deleteMyListing(
    @CurrentUser() user: any,
    @Param("id") id: string,
  ) {
    return this.listingsService.deleteMyListing(
      user.id,
      id,
    );
  }
}