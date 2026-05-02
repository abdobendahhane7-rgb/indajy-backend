import { IsOptional, IsString } from "class-validator";

export class CreateConversationDto {
  @IsString()
  otherUserId!: string;

  @IsOptional()
  @IsString()
  listingId?: string;
}