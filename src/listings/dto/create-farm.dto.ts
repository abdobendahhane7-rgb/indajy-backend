import {
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

import {
  Type,
} from "class-transformer";

export class CreateFarmDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockTons!: number;
}