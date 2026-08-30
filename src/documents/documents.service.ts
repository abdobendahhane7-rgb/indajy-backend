import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getMyDocuments(userId: string) {
    return this.prisma.userDocument.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async upsertMyDocuments(userId: string, body: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const data: any = {
      cinUrl: body.cinUrl || null,
      onssaUrl: body.onssaUrl || null,
      legalUrl: body.legalUrl || null,
      driverUrl: null,
      vehicleUrl: null,
    };

    if (user.role === UserRole.FARMER) {
      if (!data.cinUrl || !data.onssaUrl || !data.legalUrl) {
        throw new BadRequestException(
          "Farmer must upload CIN, ONSSA and legal license",
        );
      }

      data.driverUrl = null;
      data.vehicleUrl = null;
    }

    if (user.role === UserRole.DISTRIBUTOR) {
      data.driverUrl = body.driverUrl || null;
      data.vehicleUrl = body.vehicleUrl || null;

      if (
        !data.cinUrl ||
        !data.onssaUrl ||
        !data.legalUrl ||
        !data.driverUrl ||
        !data.vehicleUrl
      ) {
        throw new BadRequestException(
          "Distributor must upload CIN, ONSSA, legal license, driving license and vehicle registration",
        );
      }
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException("Admin does not need documents");
    }

    const existingDocs = await this.prisma.userDocument.findFirst({
      where: { userId },
    });

    let result;

    if (existingDocs) {
      result = await this.prisma.userDocument.update({
        where: { id: existingDocs.id },
        data,
      });
    } else {
      result = await this.prisma.userDocument.create({
        data: {
          userId,
          ...data,
        },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: "PENDING",
      },
    });

    return result;
  }
}