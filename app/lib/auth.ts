import { getServerSession, type NextAuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import type { Session, User } from "next-auth";

export async function getSession(): Promise<Session | null> {
  return await getServerSession(authOptions as NextAuthOptions);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}

export async function requireAuth(redirectTo: string = '/login'): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect(redirectTo);
  }
  
  return user;
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

export async function hasRole(role: string): Promise<boolean> {
  const user = await getCurrentUser();
  return (user as any)?.role === role;
}

export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

export async function isOAuthUser(): Promise<boolean> {
  const user = await getCurrentUser();
  return (user as any)?.provider !== 'credentials';
}

export async function isProfileComplete(): Promise<boolean> {
  const user = await getCurrentUser();
  return (user as any)?.isProfileComplete || false;
}
