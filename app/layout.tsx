import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Background from "../components/Background";
import SessionWrapper from "../components/SessionWrapper";
import ImageErrorHandler from "../components/ImageErrorHandler";
import PageTracker from "../components/PageTracker";
import PerformanceOptimizer from "../components/PerformanceOptimizer";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { ReactNode } from "react";

export const metadata = {
  title: "Get Me A Chai",
  description: "Support creators with a chai",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <SessionWrapper>
          <div className="relative min-h-screen flex flex-col">
            <Background />
            <Navbar />
            <PageTracker />
            <PerformanceOptimizer />
            <ImageErrorHandler />
            <main className="flex-1 relative z-10">
              {children}
            </main>
            <Footer />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
              toastClassName="bg-gray-800 text-white"
            />
          </div>
        </SessionWrapper>
      </body>
    </html>
  );
}
