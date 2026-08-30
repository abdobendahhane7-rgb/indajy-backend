import "dotenv/config";

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger =
    new Logger(PrismaService.name);

  constructor() {
    const connectionString =
      process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is missing",
      );
    }

    const adapter = new PrismaPg({
      connectionString,
    });

    super({
      adapter,
    });
  }

  async onModuleInit() {
    try {
      this.logger.log(
        "Connecting to database...",
      );

      await this.$connect();

      this.logger.log(
        "Database connected successfully",
      );
    } catch (error) {
      this.logger.error(
        "Database connection failed",
      );

      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(
    app: any,
  ) {
    process.on(
      "beforeExit",
      async () => {
        await app.close();
      },
    );
  }
}