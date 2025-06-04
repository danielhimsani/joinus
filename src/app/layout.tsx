import type { Metadata } from 'next';
import { Alegreya } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { cn } from '@/lib/utils';

const alegreya = Alegreya({
  subsets: ['latin', 'hebrew'],
  variable: '--font-alegreya',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'מחוברים',
  description: 'פלטפורמת ניהול אורחים לחתונה',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Note: Next/font is used, so direct Google Font links are not needed here if using next/font correctly.
            If direct links were required, they would go here.
            Example: <link href="https://fonts.googleapis.com/css2?family=Alegreya&display=swap" rel="stylesheet" />
         */}
      </head>
      <body className={cn('font-body antialiased', alegreya.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
