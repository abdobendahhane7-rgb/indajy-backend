import { IsString, IsOptional } from "class-validator";

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  city?: string;

  @IsString()
  password!: string;

  @IsString()
  role!: string;
}