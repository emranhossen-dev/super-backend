import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcast real-time notification to all connected clients (Admin Panel)
   */
  sendNotification(notification: {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    type: 'order' | 'stock' | 'system';
  }) {
    this.server.emit('notification', notification);
    this.logger.log(`Broadcasted notification: ${notification.title}`);
  }
}
