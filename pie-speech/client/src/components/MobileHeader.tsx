import { Menu, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoostMyLeadLogo } from "@/components/BoostMyLeadLogo";
import { BoostMyLeadWhiteLogo } from "@/components/BoostmyLeadwhite";
import { BoostMyLeadIcon } from "@/components/BoostMyLeadIcon";
import { BoostMyLeadWhiteIcon } from "@/components/BoostMyLeadWhiteIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth, useLogout } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { user } = useAuth();
  const logout = useLogout();
  const { theme } = useTheme();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return "U";
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background">
      {/* Left side - Menu button and Logo */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="p-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/">
          {/* Mobile/Tablet: Always use icons for space efficiency */}
          {theme === 'light' ? (
            <BoostMyLeadWhiteIcon width={32} height={32} className="hover:opacity-80 transition-opacity text-black" />
          ) : (
            <BoostMyLeadIcon width={32} height={32} className="hover:opacity-80 transition-opacity" />
          )}
        </Link>
      </div>

      {/* Right side - User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}