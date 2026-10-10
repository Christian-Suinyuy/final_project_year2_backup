import { IncomingMessage } from "./types";
import { WhatsAppWebAdapter } from "./whatsapp-web.adapter";

class MessagingManager {
  private adapters: Map<string, WhatsAppWebAdapter> = new Map();
  async getAdapter(businessId: string): Promise<WhatsAppWebAdapter> {
    const existing = this.adapters.get(businessId);
    if (existing) return existing;
    const adapter = new WhatsAppWebAdapter();
    this.adapters.set(businessId, adapter);
    return adapter;
  }
  async connect(businessId: string, onMessage: (message: IncomingMessage) => Promise<void> | void): Promise<WhatsAppWebAdapter> {
    const adapter = await this.getAdapter(businessId);
    adapter.onMessage(onMessage);
    await adapter.initialize(businessId);
    return adapter;
  }
  async send(businessId: string, to: string, body: string): Promise<void> {
    const adapter = await this.getAdapter(businessId);
    await adapter.sendMessage({ to, body });
  }
  async disconnect(businessId: string): Promise<void> {
    const adapter = this.adapters.get(businessId);
    if (adapter) { await adapter.disconnect(); this.adapters.delete(businessId); }
  }
  current(businessId: string): WhatsAppWebAdapter | undefined { return this.adapters.get(businessId); }
}

const globalMessaging = globalThis as typeof globalThis & { messagingManager?: MessagingManager };
export const messagingManager: MessagingManager = globalMessaging.messagingManager ?? new MessagingManager();
if (process.env.NODE_ENV !== "production") globalMessaging.messagingManager = messagingManager;
