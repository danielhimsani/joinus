
import type { Metadata } from 'next';
import { Rubik } from 'next/font/google'; // Removed Pacifico
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { cn } from '@/lib/utils';

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['300', '400', '500', '700']
});

// Pacifico font configuration removed

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
        {/* Next/font handles font loading */}
      </head>
      {/* Removed pacifico.variable from the body class */}
      <body className={cn('font-body antialiased', rubik.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
