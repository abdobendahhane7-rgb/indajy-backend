import { IsIn, IsOptional, IsString } from "class-validator";

export class UploadDocumentsDto {
  @IsIn(["FARMER", "DISTRIBUTOR"])
  role!: "FARMER" | "DISTRIBUTOR";

  @IsOptional()
  @IsString()
  cinUrl?: string;

  @IsOptional()
  @IsString()
  onssaUrl?: string;

  @IsOptional()
  @IsString()
  legalUrl?: string;

  @IsOptional()
  @IsString()
  driverUrl?: string;

  @IsOptional()
  @IsString()
  vehicleUrl?: string;
}