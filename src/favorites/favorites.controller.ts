import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { FavoritesService } from "./favorites.service";

@Controller("favorites")
export class FavoritesController {
  constructor(private service: FavoritesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getMine(@CurrentUser() user: any) {
    return this.service.getMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("ids")
  ids(@CurrentUser() user: any) {
    return this.service.ids(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":listingId/toggle")
  toggle(@CurrentUser() user: any, @Param("listingId") listingId: string) {
    return this.service.toggle(user.id, listingId);
  }
}