import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentBusinessId } from "@/lib/tenant";

export async function GET() {
  try {
    const businessId = await currentBusinessId();
    if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
    const conversations = await prisma.conversation.findMany({ where: { businessId }, include: { messages: { orderBy: { timestamp: "asc" }, take: 80 }, customer: true }, orderBy: { updatedAt: "desc" }, take: 100 });
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversation read failed", error);
    return NextResponse.json({ message: "We couldn't load conversations." }, { status: 500 });
  }
}
