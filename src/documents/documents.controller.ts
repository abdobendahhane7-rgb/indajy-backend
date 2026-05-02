import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyDocuments(@CurrentUser() user: any) {
    return this.documentsService.getMyDocuments(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("me")
  upsertMyDocuments(@CurrentUser() user: any, @Body() body: any) {
    return this.documentsService.upsertMyDocuments(user.id, body);
  }
}