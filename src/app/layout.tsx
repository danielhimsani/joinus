import type { Metadata } from 'next';
import { Rubik } from 'next/font/google'; // Changed from Alegreya to Rubik
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { cn } from '@/lib/utils';

// Changed font import and configuration
const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik', // Changed variable name
  display: 'swap',
  weight: ['300', '400', '500', '700'] // Added common weights
});

export const metadata: Metadata = {
  title: 'Join us',
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
        {/* Note: Next/font is used, so direct Google Font links are not needed here if using next/font correctly. */}
      </head>
      {/* Updated className to use the new font variable */}
      <body className={cn('font-body antialiased', rubik.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
