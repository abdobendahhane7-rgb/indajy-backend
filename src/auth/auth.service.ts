import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: body.phone },
          body.email ? { email: body.email } : {},
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException("User already exists");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: body.fullName,
        phone: body.phone,
        email: body.email,
        passwordHash,
        role: body.role as UserRole,
      },
    });

    return {
      message: "User registered successfully",
      user,
    };
  }

  async login(body: LoginDto) {
    if (!body || !body.identifier || !body.password) {
      throw new BadRequestException("identifier and password are required");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: body.identifier },
          { email: body.identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const access_token = this.jwtService.sign({
      userId: user.id,
      role: user.role,
    });

    return {
      access_token,
      user,
    };
  }
}