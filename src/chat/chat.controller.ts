import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ChatService } from "./chat.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("conversation")
  createConversation(@Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(dto);
  }

  @Get("conversations")
  getMyConversations(@Req() req: any) {
    return this.chatService.getMyConversations(req.user.userId);
  }

  @Get("unread-count")
  unreadCount(@Req() req: any) {
    return this.chatService.unreadCount(req.user.userId);
  }

  @Get("conversations/:id/messages")
  getConversationMessages(@Req() req: any, @Param("id") id: string) {
    return this.chatService.getConversationMessages(req.user.userId, id);
  }

  @Post("conversations/:id/messages")
  sendMessage(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.userId, id, dto.text);
  }

  @Patch("conversations/:id/read")
  markConversationAsRead(@Req() req: any, @Param("id") id: string) {
    return this.chatService.markConversationAsRead(req.user.userId, id);
  }
}