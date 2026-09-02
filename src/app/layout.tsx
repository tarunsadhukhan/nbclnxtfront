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
  title: "InfoSky Global IT Solutions",
  description: "ERP",
  // Tab icon comes from src/app/icon.svg (Next file convention) — the InfoSky mark
  // used on the login page.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Material Symbols — menu_mst.menu_icon stores ligature names for this
            set. display=block hides the text until the font lands, otherwise
            the raw name ("assessment") flashes in place of the glyph. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0&display=block"
        />
      </head>
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
