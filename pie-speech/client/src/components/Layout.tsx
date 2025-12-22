import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";

interface LayoutProps {
  children: ReactNode;
  transcriptOverlayOpen?: boolean;
}

export function Layout({ children, transcriptOverlayOpen = false }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-background overflow-hidden">
      {/* Desktop Sidebar - fixed position */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-background">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      
      {/* Main content area - stays fixed, no shifting */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex-shrink-0">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 px-4 py-4 lg:px-6 lg:py-6 overflow-y-auto main-content-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
