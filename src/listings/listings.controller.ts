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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { ListingsService } from "./listings.service";

@Controller("listings")
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createListing(@CurrentUser() user: any, @Body() dto: CreateListingDto) {
    return this.listingsService.createListing(user.id, dto);
  }

  @Get()
  getAllListings(
    @Query("city") city?: string,
    @Query("category") category?: string,
    @Query("variant") variant?: string,
    @Query("latitude") latitude?: string,
    @Query("longitude") longitude?: string,
    @Query("maxDistanceKm") maxDistanceKm?: string,
  ) {
    return this.listingsService.getAllListings({
      city,
      category,
      variant,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyListings(@CurrentUser() user: any) {
    return this.listingsService.getMyListings(user.id);
  }

  @Get(":id")
  getListingById(@Param("id") id: string) {
    return this.listingsService.getListingById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  updateMyListing(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.updateMyListing(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/deactivate")
  deactivateMyListing(@CurrentUser() user: any, @Param("id") id: string) {
    return this.listingsService.deactivateMyListing(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  deleteMyListing(@CurrentUser() user: any, @Param("id") id: string) {
    return this.listingsService.deleteMyListing(user.id, id);
  }
}