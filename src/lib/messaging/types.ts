export interface IncomingMessage {
  from: string;
  body: string;
  timestamp: number;
  businessId: string;
}

export interface OutgoingMessage {
  to: string;
  body: string;
}

export enum SessionStatus {
  DISCONNECTED = 'DISCONNECTED',
  INITIALIZING = 'INITIALIZING',
  WAITING_FOR_QR = 'WAITING_FOR_QR',
  WAITING_FOR_PAIRING = 'WAITING_FOR_PAIRING',
  AUTHENTICATING = 'AUTHENTICATING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  RECONNECTING = 'RECONNECTING',
}

export interface IMessagingAdapter {
  initialize(businessId: string): Promise<void>;
  requestPairingCode(phoneNumber: string): Promise<string | null>;
  sendMessage(params: OutgoingMessage): Promise<void>;
  onMessage(callback: (msg: IncomingMessage) => void): void;
  getQR(): Promise<string | null>;
  getPairingCode(): Promise<string | null>;
  getSessionStatus(): Promise<SessionStatus>;
  disconnect(): Promise<void>;
}
