import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin", error: "/auth/signin" },
  providers: [CredentialsProvider({
    name: "Credentials",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const user = await prisma.user.findUnique({ where: { email: credentials.email.trim().toLowerCase() } });
      if (!user?.password || !(await bcrypt.compare(credentials.password, user.password))) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      const userId = (user?.id ?? token.id) as string | undefined;
      if (userId) {
        const stored = await prisma.user.findUnique({ where: { id: userId }, select: { businessId: true } });
        token.businessId = stored?.businessId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id?: string; businessId?: string | null }).id = token.id as string;
        (session.user as typeof session.user & { id?: string; businessId?: string | null }).businessId = token.businessId as string | null;
      }
      return session;
    },
  },
};
