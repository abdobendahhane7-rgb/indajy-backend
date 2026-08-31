import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { UserRole } from "@prisma/client";

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
  // CREATE / UPDATE MY DOCUMENTS
  // =========================================================

  async upsertMyDocuments(
    userId: string,
    body: any,
  ) {
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

    // ADMIN ma kay7tajch documents
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        "Admin does not need documents",
      );
    }

    const data: any = {
      cinUrl:
        body.cinUrl || null,

      onssaUrl:
        body.onssaUrl || null,

      // Legal license ma bqat required
      legalUrl:
        null,

      driverUrl:
        null,

      vehicleUrl:
        null,
    };

    // =======================================================
    // FARMER
    // Required:
    // CIN + ONSSA
    // =======================================================

    if (user.role === UserRole.FARMER) {
      if (
        !data.cinUrl ||
        !data.onssaUrl
      ) {
        throw new BadRequestException(
          "Farmer must upload CIN and ONSSA",
        );
      }

      data.driverUrl = null;
      data.vehicleUrl = null;
    }

    // =======================================================
    // DISTRIBUTOR
    // Required:
    // CIN + ONSSA + Driving license + Vehicle registration
    // =======================================================

    if (
      user.role ===
      UserRole.DISTRIBUTOR
    ) {
      data.driverUrl =
        body.driverUrl || null;

      data.vehicleUrl =
        body.vehicleUrl || null;

      if (
        !data.cinUrl ||
        !data.onssaUrl ||
        !data.driverUrl ||
        !data.vehicleUrl
      ) {
        throw new BadRequestException(
          "Distributor must upload CIN, ONSSA, driving license and vehicle registration",
        );
      }
    }

    // =======================================================
    // EXISTING DOCUMENTS
    // =======================================================

    const existingDocs =
      await this.prisma.userDocument.findFirst({
        where: {
          userId,
        },
      });

    let result;

    if (existingDocs) {
      result =
        await this.prisma.userDocument.update({
          where: {
            id: existingDocs.id,
          },
          data,
        });
    } else {
      result =
        await this.prisma.userDocument.create({
          data: {
            userId,
            ...data,
          },
        });
    }

    // =======================================================
    // RESET APPROVAL TO PENDING
    // =======================================================

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        approvalStatus:
          "PENDING",
      },
    });

    return result;
  }
}