import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  note?: string;
}