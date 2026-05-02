import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

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
  @IsNumber()
  @Min(0.1)
  quantityKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  availableKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  pricePerKg?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isGpsEnabled?: boolean;
}