import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ApprovalStatus, UserRole } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    city?: string;
    role: string;
  }) {
    const normalizedPhone = data.phone.trim();

    const normalizedEmail =
      data.email && data.email.trim().length > 0
        ? data.email.trim()
        : null;

    const existingByPhone = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingByPhone) {
      throw new BadRequestException("رقم الهاتف مستعمل من قبل.");
    }

    if (normalizedEmail) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingByEmail) {
        throw new BadRequestException("البريد الإلكتروني مستعمل من قبل.");
      }
    }

    const role =
      data.role.toUpperCase() === "DISTRIBUTOR"
        ? UserRole.DISTRIBUTOR
        : UserRole.FARMER;

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        passwordHash,
        role,
        city: data.city?.trim(),
        isActive: true,
        isVerified: false,
        approvalStatus: ApprovalStatus.PENDING,
        wallet: {
          create: {
            balance: "0",
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        city: true,
        approvalStatus: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return {
      message:
        "تم إنشاء الحساب بنجاح. الحساب غادي يبقى كيتسنى موافقة الإدارة.",
      user,
    };
  }

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        phone,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        city: true,
        passwordHash: true,
        isActive: true,
        approvalStatus: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Phone ولا password غلط.");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Phone ولا password غلط.");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      userId: user.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        city: user.city,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus,
      },
    };
  }
}