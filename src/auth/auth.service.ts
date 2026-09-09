import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PasswordResetStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // =========================================================
  // REGISTER
  // =========================================================

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

    if (
      role !== UserRole.FARMER &&
      role !== UserRole.DISTRIBUTOR
    ) {
      throw new BadRequestException("Invalid registration role");
    }

    let farmNames: string[] = [];

    if (role === UserRole.FARMER) {
      farmNames = (body.farmNames ?? [])
        .map((name) => String(name).trim())
        .filter((name) => name.length > 0);

      if (farmNames.length === 0) {
        throw new BadRequestException(
          "Farmer must provide at least one farm",
        );
      }

      const normalizedNames = farmNames.map((name) =>
        name.toLowerCase(),
      );

      const uniqueNames = new Set(normalizedNames);

      if (uniqueNames.size !== normalizedNames.length) {
        throw new BadRequestException(
          "Farm names must be unique",
        );
      }
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
        ...(role === UserRole.FARMER
          ? {
              farms: {
                create: farmNames.map((name) => ({ name })),
              },
            }
          : {}),
      },
      include: {
        wallet: true,
        documents: true,
        farms: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return {
      message: "User registered successfully",
      user,
    };
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async login(body: LoginDto) {
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "").trim();

    if (!identifier || !password) {
      throw new BadRequestException(
        "identifier and password are required",
      );
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
        farms: {
          orderBy: {
            createdAt: "asc",
          },
        },
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

  // =========================================================
  // FORGOT PASSWORD - FREE ADMIN APPROVAL FLOW
  // =========================================================

  async forgotPassword(body: ForgotPasswordDto) {
    const phone = String(body.phone || "").trim();

    if (!phone || phone.length < 8) {
      throw new BadRequestException("Invalid phone number");
    }

    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        role: true,
      },
    });

    // Important: return the same generic response even if the phone
    // does not exist, to reduce account-enumeration risk.
    if (!user || user.role === UserRole.ADMIN) {
      return {
        message:
          "If this phone is linked to an account, a password reset request has been created.",
      };
    }

    await this.prisma.passwordResetRequest.upsert({
      where: {
        userId: user.id,
      },
      update: {
        status: PasswordResetStatus.PENDING,
        codeHash: null,
        approvedAt: null,
        expiresAt: null,
        usedAt: null,
      },
      create: {
        userId: user.id,
        status: PasswordResetStatus.PENDING,
      },
    });

    return {
      message:
        "If this phone is linked to an account, a password reset request has been created.",
    };
  }

  // =========================================================
  // RESET PASSWORD WITH ADMIN-GENERATED CODE
  // =========================================================

  async resetPassword(body: ResetPasswordDto) {
    const phone = String(body.phone || "").trim();
    const code = String(body.code || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!phone || phone.length < 8) {
      throw new BadRequestException("Invalid phone number");
    }

    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException("Reset code must contain 6 digits");
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        "Password must contain at least 6 characters",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        passwordResetRequest: true,
      },
    });

    if (!user || !user.passwordResetRequest) {
      throw new BadRequestException(
        "Invalid or unavailable password reset request",
      );
    }

    const request = user.passwordResetRequest;

    if (
      request.status !== PasswordResetStatus.APPROVED ||
      !request.codeHash ||
      !request.expiresAt ||
      request.usedAt
    ) {
      throw new BadRequestException(
        "Password reset request is not approved",
      );
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: {
          status: PasswordResetStatus.REJECTED,
          codeHash: null,
        },
      });

      throw new BadRequestException(
        "Password reset code has expired",
      );
    }

    const validCode = await bcrypt.compare(
      code,
      request.codeHash,
    );

    if (!validCode) {
      throw new BadRequestException("Invalid password reset code");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
        },
      }),
      this.prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: {
          status: PasswordResetStatus.USED,
          codeHash: null,
          usedAt: new Date(),
        },
      }),
    ]);

    return {
      message: "Password updated successfully",
    };
  }
}
