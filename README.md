# Uphold

Hey there! 👋 Welcome to Uphold - a platform where creators can receive support directly from their fans. Think of it as a friendly way for people to say "thanks for the awesome work!" with actual support.

## What's This All About?

Uphold is a full-stack web app built with Next.js that lets creators:
- Accept payments from supporters
- Manage their funds in a built-in wallet
- Show off their work with customizable profiles
- Track who's supporting them

It's all powered by modern tech like Stripe for payments, NextAuth for secure logins, and MongoDB to store everything safely.

## What You'll Need Before Starting

Before we dive in, make sure you have:
- **Node.js** (version 18 or higher) - this is what runs the app
- **MongoDB** - we'll use this to store user data (free tier on MongoDB Atlas works great)
- **Stripe account** - for handling payments (don't worry, test mode is free!)
- **GitHub or Google OAuth app** - so users can sign in easily
- **Cloudinary account** - for storing profile pictures (also has a free tier)

Don't panic if you don't have these yet - we'll guide you through getting them!

## Setting Up Your Environment Variables

Okay, this is important! Environment variables are like secret settings that tell the app how to connect to all the services. Think of them as the app's configuration file.

Create a file called `.env.local` in the main project folder and add these:

```bash
# Your MongoDB connection (where we store user data)
MONGODB_URI=your_mongodb_connection_string

# Authentication secrets (keeps users logged in securely)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# OAuth login providers (let users sign in with GitHub/Google)
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe (handles all the payment stuff)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Cloudinary (stores profile and cover images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (optional - if you want to send notifications)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@uphold.com
```

### Where to Get These Keys

Here's where you can grab all those credentials:

- **Stripe keys**: Go to https://dashboard.stripe.com/test/apikeys (use test mode while developing!)
- **GitHub OAuth**: Head to https://github.com/settings/developers and create a new OAuth app
- **Google OAuth**: Visit https://console.cloud.google.com/apis/credentials and set up OAuth credentials
- **Cloudinary**: Sign up at https://cloudinary.com/console and grab your keys from the dashboard
- **NextAuth Secret**: Just run `openssl rand -base64 32` in your terminal to generate a random secret

## Getting Started

Let's get this thing running on your machine!

### 1. Grab the Code
```bash
git clone https://github.com/NirajDonga/GetMEAChai.git
cd GetMEAChai
```

### 2. Install Everything
```bash
npm install
```
This might take a minute or two. Perfect time to grab a coffee! ☕

### 3. Set Up Your Environment
- Create that `.env.local` file we talked about earlier
- Fill in all the keys and secrets (check the section above if you need help)

### 4. Connect to MongoDB
- If you're using MongoDB Atlas, create a new cluster (the free one works great)
- Grab your connection string and paste it into `MONGODB_URI` in your `.env.local`

### 5. Fire It Up!
```bash
npm run dev
```

### 6. Check It Out
Open your browser and go to `http://localhost:3000` - you should see the Uphold homepage!

## Try It Out

Now that everything's running, here's how to test the features:

### Login & Profile
- Head over to `/login`
- Sign in with GitHub or Google (whichever you set up)
- You'll be asked to complete your profile - pick a username and set a password
- Boom! You're in 🎉

### Play with the Wallet
Want to test payments? Here's the fun part:
1. Go to `/funds` after logging in
2. Try adding some funds using Stripe's test card:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (like 12/25)
   - **CVC**: Any 3 numbers (like 123)
   - **ZIP**: Any 5 digits (like 12345)
3. Try withdrawing funds (don't worry, it's all fake money in test mode!)
4. Visit another user's profile and send them support

Everything is in test mode, so no real money is involved. Play around and break things - that's what testing is for!

## How the Code is Organized

Here's a quick tour of the project structure:

```
Uphold/
├── app/                    # Main application code (Next.js App Router)
│   ├── api/               # Backend API endpoints
│   ├── [username]/        # User profile pages (dynamic routes)
│   ├── dashboard/         # Creator's personal dashboard
│   ├── funds/             # Wallet and payment pages
│   ├── lib/               # Helper functions and utilities
│   └── models/            # Database schemas
├── components/            # Reusable UI components
├── public/                # Images, icons, and static files
├── types/                 # TypeScript type definitions
└── middleware.ts          # Authentication middleware
```

## Important Security Stuff

Look, security is serious business. Here's what you need to know:

**What's Already Protected:**
- Your `.env.local` file is automatically ignored by git (never gets uploaded)
- No API keys or secrets are hardcoded in the source code
- Stripe webhooks are verified before we trust them
- CSRF protection is enabled to prevent sneaky attacks
- All environment variables are validated when the app starts

**What YOU Need to Do:**
- ⚠️ **Never ever commit `.env.local` to GitHub** - seriously, don't do it
- ⚠️ **Always use Stripe test mode while developing** - no real money until you're ready!
- ⚠️ **Change all your secrets before going live** - generate fresh ones for production

## Useful Commands

Here are the commands you'll use most often:

```bash
npm run dev          # Start the development server (hot reload enabled)
npm run build        # Build the app for production
npm run start        # Run the production build
npm run lint         # Check for code issues
npm run lint:fix     # Auto-fix code issues where possible
npm run type-check   # Verify TypeScript types
```

## Ready to Deploy?

When you're ready to share your creation with the world:

### Deploying to Vercel (Super Easy)
Vercel is made by the Next.js team, so it's the smoothest experience:
1. Push your code to GitHub (if you haven't already)
2. Go to [vercel.com](https://vercel.com) and import your project
3. Add all your environment variables (copy them from `.env.local`)
4. Click deploy and watch the magic happen! ✨

Your app will be live in about a minute with a free `.vercel.app` domain.

### Other Hosting Options
You can deploy anywhere that supports Node.js:
- Make sure Node.js 18+ is available
- Set up all your environment variables in the hosting platform
- Run `npm run build` followed by `npm start`

## License

This project is open source under the MIT License - feel free to use it
