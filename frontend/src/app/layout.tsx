import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

// One clean font family for body text and headings (font-sans / font-display in globals.css).
const jakarta = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: {
    default: "TravelMate — flights, hotels and trip planning",
    template: "%s | TravelMate",
  },
  description: "Search and book flights and hotels, plan day-by-day itineraries with a budget, and read stories from other travellers.",
};

// The root layout does NOT read cookies, so public pages can still be static/ISR.
// The logged-in user is loaded in the browser by <AuthProvider>.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
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
