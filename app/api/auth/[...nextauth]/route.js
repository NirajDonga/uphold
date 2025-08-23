import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "@/app/db/connectdb";
import User from "@/app/models/User"; 

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET  
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await connectToDatabase();

        const currentUser = await User.findOne({ email: user.email });

        if (!currentUser) {
          // Generate a unique username from email
          let baseUsername = user.email.split("@")[0];
          let username = baseUsername;
          let counter = 1;
          
          // Ensure username uniqueness
          while (await User.findOne({ username: username.toLowerCase() })) {
            username = `${baseUsername}${counter}`;
            counter++;
          }
          
          const newUser = new User({
            email: user.email,
            username: username, // Will be converted to lowercase by pre-save hook
            name: user.name,
          });
          await newUser.save();
          console.log(`Created new user: ${newUser.email} with username: ${newUser.username}`);
        } else {
          console.log(`Existing user signed in: ${currentUser.email} with username: ${currentUser.username}`);
        }
        
        return true;
      } catch (error) {
        console.error('SignIn error:', error);
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
            token.id = dbUser._id.toString();
            token.username = dbUser.username;
            token.name = dbUser.name;
            token.profilepic = dbUser.profilepic;
            token.coverpic = dbUser.coverpic;
            console.log(`JWT: User ${dbUser.email} authenticated with ID: ${dbUser._id}`);
          } else {
            console.error(`JWT: User ${user.email} not found in database during sign in`);
            return null; // Invalidate token if user not found
          }
        }

        // Handle profile updates - always fetch fresh data from DB
        if (trigger === "update" && session) {
          const dbUser = await User.findById(token.id);
          if (dbUser) {
            // Update token with fresh data from database
            token.username = dbUser.username;
            token.name = dbUser.name;
            token.profilepic = dbUser.profilepic;
            token.coverpic = dbUser.coverpic;
            console.log(`JWT: Updated token for user ${dbUser.email}`);
          } else {
            console.error(`JWT: User ${token.id} not found during update`);
            return null; // Invalidate token if user not found
          }
        }

        // Always validate user exists in database
        if (token?.id) {
          const dbUser = await User.findById(token.id);
          if (!dbUser) {
            console.error(`JWT: User ${token.id} not found in database, invalidating token`);
            return null; // Invalidate token if user not found
          }
          
          // Update token with latest data if needed
          if (dbUser.username !== token.username) {
            token.username = dbUser.username;
            token.name = dbUser.name;
            token.profilepic = dbUser.profilepic;
            token.coverpic = dbUser.coverpic;
            console.log(`JWT: Refreshed token data for user ${dbUser.email}`);
          }
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return null; // Invalidate token on database error
      }
    },

    async session({ session, token }) {
      // If token is null, user is not authenticated
      if (!token) {
        console.log('Session: Token is null, user not authenticated');
        return null;
      }
      
      if (token?.id) session.user.id = token.id;
      if (token?.username) session.user.username = token.username;
      if (token?.name) session.user.name = token.name;
      if (token?.profilepic) session.user.profilepic = token.profilepic;
      if (token?.coverpic) session.user.coverpic = token.coverpic;
      
      console.log(`Session: User ${session.user.email} authenticated with ID: ${session.user.id}`);
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  debug: process.env.NODE_ENV === 'development'
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };