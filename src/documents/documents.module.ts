import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { UploadModule } from "../upload/upload.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}