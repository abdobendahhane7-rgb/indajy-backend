import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateOrderStatusDto {
  @IsIn(["ACCEPTED", "REJECTED", "COMPLETED"])
  status!: "ACCEPTED" | "REJECTED" | "COMPLETED";

  @IsOptional()
  @IsString()
  note?: string;
}