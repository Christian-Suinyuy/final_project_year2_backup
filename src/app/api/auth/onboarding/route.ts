import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  businessName: z.string().min(2),
  businessEmail: z.string().email(),
  industry: z.string().min(2),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Enter your shop name, a valid business email and your industry." }, { status: 400 });
    const validatedData = parsed.data;
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ message: "Please sign in again before setting up your shop." }, { status: 401 });

    // Transaction to ensure atomic business creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Business
      const business = await tx.business.create({
        data: {
          name: validatedData.businessName,
          email: validatedData.businessEmail,
          industry: validatedData.industry,
        },
      });

      // 2. Link User to Business (Admin role)
      await tx.businessMember.create({
        data: {
          userId: userId,
          businessId: business.id,
          role: "admin",
        },
      });

      // 3. Update User record with businessId
      await tx.user.update({
        where: { id: userId },
        data: { businessId: business.id },
      });

      // 4. Create default BusinessSettings
      await tx.businessSettings.create({
        data: {
          businessId: business.id,
          openingHours: {
            mon: { open: "09:00", close: "18:00", closed: false },
            tue: { open: "09:00", close: "18:00", closed: false },
            wed: { open: "09:00", close: "18:00", closed: false },
            thu: { open: "09:00", close: "18:00", closed: false },
            fri: { open: "09:00", close: "18:00", closed: false },
            sat: { open: "10:00", close: "16:00", closed: false },
            sun: { closed: true },
          },
          deliveryZones: [],
          policies: "Standard returns within 14 days. Exchange allowed for defective items.",
          welcomeMessage: "Hello! Welcome to our AI-powered store. How can I help you today?",
        },
      });

      return business;
    });

    return NextResponse.json({ message: "Business created successfully", businessId: result.id }, { status: 201 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ message: "We couldn't create your shop. Please try again." }, { status: 500 });
  }
}
