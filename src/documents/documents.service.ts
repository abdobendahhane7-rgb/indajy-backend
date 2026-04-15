import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

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
    originalName: string;
  }) {
    const normalizedRole =
      params.role.toUpperCase() === "DISTRIBUTOR"
        ? UserRole.DISTRIBUTOR
        : UserRole.FARMER;

    return this.prisma.userDocument.create({
      data: {
        userId: params.userId,
        role: normalizedRole,
        type: params.type,
        fileUrl: params.fileUrl,
        originalName: params.originalName,
        verificationStatus: "PENDING",
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
}