import {
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { role: string; type: string },
  ) {
    const fileUrl = `/uploads/${file.filename}`;

    return this.documentsService.uploadDocument({
      userId: req.user.userId,
      role: body.role,
      type: body.type,
      fileUrl,
      originalName: file.originalname,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("my-documents")
  async getMyDocuments(@Req() req: any) {
    return this.documentsService.getUserDocuments(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("pending-users")
  async getPendingUsersWithDocuments() {
    return this.documentsService.getPendingUsersWithDocuments();
  }
}