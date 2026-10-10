import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentBusinessId } from "@/lib/tenant";

const productSchema = z.object({ name: z.string().trim().min(1).max(180), description: z.string().max(5000).default(""), price: z.coerce.number().nonnegative(), stock: z.coerce.number().int().nonnegative().default(0), category: z.string().max(100).default("General"), sku: z.string().max(80).optional().nullable().transform((value) => value?.trim() || null), imageUrl: z.string().url().optional().or(z.literal("")) });

export async function GET(request: Request) {
  try {
    const businessId = await currentBusinessId();
    if (!businessId) return NextResponse.json({ message: "Sign in and create a shop to manage products." }, { status: 401 });
    const search = new URL(request.url).searchParams.get("q")?.trim();
    const products = await prisma.product.findMany({ where: { businessId, active: true, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { sku: { contains: search, mode: "insensitive" as const } }, { category: { contains: search, mode: "insensitive" as const } }] } : {}) }, orderBy: { updatedAt: "desc" }, take: 500 });
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Catalogue read failed", error);
    return NextResponse.json({ message: "We couldn't load your catalogue. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessId = await currentBusinessId();
    if (!businessId) return NextResponse.json({ message: "Sign in and create a shop before adding products." }, { status: 401 });
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Check the product details and try again.", issues: parsed.error.issues }, { status: 400 });
    const data = parsed.data;
    const shopSettings = await prisma.businessSettings.findUnique({ where: { businessId }, select: { currency: true } });
    const product = await prisma.product.create({ data: { ...data, currency: shopSettings?.currency ?? "NGN", imageUrl: data.imageUrl || null, businessId, price: data.price } });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product create failed", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ message: "That SKU is already in use in this shop. Use a different SKU or leave the field blank." }, { status: 409 });
    return NextResponse.json({ message: "We couldn't save this product. Please try again." }, { status: 500 });
  }
}
