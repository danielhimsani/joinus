
import type { Metadata } from 'next';
import { Rubik } from 'next/font/google'; 
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';
import { GlobalSettingsDialog } from '@/components/layout/GlobalSettingsDialog'; // Import new component

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['300', '400', '500', '700']
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
      <body className={cn('font-body antialiased', rubik.variable)}>
        <ThemeInitializer />
        <GlobalSettingsDialog /> {/* Add the dialog and its trigger here */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
