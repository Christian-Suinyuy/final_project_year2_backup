import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentBusinessId } from "@/lib/tenant";

const settingsSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), shopDescription: z.string().max(3000).optional(), phone: z.string().max(40).optional(), address: z.string().max(300).optional(), currency: z.string().length(3).optional(), timezone: z.string().max(60).optional(), openingHours: z.record(z.string(), z.unknown()).optional(), deliveryZones: z.array(z.object({ name: z.string().min(1).max(100), fee: z.number().nonnegative(), threshold: z.number().nonnegative().optional() })).optional(), deliveryEnabled: z.boolean().optional(), deliveryNotes: z.string().max(1000).optional(), paymentMethods: z.array(z.string().max(80)).optional(), policies: z.string().max(5000).optional(), welcomeMessage: z.string().max(1000).optional(), aiName: z.string().max(60).optional(), aiTone: z.string().max(100).optional(), aiInstructions: z.string().max(2000).optional() });

export async function GET() {
  try {
    const businessId = await currentBusinessId();
    if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
    const business = await prisma.business.findUnique({ where: { id: businessId }, include: { settings: true } });
    return NextResponse.json({ business });
  } catch (error) {
    console.error("Business read failed", error);
    return NextResponse.json({ message: "We couldn't load your shop details." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const businessId = await currentBusinessId();
    if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Some settings need attention before saving.", issues: parsed.error.issues }, { status: 400 });
    const { name, ...settings } = parsed.data;
    const business = await prisma.$transaction(async (tx) => {
      if (name) await tx.business.update({ where: { id: businessId }, data: { name } });
      const safeSettings = { ...settings } as Record<string, unknown>;
      const updatedSettings = await tx.businessSettings.upsert({ where: { businessId }, create: { businessId, openingHours: {}, deliveryZones: [], policies: "", welcomeMessage: "", ...safeSettings }, update: safeSettings });
      return { ...(await tx.business.findUniqueOrThrow({ where: { id: businessId } })), settings: updatedSettings };
    });
    return NextResponse.json({ business });
  } catch (error) {
    console.error("Business update failed", error);
    return NextResponse.json({ message: "We couldn't save your shop settings. Please try again." }, { status: 500 });
  }
}
