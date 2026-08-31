import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  netWeight?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  pricePerKg?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  farmLink?: string;

  @IsOptional()
  @IsBoolean()
  isGpsEnabled?: boolean;
}