import { IsOptional, IsString } from "class-validator";

export class CreateConversationDto {
  @IsString()
  farmerId!: string;

  @IsString()
  distributorId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}