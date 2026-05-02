import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateListingDto {
  @IsString()
  title!: string;

  @IsString()
  category!: string;

  @IsString()
  variant!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.1)
  quantityKg!: number;

  @IsNumber()
  @Min(0.1)
  pricePerKg!: number;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsBoolean()
  isGpsEnabled?: boolean;
}