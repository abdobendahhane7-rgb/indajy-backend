import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post("conversation")
  createConversation(
    @CurrentUser() user: any,
    @Body()
    body: {
      otherUserId: string;
      listingId?: string;
    },
  ) {
    return this.chatService.createConversation(
      user.id,
      body.otherUserId,
      body.listingId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("conversations")
  getMyConversations(@CurrentUser() user: any) {
    return this.chatService.getMyConversations(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("conversation/:id/messages")
  getMessages(@CurrentUser() user: any, @Param("id") conversationId: string) {
    return this.chatService.getMessages(user.id, conversationId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("conversation/:id/message")
  sendMessage(
    @CurrentUser() user: any,
    @Param("id") conversationId: string,
    @Body() body: { content: string },
  ) {
    return this.chatService.sendMessage(
      user.id,
      conversationId,
      body.content,
    );
  }
}