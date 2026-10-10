import { IMessagingAdapter, IncomingMessage, OutgoingMessage, SessionStatus } from './types';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';

export class WhatsAppWebAdapter implements IMessagingAdapter {
  private client: Client | null = null;
  private businessId: string | null = null;
  private status: SessionStatus = SessionStatus.DISCONNECTED;

  async initialize(businessId: string): Promise<void> {
    this.businessId = businessId;
    this.status = SessionStatus.INITIALIZING;

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: businessId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', async (qr) => {
      this.status = SessionStatus.WAITING_FOR_QR;
      // In a real app, we'd emit this via Socket.io
      console.log(`QR for ${businessId}: ${qr}`);
    });

    this.client.on('ready', () => {
      this.status = SessionStatus.CONNECTED;
      console.log(`Client ${businessId} is ready`);
    });

    this.client.on('authenticated', () => {
      this.status = SessionStatus.AUTHENTICATING;
    });

    this.client.on('auth_failure', () => {
      this.status = SessionStatus.ERROR;
    });

    await this.client.initialize();
  }

  async sendMessage({ to, body }: OutgoingMessage): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    const chatId = `${to}@c.us`;
    await this.client.sendMessage(chatId, body);
  }

  onMessage(callback: (msg: IncomingMessage) => void): void {
    if (!this.client) return;
    this.client.on('message', async (msg) => {
      callback({
        from: msg.from,
        body: msg.body,
        timestamp: msg.timestamp,
        businessId: this.businessId!,
      });
    });
  }

  async getQR(): Promise<string | null> {
    // This is a simplification. In reality, we'd capture the QR string from the 'qr' event.
    return null;
  }

  async getPairingCode(): Promise<string | null> {
    // Implementation for pairing code if supported by the lib version
    return null;
  }

  async getSessionStatus(): Promise<SessionStatus> {
    return this.status;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.status = SessionStatus.DISCONNECTED;
    }
  }
}
