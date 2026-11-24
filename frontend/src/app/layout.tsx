import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

// Body text and headings (used through font-sans / font-display in globals.css).
const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });
const heading = Space_Grotesk({ variable: "--font-heading", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "TravelMate — flights, hotels and itineraries",
    template: "%s | TravelMate",
  },
  description: "Book flights and hotels, plan itineraries with budgets, and share travel stories.",
};

// The root layout does NOT read cookies, so public pages can still be static/ISR.
// The logged-in user is loaded in the browser by <AuthProvider>.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">{children}</main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
