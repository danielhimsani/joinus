
import Header from "@/components/layout/Header";
import BottomNavigationBar from "@/components/layout/BottomNavigationBar";
import { AuthGuard } from "@/components/auth/AuthGuard"; // Import the AuthGuard
import { NotificationSetup } from "@/components/notifications/NotificationSetup"; // Import NotificationSetup

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard> {/* Wrap the content with AuthGuard */}
      <NotificationSetup /> {/* Add NotificationSetup here */}
      <div className="flex min-h-screen flex-col">
        <div className="hidden md:block">
          <Header />
        </div>
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <BottomNavigationBar />
        <footer className="py-6 md:px-8 md:py-0 bg-background border-t hidden md:block">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-right">
              נבנה באהבה ע״י דניאל הימסני וסטיבן דנישבסקי. כל הזכויות שמורות © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}
