
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
  title: 'Join Us',
  description: 'פלטפורמת ניהול אורחים לחתונה והזמנת מקומות ברגע האחרון.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Join us',
    startupImage: "https://studio--join-us-p1u7f.us-central1.hosted.app/join_us_192.png", // You can add startup images for iOS here
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: 'https://studio--join-us-p1u7f.us-central1.hosted.app/join_us_192.png', // Default icon
    apple: 'https://studio--join-us-p1u7f.us-central1.hosted.app/join_us_192.png', // Apple touch icon
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
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
