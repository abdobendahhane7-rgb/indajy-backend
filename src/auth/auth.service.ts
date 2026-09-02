import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";

import {
  UserRole,
} from "@prisma/client";

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

  // =========================================================
  // REGISTER
  // =========================================================

  async register(
    body: RegisterDto,
  ) {
    final: {
    }

    const phone =
      String(
        body.phone || "",
      ).trim();

    const email =
      body.email?.trim()
        ? body.email.trim()
        : null;

    const fullName =
      String(
        body.fullName || "",
      ).trim();

    const password =
      String(
        body.password || "",
      ).trim();

    const city =
      body.city?.trim()
        ? body.city.trim()
        : null;

    const role =
      String(
        body.role || "",
      ).trim() as UserRole;

    // =======================================================
    // BASIC VALIDATION
    // =======================================================

    if (
      !fullName ||
      !phone ||
      !password ||
      !role
    ) {
      throw new BadRequestException(
        "Missing required fields",
      );
    }

    // Public registration:
    // FARMER + DISTRIBUTOR only
    if (
      role !== UserRole.FARMER &&
      role !== UserRole.DISTRIBUTOR
    ) {
      throw new BadRequestException(
        "Invalid registration role",
      );
    }

    // =======================================================
    // FARM NAMES
    // =======================================================

    let farmNames:
      string[] = [];

    if (
      role === UserRole.FARMER
    ) {
      farmNames = (
        body.farmNames ?? []
      )
        .map(
          (name) =>
            String(name).trim(),
        )
        .filter(
          (name) =>
            name.length > 0,
        );

      if (
        farmNames.length === 0
      ) {
        throw new BadRequestException(
          "Farmer must provide at least one farm",
        );
      }

      const normalizedNames =
        farmNames.map(
          (name) =>
            name.toLowerCase(),
        );

      const uniqueNames =
        new Set(
          normalizedNames,
        );

      if (
        uniqueNames.size !==
        normalizedNames.length
      ) {
        throw new BadRequestException(
          "Farm names must be unique",
        );
      }
    }

    // =======================================================
    // CHECK EXISTING USER
    // =======================================================

    const existingUser =
      await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              phone,
            },

            ...(
              email
                ? [
                    {
                      email,
                    },
                  ]
                : []
            ),
          ],
        },
      });

    if (existingUser) {
      throw new BadRequestException(
        "User already exists",
      );
    }

    // =======================================================
    // HASH PASSWORD
    // =======================================================

    const passwordHash =
      await bcrypt.hash(
        password,
        10,
      );

    // =======================================================
    // CREATE USER
    // =======================================================

    const user =
      await this.prisma.user.create({
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

          // FARMER ONLY
          ...(role ===
          UserRole.FARMER
            ? {
                farms: {
                  create:
                    farmNames.map(
                      (name) => ({
                        name,
                      }),
                    ),
                },
              }
            : {}),
        },

        include: {
          wallet: true,
          documents: true,

          farms: {
            orderBy: {
              createdAt:
                "asc",
            },
          },
        },
      });

    return {
      message:
        "User registered successfully",

      user,
    };
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async login(
    body: LoginDto,
  ) {
    const identifier =
      String(
        body.identifier || "",
      ).trim();

    const password =
      String(
        body.password || "",
      ).trim();

    if (
      !identifier ||
      !password
    ) {
      throw new BadRequestException(
        "identifier and password are required",
      );
    }

    const user =
      await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              phone:
                identifier,
            },

            {
              email:
                identifier,
            },
          ],
        },

        include: {
          wallet: true,
          documents: true,

          farms: {
            orderBy: {
              createdAt:
                "asc",
            },
          },
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.passwordHash,
      );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    const access_token =
      this.jwtService.sign({
        userId:
          user.id,

        role:
          user.role,
      });

    return {
      access_token,
      user,
    };
  }
}