import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getMyDocuments(userId: string) {
    const docs = await this.prisma.userDocument.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
    });

    return docs;
  }

  async upsertMyDocuments(userId: string, body: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const existingDocs = await this.prisma.userDocument.findFirst({
      where: { userId },
    });

    if (existingDocs) {
      const updated = await this.prisma.userDocument.update({
        where: { id: existingDocs.id },
        data: {
          cinUrl: body.cinUrl,
          onssaUrl: body.onssaUrl,
          legalUrl: body.legalUrl,
          driverUrl: body.driverUrl,
          vehicleUrl: body.vehicleUrl,
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: "PENDING",
        },
      });

      return updated;
    }

    const created = await this.prisma.userDocument.create({
      data: {
        userId,
        cinUrl: body.cinUrl,
        onssaUrl: body.onssaUrl,
        legalUrl: body.legalUrl,
        driverUrl: body.driverUrl,
        vehicleUrl: body.vehicleUrl,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: "PENDING",
      },
    });

    return created;
  }
}