import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.appSetting.findFirst();

    if (!settings) {
      return this.prisma.appSetting.create({
        data: {
          operationFee: 10,
          rechargeFee: 0,
          minOrderKg: 1,
          isOrderingOpen: true,
        },
      });
    }

    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const settings = await this.prisma.appSetting.findFirst();

    if (!settings) {
      return this.prisma.appSetting.create({
        data: {
          operationFee: dto.operationFee ?? 10,
          rechargeFee: dto.rechargeFee ?? 0,
          minOrderKg: dto.minOrderKg ?? 1,
          isOrderingOpen: dto.isOrderingOpen ?? true,
        },
      });
    }

    return this.prisma.appSetting.update({
      where: { id: settings.id },
      data: {
        operationFee: dto.operationFee ?? undefined,
        rechargeFee: dto.rechargeFee ?? undefined,
        minOrderKg: dto.minOrderKg ?? undefined,
        isOrderingOpen: dto.isOrderingOpen ?? undefined,
      },
    });
  }
}