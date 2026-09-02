import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  ApprovalStatus,
  UserRole,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // =========================================================
  // GET MY DOCUMENTS
  // =========================================================

  async getMyDocuments(
    userId: string,
  ) {
    return this.prisma.userDocument.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // =========================================================
  // CREATE / REPLACE MY DOCUMENTS
  // =========================================================

  async upsertMyDocuments(
    userId: string,
    body: any,
  ) {
    // =======================================================
    // USER
    // =======================================================

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    // Admin ma kay7tajch documents
    if (
      user.role ===
      UserRole.ADMIN
    ) {
      throw new BadRequestException(
        "Admin does not need documents",
      );
    }

    // =======================================================
    // NORMALIZE DATA
    // =======================================================

    const cinUrl =
      typeof body.cinUrl === "string" &&
      body.cinUrl.trim()
        ? body.cinUrl.trim()
        : null;

    const onssaUrl =
      typeof body.onssaUrl === "string" &&
      body.onssaUrl.trim()
        ? body.onssaUrl.trim()
        : null;

    const driverUrl =
      typeof body.driverUrl === "string" &&
      body.driverUrl.trim()
        ? body.driverUrl.trim()
        : null;

    const vehicleUrl =
      typeof body.vehicleUrl === "string" &&
      body.vehicleUrl.trim()
        ? body.vehicleUrl.trim()
        : null;

    // =======================================================
    // FARMER
    // CIN + ONSSA
    // =======================================================

    if (
      user.role ===
      UserRole.FARMER
    ) {
      if (
        !cinUrl ||
        !onssaUrl
      ) {
        throw new BadRequestException(
          "Farmer must upload CIN and ONSSA",
        );
      }
    }

    // =======================================================
    // DISTRIBUTOR
    // CIN + ONSSA + DRIVER + VEHICLE
    // =======================================================

    if (
      user.role ===
      UserRole.DISTRIBUTOR
    ) {
      if (
        !cinUrl ||
        !onssaUrl ||
        !driverUrl ||
        !vehicleUrl
      ) {
        throw new BadRequestException(
          "Distributor must upload CIN, ONSSA, driving license and vehicle registration",
        );
      }
    }

    // =======================================================
    // PREPARE NEW DOCUMENTS
    // =======================================================

    const newDocuments = {
      userId,

      cinUrl,

      onssaUrl,

      // Legal license ma bqat required
      legalUrl: null,

      driverUrl:
        user.role ===
        UserRole.DISTRIBUTOR
          ? driverUrl
          : null,

      vehicleUrl:
        user.role ===
        UserRole.DISTRIBUTOR
          ? vehicleUrl
          : null,
    };

    // =======================================================
    // REPLACE OLD DOCUMENTS
    //
    // 1. Delete ALL previous DB document records
    // 2. Create one fresh record
    // 3. Reset approval to PENDING
    //
    // All in ONE transaction
    // =======================================================

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          // ===============================================
          // DELETE OLD DOCUMENT RECORDS
          // ===============================================

          await tx.userDocument.deleteMany({
            where: {
              userId,
            },
          });

          // ===============================================
          // CREATE ONLY NEW DOCUMENTS
          // ===============================================

          const created =
            await tx.userDocument.create({
              data:
                newDocuments,
            });

          // ===============================================
          // RESET USER APPROVAL
          // ===============================================

          await tx.user.update({
            where: {
              id: userId,
            },

            data: {
              approvalStatus:
                ApprovalStatus.PENDING,
            },
          });

          return created;
        },
      );

    return {
      message:
        "Documents submitted successfully",

      documents:
        result,

      approvalStatus:
        ApprovalStatus.PENDING,
    };
  }
}