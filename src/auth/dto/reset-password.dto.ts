import { IsString, Length, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
