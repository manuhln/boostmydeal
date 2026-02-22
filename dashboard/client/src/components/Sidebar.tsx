import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { 
  BarChart3, 
  Phone, 
  Bot, 
  Workflow, 
  Users, 
  CreditCard, 
  Settings, 
  HelpCircle,
  PhoneCall,
  Volume2,
  Database,
  Receipt,
  TrendingUp,
  FileStack,
  Wrench,
  LogOut,
  Building,
  Zap,
  Activity,
  ChevronDown,
  ChevronRight,
  Bell
} from "lucide-react";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useUserWithOrganization } from "@/hooks/useUser";
import { useTheme } from "@/contexts/ThemeContext";
import { BoostMyLeadLogo } from "@/components/BoostMyLeadLogo";
import { BoostMyLeadWhiteLogo } from "@/components/BoostmyLeadwhite";
import { BoostMyLeadIcon } from "@/components/BoostMyLeadIcon";
import { BoostMyLeadWhiteIcon } from "@/components/BoostMyLeadWhiteIcon";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: BarChart3 },
  { id: "agent-management", label: "Assistant", href: "/agents", icon: Bot },
  { id: "workflows", label: "Workflows", href: "/workflows", icon: Workflow },
  { id: "integrations", label: "Integrations", href: "/integrations", icon: Zap },
  { id: "phone-numbers", label: "Phone Numbers", href: "/phone-numbers", icon: PhoneCall },
  { id: "call-logs", label: "Call Logs", href: "/call-logs", icon: Phone },
  { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
  { id: "knowledge-base", label: "Knowledge Base", href: "/knowledge-base", icon: Database },
  // { id: "webhook-debug", label: "Webhook Debug", href: "/webhook-debug", icon: Activity }, // Temporarily commented out
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
  { id: "help", label: "Help Center", href: "/help", icon: HelpCircle },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const logout = useLogout();
  const { data: userOrgData, isLoading: isLoadingUserOrg } = useUserWithOrganization();
  const { theme } = useTheme();
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  // Handle scroll events to show/hide scrollbar
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const handleScroll = () => {
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Hide scrollbar after scroll stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    navElement.addEventListener('scroll', handleScroll);
    
    return () => {
      navElement.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-60 bg-background border-r border-border flex flex-col h-screen">
      {/* Logo - Responsive: Icon for mobile/tablet, Logo for desktop */}
      <div className="p-1 border-b border-border flex-shrink-0">
        <Link href="/" className="flex items-center justify-center">
          {/* Desktop: Show full logos */}
          <div className="hidden lg:block">
            {theme === 'light' ? (
              <BoostMyLeadWhiteLogo width={220} height={110} className="hover:opacity-80 transition-opacity text-black" />
            ) : (
              <BoostMyLeadLogo width={220} height={110} className="hover:opacity-80 transition-opacity" />
            )}
          </div>
          
          {/* Mobile/Tablet: Show icons only */}
          <div className="lg:hidden">
            {theme === 'light' ? (
              <BoostMyLeadWhiteIcon width={64} height={64} className="hover:opacity-80 transition-opacity text-black" />
            ) : (
              <BoostMyLeadIcon width={64} height={64} className="hover:opacity-80 transition-opacity" />
            )}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav 
        ref={navRef}
        className={`flex-1 p-3 overflow-y-auto sidebar-scroll ${isScrolling ? 'scrolling' : ''}`}
      >
        <div className="mb-4">
          {/* Workspace Header - Clickable to toggle */}
          <button
            onClick={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted rounded-md transition-colors"
          >
            <span>Workspace</span>
            {isWorkspaceExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>

          {/* Collapsible Navigation Items */}
          {isWorkspaceExpanded && (
            <div className="mt-2 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                
                // Handle Help Center as external link
                if (item.id === "help") {
                  return (
                    <a
                      key={item.id}
                      href="https://app.gitbook.com/o/VoBFYcr481NPAX0SNGdR/s/UKa6LlU2btwycsQ9Ht5W/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 text-foreground hover:bg-muted"
                    >
                      <Icon className="mr-3 w-4 h-4" />
                      {item.label}
                    </a>
                  );
                }
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? "bg-[#F74000] text-white shadow-lg"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="mr-3 w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-border space-y-1 flex-shrink-0">
        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 text-foreground hover:bg-muted"
        >
          <LogOut className="mr-3 w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Organization Info Bar */}
      <div className="bg-muted/50 border-t border-border p-3 flex-shrink-0">
        <Link href="/profile" className="flex items-center space-x-3 hover:bg-muted rounded-md p-2 -m-2 transition-all duration-200">
          <div className="w-8 h-8 bg-[#F74000]/20 rounded-lg flex items-center justify-center">
            <Building className="w-4 h-4 text-[#F74000]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {isLoadingUserOrg ? (
                <span className="animate-pulse bg-muted rounded w-24 h-4 block"></span>
              ) : (
                userOrgData?.data?.organization?._doc?.name || 
                userOrgData?.data?.organization?.name || 
                "Organization"
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isLoadingUserOrg ? (
                <span className="animate-pulse bg-muted rounded w-16 h-3 block mt-1"></span>
              ) : (
                (() => {
                  const plan = userOrgData?.data?.organization?._doc?.plan || 
                              userOrgData?.data?.organization?.plan || 
                              "plan";
                  return plan.charAt(0).toUpperCase() + plan.slice(1);
                })()
              )}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
