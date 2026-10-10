import { NextResponse } from "next/server";
import { z } from "zod";
import { currentBusinessId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { messagingManager } from "@/lib/messaging/manager";
import { SessionStatus } from "@/lib/messaging/types";
import { handleCustomerMessage } from "@/lib/commerce-agent";

export const runtime = "nodejs";
const connectSchema = z.object({ mode: z.enum(["qr", "phone"]).default("qr"), phoneNumber: z.string().optional() });

export async function GET() {
  try {
    const businessId = await currentBusinessId();
    if (!businessId) return NextResponse.json({ message: "Sign in and create a shop before connecting WhatsApp." }, { status: 401 });
    let adapter = messagingManager.current(businessId);
    if (!adapter) {
      const saved = await prisma.whatsAppSession.findUnique({ where: { businessId } });
      if (saved?.status === SessionStatus.CONNECTED || saved?.status === SessionStatus.RECONNECTING) {
        try { adapter = await messagingManager.connect(businessId, handleCustomerMessage); }
        catch { /* The status response below includes the recoverable error state. */ }
      }
    }
    const status = adapter ? await adapter.getSessionStatus() : SessionStatus.DISCONNECTED;
    const qr = adapter ? await adapter.getQR() : null;
    const pairingCode = adapter ? await adapter.getPairingCode() : null;
    const lastError = adapter?.getLastError() ?? null;
    if (adapter) await prisma.whatsAppSession.upsert({ where: { businessId }, create: { businessId, status, lastError }, update: { status, lastError, ...(status === SessionStatus.CONNECTED ? { lastSyncedAt: new Date() } : {}) } });
    return NextResponse.json({ status, qr, pairingCode, lastError });
  } catch (error) {
    console.error("WhatsApp status failed", error);
    return NextResponse.json({ message: "We couldn't check your WhatsApp connection." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const businessId = await currentBusinessId();
  if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
  const parsed = connectSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "Choose QR or phone-number pairing." }, { status: 400 });
  try {
    const adapter = await messagingManager.connect(businessId, handleCustomerMessage);
    if (parsed.data.mode === "phone") {
      if (!parsed.data.phoneNumber) return NextResponse.json({ message: "Enter the WhatsApp number including its country code." }, { status: 400 });
      await adapter.requestPairingCode(parsed.data.phoneNumber);
    }
    const status = await adapter.getSessionStatus();
    await prisma.whatsAppSession.upsert({ where: { businessId }, create: { businessId, status }, update: { status, lastError: null } });
    return NextResponse.json({ status, qr: await adapter.getQR(), pairingCode: await adapter.getPairingCode() }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp couldn't start. Please try again.";
    console.error("WhatsApp connect failed", error);
    await prisma.whatsAppSession.upsert({ where: { businessId }, create: { businessId, status: SessionStatus.ERROR, lastError: message }, update: { status: SessionStatus.ERROR, lastError: message } }).catch((dbError: unknown) => console.error("WhatsApp status persistence failed", dbError));
    return NextResponse.json({ message, status: SessionStatus.ERROR }, { status: 503 });
  }
}

export async function DELETE() {
  const businessId = await currentBusinessId();
  if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
  try {
    await messagingManager.disconnect(businessId);
    await prisma.whatsAppSession.upsert({ where: { businessId }, create: { businessId, status: SessionStatus.DISCONNECTED }, update: { status: SessionStatus.DISCONNECTED, lastError: null } });
    return NextResponse.json({ status: SessionStatus.DISCONNECTED });
  } catch (error) {
    console.error("WhatsApp disconnect failed", error);
    return NextResponse.json({ message: "We couldn't disconnect WhatsApp. Please try again." }, { status: 500 });
  }
}
