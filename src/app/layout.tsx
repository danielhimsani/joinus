
import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google'; 
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['300', '400', '500', '700']
});

export const metadata: Metadata = {
  title: 'Mechuzarim (Reconnected)',
  description: 'פלטפורמת ניהול אורחים לחתונה והזמנת מקומות ברגע האחרון.',
  manifest: '/manifest.json', 
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mechuzarim',
    // startUpImage: [], // You can add startup images for iOS here
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: 'https://placehold.co/192x192.png?text=M', // Default icon
    apple: 'https://placehold.co/180x180.png?text=M', // Apple touch icon
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF', 
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* The manifest link is now handled by Next.js metadata API */}
      </head>
      <body className={cn('font-body antialiased', rubik.variable)}>
        <ThemeInitializer />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
