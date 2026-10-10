import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), password: z.string().min(8).max(128) });

export async function POST(request: NextRequest) {
  const input = signupSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "Enter your name, a valid email and a password with at least 8 characters." }, { status: 400 });
  try {
    const email = input.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ message: "An account with this email already exists. Sign in instead." }, { status: 409 });
    const password = await bcrypt.hash(input.data.password, 12);
    const user = await prisma.user.create({ data: { name: input.data.name, email, password }, select: { id: true } });
    return NextResponse.json({ message: "Account created. Sign in to set up your shop.", userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Account creation failed", error);
    return NextResponse.json({ message: "We couldn't create your account. Please try again." }, { status: 500 });
  }
}
