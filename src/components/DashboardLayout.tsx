import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import useRealtime from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Bell,
  Wallet,
  Award,
  Settings,
  LogOut,
  Users,
  BookOpen,
  PlusCircle,
  Search,
  Shield,
  Trophy,
  Activity,
  AlertTriangle,
  Handshake,
  BarChart3,
  FileSpreadsheet,
  GraduationCap,
  BadgeCheck,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: any;
  path: string;
  roles?: string[];
  badge?: number;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { unreadMessages } = useRealtime();

  const navItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Projects", icon: Briefcase, path: "/projects" },
    { label: "Post Project", icon: PlusCircle, path: "/projects/new", roles: ["company"] },
    { label: "Browse Projects", icon: Search, path: "/marketplace", roles: ["student"] },
    { label: "Leaderboard", icon: Trophy, path: "/leaderboard" },
    { label: "Activity Feed", icon: Activity, path: "/activity" },
    { label: "Quizzes", icon: GraduationCap, path: "/quizzes", roles: ["student"] },
    { label: "Resources", icon: BookOpen, path: "/resources" },
    { label: "Batches", icon: BookOpen, path: "/batches", roles: ["campus"] },
    { label: "Students", icon: Users, path: "/students", roles: ["campus"] },
    { label: "Bulk Import", icon: FileSpreadsheet, path: "/bulk-import", roles: ["campus"] },
    { label: "Analytics", icon: BarChart3, path: "/campus-analytics", roles: ["campus"] },
    { label: "Partnerships", icon: Handshake, path: "/partnerships", roles: ["company", "campus"] },
    { label: "Disputes", icon: AlertTriangle, path: "/disputes" },
    { label: "Messages", icon: MessageSquare, path: "/messages", badge: unreadMessages },
    { label: "Wallet", icon: Wallet, path: "/wallet" },
    { label: "Certificates", icon: Award, path: "/certificates" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
    { label: "Settings", icon: Settings, path: "/settings" },
    { label: "Admin", icon: Shield, path: "/admin" },
  ];

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile?.role ?? "")
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">W</span>
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">Webuild</span>
        </div>

        {/* Profile summary */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-medium text-sm">
                  {profile?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("") ||
                    profile?.company_name?.[0] || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || profile?.company_name || profile?.university || "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                    {item.badge}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">W</span>
              </div>
              <span className="font-bold">Webuild</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
                <MessageSquare className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/notifications")}>
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile nav scroll */}
          <div className="flex overflow-x-auto gap-1 px-3 pb-2">
            {filteredNav.slice(0, 8).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                    }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
