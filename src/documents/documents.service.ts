import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async uploadDocument(params: {
    userId: string;
    role: string;
    type: string;
    fileUrl: string;
  }) {
    const normalizedRole =
      params.role.toUpperCase() === "DISTRIBUTOR"
        ? UserRole.DISTRIBUTOR
        : UserRole.FARMER;

    const existing = await this.prisma.userDocument.findFirst({
      where: { userId: params.userId },
    });

    const type = params.type.toUpperCase();

    const dataToUpdate: {
      role: UserRole;
      cinUrl?: string;
      onssaUrl?: string;
      legalUrl?: string;
      driverUrl?: string;
      vehicleUrl?: string;
    } = {
      role: normalizedRole,
    };

    if (type === "CIN_FRONT" || type === "CIN_BACK" || type === "CIN") {
      dataToUpdate.cinUrl = params.fileUrl;
    } else if (type === "FARMER_PROOF" || type === "ONSSA") {
      dataToUpdate.onssaUrl = params.fileUrl;
    } else if (type === "LEGAL" || type === "LEGAL_PROOF") {
      dataToUpdate.legalUrl = params.fileUrl;
    } else if (type === "DRIVER" || type === "DRIVER_LICENSE") {
      dataToUpdate.driverUrl = params.fileUrl;
    } else if (type === "VEHICLE" || type === "VEHICLE_PROOF") {
      dataToUpdate.vehicleUrl = params.fileUrl;
    } else if (normalizedRole === UserRole.FARMER) {
      dataToUpdate.onssaUrl = params.fileUrl;
    } else {
      dataToUpdate.legalUrl = params.fileUrl;
    }

    if (existing) {
      return this.prisma.userDocument.update({
        where: { id: existing.id },
        data: dataToUpdate,
      });
    }

    return this.prisma.userDocument.create({
      data: {
        userId: params.userId,
        ...dataToUpdate,
      },
    });
  }

  async getUserDocuments(userId: string) {
    return this.prisma.userDocument.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getPendingUsersWithDocuments() {
    return this.prisma.user.findMany({
      where: {
        approvalStatus: "PENDING",
      },
      include: {
        userDocuments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getSingleUserDocument(userId: string) {
    const doc = await this.prisma.userDocument.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!doc) {
      throw new NotFoundException("الوثائق ما موجوداش.");
    }

    return doc;
  }
}