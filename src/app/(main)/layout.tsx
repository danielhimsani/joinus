
import BottomNavigationBar from "@/components/layout/BottomNavigationBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-20">{children}</main> {/* Added pb-20 for bottom nav */}
      <BottomNavigationBar />
      <footer className="py-6 md:px-8 md:py-0 bg-background border-t hidden md:block"> {/* Hide footer on mobile for cleaner look with bottom nav */}
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-right">
            נבנה באהבה עבור מחוברים. כל הזכויות שמורות © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
