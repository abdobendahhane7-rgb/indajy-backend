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
  CreateListingDto,
} from "./dto/create-listing.dto";

import {
  UpdateListingDto,
} from "./dto/update-listing.dto";

import {
  ListingsService,
} from "./listings.service";

@Controller("listings")
export class ListingsController {
  constructor(
    private listingsService:
      ListingsService,
  ) {}

  // =========================================================
  // CREATE LISTING
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
  )
  @Post()
  createListing(
    @CurrentUser()
    user: any,

    @Body()
    dto: CreateListingDto,
  ) {
    return this.listingsService
      .createListing(
        user.id,
        dto,
      );
  }

  // =========================================================
  // GET MY FARMS
  // IMPORTANT: BEFORE :id
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
  )
  @Get("farms/me")
  getMyFarms(
    @CurrentUser()
    user: any,
  ) {
    return this.listingsService
      .getMyFarms(
        user.id,
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
    return this.listingsService
      .getAllListings({
        city,
        category,
        variant,

        latitude:
          latitude
            ? Number(
                latitude,
              )
            : undefined,

        longitude:
          longitude
            ? Number(
                longitude,
              )
            : undefined,

        maxDistanceKm:
          maxDistanceKm
            ? Number(
                maxDistanceKm,
              )
            : undefined,
      });
  }

  // =========================================================
  // MY LISTINGS
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
  )
  @Get("me")
  getMyListings(
    @CurrentUser()
    user: any,
  ) {
    return this.listingsService
      .getMyListings(
        user.id,
      );
  }

  // =========================================================
  // GET ONE
  // =========================================================

  @Get(":id")
  getListingById(
    @Param("id")
    id: string,
  ) {
    return this.listingsService
      .getListingById(
        id,
      );
  }

  // =========================================================
  // UPDATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
  )
  @Patch(":id")
  updateMyListing(
    @CurrentUser()
    user: any,

    @Param("id")
    id: string,

    @Body()
    dto: UpdateListingDto,
  ) {
    return this.listingsService
      .updateMyListing(
        user.id,
        id,
        dto,
      );
  }

  // =========================================================
  // DEACTIVATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
  )
  @Patch(":id/deactivate")
  deactivateMyListing(
    @CurrentUser()
    user: any,

    @Param("id")
    id: string,
  ) {
    return this.listingsService
      .deactivateMyListing(
        user.id,
        id,
      );
  }

  // =========================================================
  // DELETE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
  )
  @Delete(":id")
  deleteMyListing(
    @CurrentUser()
    user: any,

    @Param("id")
    id: string,
  ) {
    return this.listingsService
      .deleteMyListing(
        user.id,
        id,
      );
  }
}