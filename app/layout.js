import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Background from "../components/Background";
import SessionWrapper from "../components/SessionWrapper";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata = {
  title: "Get Me A Chai",
  description: "Support creators with a chai and explore their pages.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <SessionWrapper>
          <div className="relative min-h-screen flex flex-col">
            <Background />
            <Navbar />
            <main className="flex-1">
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
            />
          </div>
        </SessionWrapper>
      </body>
    </html>
  );
}


