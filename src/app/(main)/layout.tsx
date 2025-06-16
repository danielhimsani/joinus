
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
        {/* Footer has been removed */}
      </div>
    </AuthGuard>
  );
}
