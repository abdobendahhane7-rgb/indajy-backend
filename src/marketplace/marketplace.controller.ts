import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { MarketplaceService } from "./marketplace.service";
import { CreateListingDto } from "./dto/create-listing.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CloudinaryService } from "../upload/cloudinary.service";

@Controller("marketplace")
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("listings")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (_, file, cb) => {
          const unique = `${Date.now()}-${file.originalname}`;
          cb(null, unique);
        },
      }),
    }),
  )
  async createListing(
    @Req() req: any,
    @Body() createListingDto: CreateListingDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;

    if (image) {
      imageUrl = await this.cloudinaryService.uploadFile(
        image.path,
        "indajy/listings",
      );
    }

    return this.marketplaceService.createListing(
      req.user.userId,
      createListingDto,
      imageUrl,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("my-listings")
  getMyListings(@Req() req: any) {
    return this.marketplaceService.getMyListings(req.user.userId);
  }

  @Get("listings")
  getActiveListings() {
    return this.marketplaceService.getActiveListings();
  }
}