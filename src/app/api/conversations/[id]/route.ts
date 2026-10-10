import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentBusinessId } from "@/lib/tenant";
import { messagingManager } from "@/lib/messaging/manager";

const schema = z.object({ content: z.string().trim().min(1).max(4000) });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const businessId = await currentBusinessId();
  if (!businessId) return NextResponse.json({ message: "Sign in and create a shop first." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Write a reply before sending." }, { status: 400 });
  try {
    const { id } = await context.params;
    const conversation = await prisma.conversation.findFirst({ where: { id, businessId }, select: { id: true, customerId: true } });
    if (!conversation) return NextResponse.json({ message: "We couldn't find this conversation in your shop." }, { status: 404 });
    await messagingManager.send(businessId, conversation.customerId, parsed.data.content);
    const message = await prisma.message.create({ data: { conversationId: id, role: "assistant", content: parsed.data.content } });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Conversation reply failed", error);
    return NextResponse.json({ message: "We couldn't send that reply. Check that WhatsApp is connected and try again." }, { status: 503 });
  }
}
