import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub || payload.id;

      if (!client.data.userId) {
        client.disconnect();
        return;
      }

      client.join(`user:${client.data.userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      client.leave(`user:${client.data.userId}`);
    }
  }

  @SubscribeMessage("joinConversation")
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = client.data.userId;

    await this.chatService.checkConversationAccess(userId, body.conversationId);

    client.join(`conversation:${body.conversationId}`);

    const messages = await this.chatService.markMessagesAsRead(
      userId,
      body.conversationId,
    );

    this.server
      .to(`conversation:${body.conversationId}`)
      .emit("messagesSeen", {
        conversationId: body.conversationId,
        readerId: userId,
        messages,
      });

    return {
      ok: true,
      conversationId: body.conversationId,
    };
  }

  @SubscribeMessage("sendMessage")
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      conversationId: string;
      content: string;
    },
  ) {
    const userId = client.data.userId;

    const message = await this.chatService.sendMessage(
      userId,
      body.conversationId,
      body.content,
    );

    this.server
      .to(`conversation:${body.conversationId}`)
      .emit("newMessage", message);

    return message;
  }

  @SubscribeMessage("typing")
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;

    await this.chatService.checkConversationAccess(userId, body.conversationId);

    client.to(`conversation:${body.conversationId}`).emit("typing", {
      conversationId: body.conversationId,
      userId,
      isTyping: body.isTyping,
    });

    return { ok: true };
  }

  @SubscribeMessage("markSeen")
  async markSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = client.data.userId;

    const messages = await this.chatService.markMessagesAsRead(
      userId,
      body.conversationId,
    );

    this.server
      .to(`conversation:${body.conversationId}`)
      .emit("messagesSeen", {
        conversationId: body.conversationId,
        readerId: userId,
        messages,
      });

    return { ok: true };
  }
}