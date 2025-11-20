# Uphold – Modern Creator Support Platform

> A full-stack Next.js application empowering creators with direct fan support through secure payments and seamless authentication.

## 🚀 Features

- **Secure Authentication**: GitHub and Google OAuth integration with NextAuth
- **Wallet System**: Complete fund management with top-up, withdraw, and transfer capabilities
- **Stripe Integration**: Production-ready payment processing
- **User Profiles**: Customizable creator profiles with image uploads (Cloudinary)
- **Real-time Updates**: Optimized performance with SWR data fetching
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB database (Atlas or local)
- Stripe account (for payments)
- GitHub and/or Google OAuth apps (for authentication)
- Cloudinary account (for image hosting)

## 🔧 Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication (NextAuth)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe Payments
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Cloudinary (Image Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Optional - for notifications)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@uphold.com
```

### Getting Your API Keys:

- **Stripe**: https://dashboard.stripe.com/test/apikeys
- **GitHub OAuth**: https://github.com/settings/developers
- **Google OAuth**: https://console.cloud.google.com/apis/credentials
- **Cloudinary**: https://cloudinary.com/console
- **NextAuth Secret**: Run `openssl rand -base64 32` in terminal

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NirajDonga/GetMEAChai.git
   cd GetMEAChai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local` (or create new)
   - Fill in all required values from the section above

4. **Set up MongoDB**
   - Create a database in MongoDB Atlas or use local MongoDB
   - Copy the connection string to `MONGODB_URI`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`

## 🧪 Testing the Application

### Authentication
1. Go to `/login`
2. Sign in with GitHub or Google
3. Complete your profile setup

### Wallet Features
1. **Top-up**: Go to `/funds` and add funds using test card
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

2. **Withdraw**: Simulate withdrawals (test mode - no real transfers)

3. **Support Creators**: Visit any user's profile and send support

## 🏗️ Project Structure

```
Uphold/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   ├── [username]/        # Dynamic user profiles
│   ├── dashboard/         # Creator dashboard
│   ├── funds/             # Wallet management
│   ├── lib/               # Utilities and helpers
│   └── models/            # Database models
├── components/            # React components
├── public/                # Static assets
├── types/                 # TypeScript definitions
└── middleware.ts          # Auth middleware
```

## 🔒 Security Notes

- ✅ All sensitive data is in `.env.local` (gitignored)
- ✅ No API keys or secrets in code
- ✅ Stripe webhook signature verification enabled
- ✅ NextAuth CSRF protection active
- ✅ Environment variables validated at runtime
- ⚠️ **Never commit `.env.local` to version control**
- ⚠️ **Use test mode Stripe keys for development**
- ⚠️ **Rotate all secrets before production deployment**

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # Check TypeScript types
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy!

### Other Platforms
- Ensure Node.js 18+ is available
- Set all environment variables
- Run `npm run build` then `npm start`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 💬 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ by creators, for creators**
