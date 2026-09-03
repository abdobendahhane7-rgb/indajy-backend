import {
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

import {
  PostAudience,
} from "@prisma/client";

export class CreatePostDto {
  // Text optional:
  // post y9der ykon image only
  @IsOptional()
  @IsString()
  text?: string;

  // Image URL optional:
  // post y9der ykon text only
  @IsOptional()
  @IsString()
  imageUrl?: string;

  // ALL / FARMER / DISTRIBUTOR
  @IsEnum(PostAudience)
  audience!: PostAudience;
}