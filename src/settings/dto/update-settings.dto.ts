import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  operationFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rechargeFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  withdrawalFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  minOrderKg?: number;

  @IsOptional()
  @IsBoolean()
  isOrderingOpen?: boolean;
}