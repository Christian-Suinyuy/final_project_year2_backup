import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function currentBusinessId() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { businessId: true } });
  return user?.businessId ?? null;
}
