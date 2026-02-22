import Header from "@/app/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Header />
      
      <div className="flex flex-1 w-full max-w-7xl mx-auto relative">
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:px-6">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}