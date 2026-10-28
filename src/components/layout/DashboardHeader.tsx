import React from "react";
import { Link } from "react-router-dom";
import { Menu, Search, ExternalLink, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  onToggleMobileNav: () => void;
  title?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onToggleMobileNav,
  title = "Dashboard",
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 text-muted-foreground hover:bg-accent rounded-lg"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">{title}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Targeting: <span className="font-medium text-foreground">{user?.targetRole || "Software Engineering"}</span>
          </p>
        </div>
      </div>

      {/* Center: Search & Status indicator */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative w-64 lg:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search applications, skills, notes..."
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Badge variant="outline" className="hidden xl:inline-flex gap-1.5 py-1 text-[11px] border-indigo-500/20 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20">
          <Sparkles className="h-3 w-3 text-indigo-600 animate-pulse" />
          AI Engine Ready
        </Badge>
      </div>

      {/* Right: Actions and Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link to="/" title="View Marketing Site">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs gap-1.5">
            <span>Storefront</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>

        <div className="h-4 w-px bg-border hidden sm:block" />

        <div className="flex items-center gap-2">
          <img
            src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"}
            alt={user?.fullName || "User"}
            className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
          />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold leading-none">{user?.fullName}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.role?.toLowerCase().replace("_", " ")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 ml-1"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
