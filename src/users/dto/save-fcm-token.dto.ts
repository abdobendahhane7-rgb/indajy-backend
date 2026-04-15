import { IsNotEmpty, IsString } from "class-validator";

export class SaveFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;
}