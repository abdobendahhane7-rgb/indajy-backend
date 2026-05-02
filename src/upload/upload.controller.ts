import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UploadService } from "./upload.service";

type MulterFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post("image")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadImage(@UploadedFile() file: MulterFile) {
    const result = await this.uploadService.uploadImage(file, "indajy/images");

    return {
      message: "Image uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
      type: result.resource_type,
      format: result.format,
      size: result.bytes,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("document")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadDocument(@UploadedFile() file: MulterFile) {
    const result = await this.uploadService.uploadDocument(
      file,
      "indajy/documents",
    );

    return {
      message: "Document uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
      type: result.resource_type,
      format: result.format,
      size: result.bytes,
    };
  }
}