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
    const phone = String(body.phone || "").trim();
    const email = body.email?.trim() ? body.email.trim() : null;
    const fullName = String(body.fullName || "").trim();
    const password = String(body.password || "").trim();
    const city = body.city?.trim() ? body.city.trim() : null;
    const role = String(body.role || "").trim() as UserRole;

    if (!fullName || !phone || !password || !role) {
      throw new BadRequestException("Missing required fields");
    }

    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException("Invalid role");
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException("User already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName,
        phone,
        email,
        city,
        passwordHash,
        role,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        wallet: true,
        documents: true,
      },
    });

    return {
      message: "User registered successfully",
      user,
    };
  }

  async login(body: LoginDto) {
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "").trim();

    if (!identifier || !password) {
      throw new BadRequestException("identifier and password are required");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
      include: {
        wallet: true,
        documents: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
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