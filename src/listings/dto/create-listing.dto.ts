import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateListingDto {
  @IsString()
  title!: string;

  @IsString()
  category!: string;

  @IsString()
  variant!: string;

  @IsString()
  description!: string;

  // مثال: 38-40/100
  @IsString()
  netWeight!: string;

  // الكمية الإجمالية المتوفرة فالفيرمة بالكيلو
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityKg!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  pricePerKg!: number;

  @IsString()
  city!: string;

  @IsString()
  address!: string;

  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  // رابط الفيرمة اختياري
  @IsOptional()
  @IsString()
  farmLink?: string;

  @IsOptional()
  @IsBoolean()
  isGpsEnabled?: boolean;
}