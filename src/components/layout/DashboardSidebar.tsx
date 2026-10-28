import React from "react";
import { NavLink } from "react-router-dom";
import {
  Compass,
  LayoutDashboard,
  Briefcase,
  FileText,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  onItemClick?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onItemClick }) => {
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Overview", to: "/dashboard", icon: LayoutDashboard, end: true },
    { name: "Job Applications", to: "/dashboard/applications", icon: Briefcase },
    { name: "Resume Intelligence", to: "/dashboard/resume", icon: FileText, badge: "AI" },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground">CareerPilot</span>
            <span className="text-[10px] text-muted-foreground -mt-0.5 font-medium">WORKSPACE</span>
          </div>
        </NavLink>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-3">
            Core Copilot
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.end}
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Pro Plan Feature Teaser */}
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Copilot Pro</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Automatic resume keyword tailoring for high ATS pass-rates.
          </p>
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden mb-2">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full w-4/5 rounded-full" />
          </div>
          <p className="text-[11px] text-muted-foreground">80% weekly application goal reached</p>
        </div>
      </div>

      {/* User Session Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-accent/40 border border-border/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"}
              alt={user?.fullName || "User"}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-border shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.fullName || "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log out"
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
