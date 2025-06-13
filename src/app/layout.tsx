
import type { Metadata } from 'next';
import { Rubik, Pacifico } from 'next/font/google'; // Import Pacifico
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { cn } from '@/lib/utils';

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['300', '400', '500', '700']
});

// Add Pacifico font configuration
const pacifico = Pacifico({
  subsets: ['latin'],
  variable: '--font-pacifico',
  weight: '400', // Pacifico is typically only available in 400 weight
  display: 'swap',
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
        {/* Next/font handles font loading */}
      </head>
      {/* Add pacifico.variable to the body class */}
      <body className={cn('font-body antialiased', rubik.variable, pacifico.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
