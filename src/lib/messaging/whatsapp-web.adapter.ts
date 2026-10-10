import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode";
import { IMessagingAdapter, IncomingMessage, OutgoingMessage, SessionStatus } from "./types";

export class WhatsAppWebAdapter implements IMessagingAdapter {
  private client: Client | null = null;
  private businessId: string | null = null;
  private status: SessionStatus = SessionStatus.DISCONNECTED;
  private qrDataUrl: string | null = null;
  private pairingCode: string | null = null;
  private lastError: string | null = null;

  async initialize(businessId: string): Promise<void> {
    if (this.client && this.businessId === businessId && [SessionStatus.INITIALIZING, SessionStatus.WAITING_FOR_QR, SessionStatus.WAITING_FOR_PAIRING, SessionStatus.AUTHENTICATING, SessionStatus.CONNECTED, SessionStatus.RECONNECTING].includes(this.status)) return;
    if (this.client) await this.client.destroy().catch((error) => console.error("WhatsApp stale client cleanup failed", error));
    this.businessId = businessId;
    this.status = SessionStatus.INITIALIZING;
    this.lastError = null;
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: businessId, dataPath: process.env.WHATSAPP_SESSION_PATH || "./sessions" }),
      puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    });
    this.client = client;
    client.on("qr", async (qr) => {
      try { this.qrDataUrl = await qrcode.toDataURL(qr, { width: 280, margin: 1 }); this.status = SessionStatus.WAITING_FOR_QR; }
      catch (error) { this.lastError = "A QR code could not be generated."; this.status = SessionStatus.ERROR; console.error("WhatsApp QR generation failed", error); }
    });
    client.on("authenticated", () => { this.qrDataUrl = null; this.status = SessionStatus.AUTHENTICATING; });
    client.on("ready", () => { this.qrDataUrl = null; this.pairingCode = null; this.status = SessionStatus.CONNECTED; });
    client.on("auth_failure", (message) => { this.lastError = "WhatsApp could not verify this session. Reconnect and try again."; this.status = SessionStatus.ERROR; console.error("WhatsApp authentication failure", message); });
    client.on("disconnected", (reason) => { this.status = SessionStatus.DISCONNECTED; console.info("WhatsApp disconnected", reason); });
    client.on("message", (message) => {
      if (message.fromMe || message.isStatus) return;
      if (this.businessId) void this.deliverIncoming(message, this.businessId);
    });
    try { await client.initialize(); }
    catch (error) { this.status = SessionStatus.ERROR; this.lastError = "WhatsApp could not start. Check that Chromium is available on this server, then try again."; console.error("WhatsApp initialization failed", error); throw new Error(this.lastError); }
  }

  private async deliverIncoming(message: { from: string; body: string; timestamp: number }, businessId: string) {
    if (!this.incomingHandler) return;
    try { await this.incomingHandler({ from: message.from, body: message.body, timestamp: message.timestamp, businessId }); }
    catch (error) { console.error("Incoming WhatsApp message handling failed", error); }
  }
  private incomingHandler: ((msg: IncomingMessage) => Promise<void> | void) | null = null;
  onMessage(callback: (msg: IncomingMessage) => void): void { this.incomingHandler = callback; }

  async requestPairingCode(phoneNumber: string): Promise<string | null> {
    if (!this.client) throw new Error("Start the WhatsApp connection first.");
    const client = this.client as Client & { requestPairingCode?: (phoneNumber: string, showNotification?: boolean) => Promise<string> };
    if (!client.requestPairingCode) throw new Error("Phone-number pairing is not supported by this WhatsApp Web session. Use QR pairing instead.");
    const normalized = phoneNumber.replace(/\D/g, "");
    if (normalized.length < 8 || normalized.length > 15) throw new Error("Enter a valid phone number with country code.");
    try { this.status = SessionStatus.WAITING_FOR_PAIRING; this.pairingCode = await client.requestPairingCode(normalized, true); return this.pairingCode; }
    catch (error) { this.status = SessionStatus.ERROR; this.lastError = "We couldn't request a pairing code. Try QR pairing or reconnect."; console.error("WhatsApp pairing code request failed", error); throw new Error(this.lastError); }
  }
  async sendMessage({ to, body }: OutgoingMessage): Promise<void> {
    if (!this.client || this.status !== SessionStatus.CONNECTED) throw new Error("WhatsApp is not connected.");
    const chatId = to.includes("@") ? to : `${to.replace(/\D/g, "")}@c.us`;
    await this.client.sendMessage(chatId, body);
  }
  async getQR(): Promise<string | null> { return this.qrDataUrl; }
  async getPairingCode(): Promise<string | null> { return this.pairingCode; }
  async getSessionStatus(): Promise<SessionStatus> { return this.status; }
  getLastError(): string | null { return this.lastError; }
  async disconnect(): Promise<void> { if (this.client) { const client = this.client; this.client = null; await client.destroy(); } this.qrDataUrl = null; this.pairingCode = null; this.status = SessionStatus.DISCONNECTED; }
}
