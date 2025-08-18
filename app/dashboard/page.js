import Link from "next/link";
import Image from "next/image";
import teaGif from "/public/tea.gif";

export default function DashboardPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="flex items-center gap-3 mb-6">
        <span
          className="font-extrabold text-4xl sm:text-5xl bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent"
          style={{ textShadow: "0px 3px 6px rgba(0, 0, 0, 0.4)" }}
        >
          Dashboard
        </span>
        <Image src={teaGif} alt="Animated tea cup" width={72} height={72} unoptimized />
      </div>

      <p className="text-neutral-300 max-w-xl mb-8">
        Welcome! Choose a provider to continue. Authentication is not wired yet; these buttons are placeholders you can hook up to your OAuth flows.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <Link href="/login?provider=google" className="w-full sm:w-auto">
          <button
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.3 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.2 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.3 29.6 4 24 4 15.5 4 8.1 9.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.2 35.5 26.8 36 24 36c-5.3 0-9.6-3.6-11.2-8.5l-6.5 5C8.1 38.6 15.5 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.8-5.1 6.5-9.3 6.5-5.3 0-9.8-3.6-11.4-8.5l-6.5 5C10.4 38.6 16.6 44 24 44c8.9 0 18-6.5 18-20 0-1.3-.1-2.7-.4-3.5z"/>
            </svg>
            Continue with Google
          </button>
        </Link>

        <Link href="/login?provider=cursor" className="w-full sm:w-auto">
          <button
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M13 3v7h7v2h-7v9h-2v-9H4V10h7V3h2z"/>
            </svg>
            Continue with Cursor
          </button>
        </Link>
      </div>
    </div>
  );
}

