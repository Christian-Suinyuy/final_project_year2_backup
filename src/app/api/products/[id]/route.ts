import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentBusinessId } from "@/lib/tenant";

const schema = z.object({ name: z.string().trim().min(1).max(180), description: z.string().max(5000).default(""), price: z.coerce.number().nonnegative(), stock: z.coerce.number().int().nonnegative(), category: z.string().max(100).default("General"), sku: z.string().max(80).optional().nullable().transform((value) => value?.trim() || null) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const businessId = await currentBusinessId();
  if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check the product details and try again." }, { status: 400 });
  try {
    const { id } = await context.params;
    const updated = await prisma.product.updateMany({ where: { id, businessId, active: true }, data: parsed.data });
    if (!updated.count) return NextResponse.json({ message: "We couldn't find this product in your shop." }, { status: 404 });
    const product = await prisma.product.findFirst({ where: { id, businessId } });
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product update failed", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ message: "That SKU is already in use in this shop." }, { status: 409 });
    return NextResponse.json({ message: "We couldn't update this product. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const businessId = await currentBusinessId();
  if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
  try {
    const { id } = await context.params;
    const result = await prisma.product.updateMany({ where: { id, businessId, active: true }, data: { active: false } });
    if (!result.count) return NextResponse.json({ message: "We couldn't find this product in your shop." }, { status: 404 });
    return NextResponse.json({ archived: true });
  } catch (error) {
    console.error("Product archive failed", error);
    return NextResponse.json({ message: "We couldn't remove this product. Please try again." }, { status: 500 });
  }
}
