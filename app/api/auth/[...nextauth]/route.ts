import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User"; 
import bcrypt from "bcryptjs";
import type { NextAuthOptions, SessionStrategy } from "next-auth";
import type { User as NextAuthUser } from "next-auth";
import { logger } from "@/app/lib/logger";

// Use module augmentation to extend the JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string;
    profilepic?: string;
    coverpic?: string;
    provider?: string;
    isProfileComplete?: boolean;
    lastAuthTime?: number; // Timestamp of last authentication
    lastReAuthTime?: number; // Timestamp of last re-authentication for sensitive ops
  }
}

// Ensure required environment variables are present
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set. This is required for authentication.');
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
  console.warn('NEXTAUTH_URL is not set. It is recommended for production deployments.');
}

// Determine if we should enable debug mode
const isDebugMode = process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        try {
          await connectToDatabase();
          
          if (!credentials?.email || !credentials?.password) {
            logger.error("AUTH: Missing email or password credentials");
            return null;
          }

          logger.info(`AUTH: Attempting login for email: ${credentials.email}`);

          const user = await User.findOne({ 
            email: credentials.email.toLowerCase()
          });

          if (!user) {
            logger.error(`AUTH: User not found for email: ${credentials.email}`);
            return null;
          }
          
          if (!user.password) {
            logger.error(`AUTH: User ${credentials.email} has no password set (OAuth-only account). Provider: ${user.provider}`);
            return null;
          }
          
          if (user.provider !== 'credentials') {
            logger.info(`AUTH: OAuth user (${user.provider}) attempting to log in with password`);
            // Allow OAuth users to log in with password if they have one
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            logger.error(`AUTH: Invalid password for user: ${credentials.email}`);
            return null;
          }

          logger.info(`AUTH: Login successful for user: ${credentials.email}`);
          return {
            id: (user._id as any).toString(),
            email: user.email,
            name: user.name,
            username: user.username,
            provider: user.provider
          } as NextAuthUser;
        } catch (error) {
          logger.error("AUTH: Authorize error:", error);
          return null;
        }
      }
    }),
    // Only add GitHub provider if credentials are available
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET ? [
      GithubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    ] : []),
    // Only add Google provider if credentials are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: "select_account", // <-- This line forces the account picker
          },
        },
      })
    ] : [])
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        await connectToDatabase();

        if (account?.provider === 'credentials') {
          // Credentials login - just verify user exists
          const dbUser = await User.findOne({ email: user.email }).lean();
          if (!dbUser) {
            console.error(`SignIn: User ${user.email} not found`);
            return false;
          }
          if (isDebugMode && dbUser.provider !== 'credentials') {
            console.log(`SignIn: OAuth user (${dbUser.provider}) logged in with password`);
          }
          return true;
        }

        // OAuth login - create or update user
        const currentUser = await User.findOne({ email: user.email });

        if (!currentUser) {
          // Create new user with unique username
          let baseUsername = user.email!.split("@")[0].replace(/[^a-zA-Z0-9]/g, '');
          let username = baseUsername;
          let counter = 1;
          
          while (await User.exists({ username: username.toLowerCase() })) {
            username = `${baseUsername}${counter}`;
            counter++;
          }
          
          const newUser = new User({
            email: user.email,
            username: username,
            name: user.name,
            provider: account!.provider,
            isProfileComplete: false
          });
          await newUser.save();
          if (isDebugMode) console.log(`SignIn: New user created: ${username}`);
          return true;
        } else {
          // Update provider if it changed
          if (currentUser.provider !== account!.provider) {
            currentUser.provider = account!.provider as any;
            if (!currentUser.password) {
              currentUser.isProfileComplete = false;
            }
            await currentUser.save();
            if (isDebugMode) console.log(`SignIn: Updated provider for user: ${currentUser.email}`);
          }
          return true;
        }
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },

    async jwt({ token, user, trigger }) {
      try {
        await connectToDatabase();
        
        if (user) {
          // Initial sign in - fetch user data
          const dbUser = await User.findOne({ email: user.email }).lean();
          if (dbUser) {
            token.id = (dbUser._id as any).toString();
            token.username = dbUser.username;
            token.name = dbUser.name;
            token.profilepic = dbUser.profilepic?.url || undefined;
            token.coverpic = dbUser.coverpic?.url || undefined;
            token.provider = dbUser.provider;
            token.isProfileComplete = dbUser.isProfileComplete;
            token.lastAuthTime = Date.now(); // Track authentication time
            token.lastReAuthTime = Date.now(); // Fresh auth counts as re-auth
            if (isDebugMode) console.log(`JWT: User ${dbUser.email} authenticated with ID: ${dbUser._id}`);
          } else {
            console.error(`JWT: User ${user.email} not found in database during sign in`);
          }
          return token;
        }

        // Handle profile updates - always fetch fresh data from DB
        if (trigger === "update" && token?.id) {
          if (isDebugMode) console.log('JWT: Update triggered, refreshing user data');
          const dbUser = await User.findById(token.id).lean();
          if (dbUser) {
            token.username = dbUser.username;
            token.name = dbUser.name;
            token.profilepic = dbUser.profilepic?.url || undefined;
            token.coverpic = dbUser.coverpic?.url || undefined;
            token.isProfileComplete = dbUser.isProfileComplete;
            // Update lastReAuthTime when explicitly updating (after re-auth)
            token.lastReAuthTime = Date.now();
            if (isDebugMode) console.log(`JWT: Token updated for user ${dbUser.email}`);
          } else {
            console.error(`JWT: User ${token.id} not found during update`);
          }
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token; // Return token even on error to prevent auth failure
      }
    },

    async session({ session, token }) {
      if (!token) {
        if (isDebugMode) console.log('Session: No token, user not authenticated');
        return session;
      }
      
      // Map token data to session
      session.user.id = token.id as string;
      session.user.name = token.name as string;
      (session.user as any).username = token.username;
      (session.user as any).profilePic = token.profilepic;
      (session.user as any).coverpic = token.coverpic;
      (session.user as any).provider = token.provider || 'credentials';
      (session.user as any).isProfileComplete = token.isProfileComplete ?? false;
      (session.user as any).lastAuthTime = token.lastAuthTime;
      (session.user as any).lastReAuthTime = token.lastReAuthTime;
      
      if (isDebugMode) {
        console.log(`Session: User ${session.user.email} (${token.provider}) authenticated`);
      }
      
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log(`Redirect: url=${url}, baseUrl=${baseUrl}`);
      
      // If relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // If same domain, allow
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Otherwise return base URL
      return baseUrl;
    }
  },
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    // JWT encryption and cookie settings
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login', // Error page
  },
  // Using events to customize redirect behavior after sign in
  events: {
    async signIn({ user }) {
      if (isDebugMode) console.log(`Event: User ${user.email} signed in successfully`);
    },
  },
  debug: isDebugMode,
  secret: process.env.NEXTAUTH_SECRET,
};

// Create handler with NextAuth and export it
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
