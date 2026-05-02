import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateOrderDto {
  @IsString()
  listingId!: string;

  @IsNumber()
  @Min(0.1)
  quantityKg!: number;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @IsOptional()
  @IsNumber()
  deliveryLat?: number;

  @IsOptional()
  @IsNumber()
  deliveryLng?: number;

  @IsOptional()
  @IsString()
  note?: string;
}