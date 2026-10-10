import { IMessagingAdapter, IncomingMessage, OutgoingMessage } from './types';
import { WhatsAppWebAdapter } from './whatsapp-web.adapter';

class MessagingManager {
  private adapters: Map<string, IMessagingAdapter> = new Map();

  async getAdapter(businessId: string): Promise<IMessagingAdapter> {
    if (this.adapters.has(businessId)) {
      return this.adapters.get(businessId)!;
    }

    const adapter = new WhatsAppWebAdapter();
    this.adapters.set(businessId, adapter);
    return adapter;
  }

  async send(businessId: string, to: string, body: string): Promise<void> {
    const adapter = await this.getAdapter(businessId);
    await adapter.sendMessage({ to, body });
  }

  setupGlobalListener(onMessage: (msg: IncomingMessage) => void): void {
    // In a real app, we'd iterate through all active adapters or use a centralized event bus
    // For the MVP, adapters are initialized on demand.
  }
}

export const messagingManager = new MessagingManager();
