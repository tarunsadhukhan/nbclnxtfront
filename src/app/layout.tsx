import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SidebarCompaniesGuardClient from '@/components/clientside/SidebarCompaniesGuardClient';
import SubdomainGuard from '@/components/clientside/SubdomainGuard';
import { AppThemeProvider } from '@/styles/AppThemeProvider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ["latin"] });
/* 
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
}); */
/* 
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
}); */

export const metadata: Metadata = {
  title: "Global Erp Solutions",
  description: "ERP",
  icons: {
    icon: [
      { url: "/app-icons/icon-29.png", sizes: "29x29", type: "image/png" },
      { url: "/app-icons/icon-58.png", sizes: "58x58", type: "image/png" },
      { url: "/app-icons/android-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/app-icons/icon-180.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className}`} suppressHydrationWarning>
        {/* <AuthProvider>    */}
          <AppThemeProvider>
            <SubdomainGuard />
            <SidebarCompaniesGuardClient />
            {children}
            <Toaster />
          </AppThemeProvider>
         {/* </AuthProvider>  */}
      </body>
    </html>
  );
}
