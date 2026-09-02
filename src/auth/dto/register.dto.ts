import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
} from "class-validator";

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  password!: string;

  @IsString()
  role!: string;

  // غير للمربي
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({
    each: true,
  })
  farmNames?: string[];
}