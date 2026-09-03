import {
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

import {
  PostAudience,
} from "@prisma/client";

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(PostAudience)
  audience?: PostAudience;
}