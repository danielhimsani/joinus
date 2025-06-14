
import Header from "@/components/layout/Header"; // Import the Header component
import BottomNavigationBar from "@/components/layout/BottomNavigationBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header /> {/* Add the Header component here */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main> {/* Adjusted pb for bottom nav on mobile, none on desktop */}
      <BottomNavigationBar />
      <footer className="py-6 md:px-8 md:py-0 bg-background border-t hidden md:block">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-right">
            נבנה באהבה עבור מחוברים. כל הזכויות שמורות © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
