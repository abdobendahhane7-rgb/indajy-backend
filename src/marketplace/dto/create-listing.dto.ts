import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  poultryType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  availableQuantity!: number;

  @IsNumberString()
  unitPrice!: string;

  @IsOptional()
  @IsNumberString()
  averageWeightKg?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsNumberString()
  latitude!: string;

  @IsNumberString()
  longitude!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}