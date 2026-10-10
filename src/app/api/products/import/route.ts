import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentBusinessId } from "@/lib/tenant";

const rowSchema = z.object({ name: z.string().trim().min(1).max(180), description: z.string().max(5000).default(""), price: z.coerce.number().nonnegative(), stock: z.coerce.number().int().nonnegative().default(0), category: z.string().max(100).default("General"), sku: z.string().max(80).optional().nullable().transform((value) => value?.trim() || null) });
const payloadSchema = z.object({ rows: z.array(z.unknown()).min(1).max(5000) });

export async function POST(request: Request) {
  try {
    const businessId = await currentBusinessId();
    if (!businessId) return NextResponse.json({ message: "Sign in and create a shop before importing products." }, { status: 401 });
    const body = payloadSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ message: "Choose a CSV containing at least one product." }, { status: 400 });
    const valid: z.infer<typeof rowSchema>[] = [];
    const errors: { row: number; message: string }[] = [];
    body.data.rows.forEach((row, index) => {
      const parsed = rowSchema.safeParse(row);
      if (parsed.success) valid.push(parsed.data);
      else errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => issue.message).join("; ") });
    });
    if (valid.length) {
      const shopSettings = await prisma.businessSettings.findUnique({ where: { businessId }, select: { currency: true } });
      const currency = shopSettings?.currency ?? "NGN";
      await prisma.$transaction(valid.map((row) => row.sku ? prisma.product.upsert({ where: { businessId_sku: { businessId, sku: row.sku } }, create: { ...row, currency, businessId }, update: { ...row, currency, active: true, businessId } }) : prisma.product.create({ data: { ...row, currency, businessId } })));
    }
    return NextResponse.json({ imported: valid.length, errors: errors.slice(0, 100), skipped: errors.length }, { status: 200 });
  } catch (error) {
    console.error("Catalogue import failed", error);
    return NextResponse.json({ message: "We couldn't import this file. No products were changed; please try again." }, { status: 500 });
  }
}
