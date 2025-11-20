import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = [];
    this.messageHandlers = {
      notifications: [],
      broadcast: []
    };
  }

  connect(studentId, onConnect, onError) {
    if (this.connected) {
      console.log('WebSocket already connected');
      if (onConnect) onConnect();
      return;
    }

    try {
      // Create SockJS instance
      const socket = new SockJS('http://localhost:8080/ws');
      
      // Create STOMP client
      this.client = new Client({
        webSocketFactory: () => socket,
        debug: (str) => {
          console.log('STOMP: ' + str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      // Handle connection
      this.client.onConnect = (frame) => {
        console.log('✅ WebSocket Connected!', frame);
        this.connected = true;

        // Subscribe to user-specific notifications
        if (studentId) {
          const userSub = this.client.subscribe(
            `/queue/notifications/${studentId}`,
            (message) => {
              const notification = JSON.parse(message.body);
              console.log('📬 Personal notification received:', notification);
              this.handleNotification(notification);
            }
          );
          this.subscriptions.push(userSub);
        }

        // Subscribe to broadcast notifications
        const broadcastSub = this.client.subscribe(
          '/topic/notifications',
          (message) => {
            const notification = JSON.parse(message.body);
            console.log('📢 Broadcast notification received:', notification);
            this.handleBroadcast(notification);
          }
        );
        this.subscriptions.push(broadcastSub);

        if (onConnect) onConnect();
      };

      // Handle errors
      this.client.onStompError = (frame) => {
        console.error('❌ STOMP error:', frame);
        this.connected = false;
        if (onError) onError(frame);
      };

      // Handle disconnection
      this.client.onDisconnect = () => {
        console.log('🔌 WebSocket Disconnected');
        this.connected = false;
      };

      // Activate the client
      this.client.activate();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      if (onError) onError(error);
    }
  }

  disconnect() {
    if (this.client && this.connected) {
      // Unsubscribe from all subscriptions
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions = [];
      
      // Deactivate client
      this.client.deactivate();
      this.connected = false;
      console.log('WebSocket disconnected');
    }
  }

  // Register a handler for personal notifications
  onNotification(handler) {
    this.messageHandlers.notifications.push(handler);
  }

  // Register a handler for broadcast notifications
  onBroadcast(handler) {
    this.messageHandlers.broadcast.push(handler);
  }

  // Remove a notification handler
  offNotification(handler) {
    this.messageHandlers.notifications = this.messageHandlers.notifications.filter(
      h => h !== handler
    );
  }

  // Remove a broadcast handler
  offBroadcast(handler) {
    this.messageHandlers.broadcast = this.messageHandlers.broadcast.filter(
      h => h !== handler
    );
  }

  // Handle incoming personal notification
  handleNotification(notification) {
    this.messageHandlers.notifications.forEach(handler => {
      try {
        handler(notification);
      } catch (error) {
        console.error('Error in notification handler:', error);
      }
    });
  }

  // Handle incoming broadcast
  handleBroadcast(notification) {
    this.messageHandlers.broadcast.forEach(handler => {
      try {
        handler(notification);
      } catch (error) {
        console.error('Error in broadcast handler:', error);
      }
    });
  }

  isConnected() {
    return this.connected;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
