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
  }
}

// Ensure required environment variables are present
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

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
            return null;
          }

          const user = await User.findOne({ 
            email: credentials.email.toLowerCase()
          });

          if (!user) {
            return null;
          }
          
          if (!user.password) {
            return null;
          }
          
          if (user.provider !== 'credentials') {
            // Allow OAuth users to log in with password if they have one
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: (user._id as any).toString(),
            email: user.email,
            name: user.name,
            username: user.username,
            provider: user.provider
          } as NextAuthUser;
        } catch (error) {
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
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser && dbUser.provider !== 'credentials') {
            logger.info(`AUTH: OAuth user (${dbUser.provider}) logged in with password`);
          }
          return true;
        }

        const currentUser = await User.findOne({ email: user.email });

        if (!currentUser) {
          let baseUsername = user.email!.split("@")[0];
          let username = baseUsername;
          let counter = 1;
          
          while (await User.findOne({ username: username.toLowerCase() })) {
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
          return true;
        } else {
          // Update provider if it changed
          if (currentUser.provider !== account!.provider) {
            // Store the new provider
            currentUser.provider = account!.provider as any;
            
            // Only reset profile completion if the user doesn't have a password set
            if (!currentUser.password) {
              currentUser.isProfileComplete = false;
            }
            
            await currentUser.save();
          }
          
          return true;
        }
      } catch (error) {
        return false; // Prevent sign in if database operation fails
      }
    },

    async jwt({ token, user, trigger, session }) {
      try {
        await connectToDatabase();
        
        if (user) {
          // Initial sign in
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.id = (dbUser._id as any).toString();
            token.username = dbUser.username;
            token.name = dbUser.name;
            token.profilepic = dbUser.profilepic?.url || undefined;
            token.coverpic = dbUser.coverpic?.url || undefined;
            token.provider = dbUser.provider;
            token.isProfileComplete = dbUser.isProfileComplete;
            console.log(`JWT: User ${dbUser.email} authenticated with ID: ${dbUser._id}`);
          } else {
            console.error(`JWT: User ${user.email} not found in database during sign in`);
            // Don't return null, just continue with basic token
          }
        }

        // Handle profile updates - always fetch fresh data from DB
        if (trigger === "update" && session) {
          console.log('JWT update triggered with session data:', session);
          const dbUser = await User.findById(token.id);
          if (dbUser) {
            // Update token with fresh data from database
            token.username = dbUser.username;
            token.name = dbUser.name;
            token.profilepic = dbUser.profilepic?.url || undefined;
            token.coverpic = dbUser.coverpic?.url || undefined;
            token.isProfileComplete = dbUser.isProfileComplete;
            logger.debug(`JWT: Updated token for user ${dbUser.email}`);
            try {
              logger.profile(dbUser);
            } catch (profileError) {
              console.error('Error logging profile:', profileError);
            }
          } else {
            logger.error(`JWT: User ${token.id} not found during update`);
          }
        }

        // Always validate user exists in database
        if (token?.id) {
          const dbUser = await User.findById(token.id);
          if (dbUser) {
            // Update token with latest data if needed
            if (dbUser.username !== token.username) {
              token.username = dbUser.username;
              token.name = dbUser.name;
              token.profilepic = dbUser.profilepic?.url || undefined;
              token.coverpic = dbUser.coverpic?.url || undefined;
              token.isProfileComplete = dbUser.isProfileComplete;
            }
          } else {
            console.error(`JWT: User ${token.id} not found in database, continuing with existing token`);
          }
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token; // Return token even on error to prevent auth failure
      }
    },

    async session({ session, token }) {
      // If token is null, user is not authenticated
      if (!token) {
        console.log('Session: Token is null, user not authenticated');
        return session;
      }
      
      if (token?.id) session.user.id = token.id as string;
      if (token?.username) (session.user as any).username = token.username;
      if (token?.name) session.user.name = token.name as string;
      
      // Always set these properties to prevent "cannot read property of undefined" errors
      (session.user as any).profilePic = token?.profilepic || undefined;
      (session.user as any).coverpic = token?.coverpic || undefined;
      (session.user as any).provider = token?.provider || 'credentials';
      (session.user as any).isProfileComplete = token?.isProfileComplete !== undefined ? token.isProfileComplete : false;
      
      console.log(`Session: User ${session.user.email} authenticated with provider: ${(session.user as any).provider}`);
      
      // Log if a Google/OAuth user is using email/password login
      if (token.provider !== 'credentials' && token.sub) {
        console.log(`OAuth user (${token.provider}) logged in with password credentials`);
      }
      
      console.log(`Session: User ${session.user.email} authenticated with ID: ${session.user.id}`);
      return session;
    },

    // Handle the redirect callback properly
    async redirect({ url, baseUrl }) {
      // Log the redirect event
      console.log(`Redirect callback: URL=${url}, BaseURL=${baseUrl}`);
      
      // Special case for GitHub callback to complete-profile
      if (url.includes('/api/auth/callback') || url === baseUrl) {
        // For OAuth callbacks or root URL, we want to respect the signIn callback's return value
        // This ensures GitHub auth redirects to complete-profile for new users
        console.log(`OAuth callback detected, redirecting to appropriate page`);
        // We'll check the database in the signIn callback and redirect accordingly
        return baseUrl;
      }
      
      // If the URL is relative (starts with a slash), prepend the base URL
      if (url.startsWith('/')) {
        const newUrl = `${baseUrl}${url}`;
        console.log(`Converted relative URL to absolute: ${newUrl}`);
        return newUrl;
      }
      
      // If the URL is already absolute but doesn't start with the base URL,
      // ensure it's safe by checking it starts with the base URL
      if (!url.startsWith(baseUrl)) {
        console.log(`URL ${url} doesn't start with base URL ${baseUrl}, using default`);
        return baseUrl;
      }
      
      // Otherwise, return the URL as is
      return url;
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
      // Log the sign-in event
      console.log(`Event: User ${user.email} signed in successfully`);
    },
    async session({ session }) {
      console.log(`Session event triggered for user: ${session?.user?.email || 'unknown'}`);
    },
  },
  debug: true, // Enable debug logging to trace auth issues
  secret: process.env.NEXTAUTH_SECRET,
};

// Create handler with NextAuth and export it
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
