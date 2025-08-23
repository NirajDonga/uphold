# Get Me Chai – Stripe Integration & Auth Setup

## 1. Environment Variables

Create a `.env.local` file in the root with:

```
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

- Get Stripe keys from https://dashboard.stripe.com/test/apikeys
- Get GitHub/Google OAuth keys from their developer consoles.

## 2. Install Dependencies

```
npm install
```

## 3. Start MongoDB
- Use MongoDB Atlas or run locally.

## 4. Run the App

```
npm run dev
```

## 5. Test Authentication
- Go to `/login`.
- Sign in with GitHub or Google.

## 6. Test Wallet Top-up (Stripe)
- Go to `/funds` after login.
- Enter an amount and card details in the top-up form.
- Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
- On success, your wallet balance updates.

## 7. Test Withdraw
- Enter an amount and click Withdraw. This only simulates a payout (no real bank info needed).

## 8. Test Donate
- Enter another user's userId and amount, click Donate.

---

### Notes
- All payments are in test mode. No real money moves.
- Withdrawals are simulated for testing.
- You must be logged in to access wallet features.
