import {
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({
  cors: { origin: "*" },
})
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;

  notifyUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit("notification", payload);
  }
}