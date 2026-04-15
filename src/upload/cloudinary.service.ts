import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(
    filePath: string,
    folder: string,
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: "image",
      });

      return result.secure_url;
    } catch (_) {
      throw new InternalServerErrorException("فشل رفع الصورة.");
    }
  }
}