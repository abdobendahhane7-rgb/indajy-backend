import { IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";

export class CreateTopupRequestDto {
  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  paymentProofUrl?: string;
}