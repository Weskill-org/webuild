import { ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import useRealtime from "@/hooks/use-realtime";
import usePushNotifications from "@/hooks/use-push-notifications";
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
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  X,
  ChevronRight,
  ChevronDown,
  Gift,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import weskillLogo from "@/assets/weskill logo.avif";


interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: any;
  path: string;
  roles?: string[];
  badge?: number;
  subItems?: { label: string; path: string }[];
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { unreadMessages, unreadNotifications } = useRealtime();
  usePushNotifications(); // Register for FCM push on native platforms
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleSubMenu = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Projects", icon: Briefcase, path: "/projects", roles: ["company", "campus"] },
    { 
      label: "My Projects", icon: Briefcase, path: "/student-projects", roles: ["student"],
      subItems: [
        { label: "Applied", path: "/student-projects?tab=applied" },
        { label: "Accepted", path: "/student-projects?tab=accepted" },
        { label: "Completed", path: "/student-projects?tab=completed" }
      ]
    },
    { label: "Post Project", icon: PlusCircle, path: "/projects/new", roles: ["company"] },
    { label: "Browse Projects", icon: Search, path: "/marketplace", roles: ["student", "campus"] },
    { label: "Leaderboard", icon: Trophy, path: "/leaderboard" },
    { label: "Activity Feed", icon: Activity, path: "/activity" },
    { label: "Quizzes", icon: GraduationCap, path: "/quizzes", roles: ["student"] },
    { label: "Resources", icon: BookOpen, path: "/resources" },
    { label: "Batches", icon: BookOpen, path: "/batches", roles: ["campus"] },
    { label: "Students", icon: Users, path: "/students", roles: ["campus"] },
    { label: "Analytics", icon: BarChart3, path: "/campus-analytics", roles: ["campus"] },
    { label: "Partnerships", icon: Handshake, path: "/partnerships", roles: ["company", "campus"] },
    { label: "Disputes", icon: AlertTriangle, path: "/disputes" },
    { label: "Messages", icon: MessageSquare, path: "/messages", badge: unreadMessages },
    { label: "Refer & Earn", icon: Gift, path: "/refer", roles: ["student"] },
    { label: "Wallet", icon: Wallet, path: "/wallet" },
    { label: "Certificates", icon: Award, path: "/certificates" },
    { label: "Notifications", icon: Bell, path: "/notifications", badge: unreadNotifications },
    { label: "Settings", icon: Settings, path: "/settings" },
    { label: "Admin", icon: Shield, path: "/admin", roles: ["admin"] },
  ];

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile?.role ?? "")
  );

  // Primary bottom bar items (first 4 items + "More")
  const mobileBottomItems = filteredNav.slice(0, 4);
  // Remaining items go in the "More" drawer
  const mobileMoreItems = filteredNav.slice(4);

  // Check if any "more" item is active
  const isMoreItemActive = mobileMoreItems.some(
    (item) => location.pathname === item.path
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleMobileNav = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ==================== DESKTOP SIDEBAR (unchanged) ==================== */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar h-screen sticky top-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-20" : "w-64"
          }`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center gap-2 border-b border-sidebar-border transition-all duration-300 ${isSidebarCollapsed ? "px-4 justify-center" : "px-6"
          }`}>
          <div className="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center shrink-0 overflow-hidden">
            <img src={weskillLogo} alt="Weskill Logo" className="w-full h-full object-contain" />
          </div>
          {!isSidebarCollapsed && (
            <span className="text-lg font-bold text-sidebar-foreground truncate animate-fade-in">Webuild</span>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-accent-foreground transition-all duration-300 ${isSidebarCollapsed ? "mt-2" : "ml-auto"
              }`}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Profile summary */}
        <div className={`py-4 border-b border-sidebar-border transition-all duration-300 ${isSidebarCollapsed ? "px-2" : "px-4"
          }`}>
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? "flex-col" : ""}`}>
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
            {!isSidebarCollapsed && (
              <div className="min-w-0 animate-fade-in">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || profile?.company_name || profile?.university || "User"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role ?? "—"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? "px-2" : "px-3"
          }`}>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path.split('?')[0]));
            const isExpanded = expandedMenus[item.label];

            return (
              <div key={item.path} className="space-y-1">
                <button
                  onClick={() => {
                    if (item.subItems && !isSidebarCollapsed) {
                      toggleSubMenu(item.label);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center transition-colors px-3 py-2.5 rounded-lg text-sm ${isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    } ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}
                  title={isSidebarCollapsed ? item.label : ""}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate flex-1 text-left animate-fade-in">{item.label}</span>}
                  
                  {item.badge && item.badge > 0 && !isSidebarCollapsed ? (
                    <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5 animate-fade-in">
                      {item.badge}
                    </Badge>
                  ) : null}
                  {item.badge && item.badge > 0 && isSidebarCollapsed && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                  
                  {!isSidebarCollapsed && item.subItems && (
                    isExpanded ? <ChevronDown className="w-4 h-4 shrink-0 text-sidebar-foreground/50" /> : <ChevronRight className="w-4 h-4 shrink-0 text-sidebar-foreground/50" />
                  )}
                </button>
                
                {!isSidebarCollapsed && item.subItems && isExpanded && (
                  <div className="pl-9 pr-3 py-1 space-y-1 animate-fade-in">
                    {item.subItems.map((sub, idx) => {
                      const isSubActive = location.pathname + location.search === sub.path 
                        || (location.pathname === sub.path.split('?')[0] && location.search === '' && idx === 0);
                      
                      return (
                        <button
                          key={sub.path}
                          onClick={() => navigate(sub.path)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            isSubActive
                              ? "text-sidebar-accent-foreground bg-sidebar-accent/50 font-medium"
                              : "text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/30"
                          }`}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className={`p-3 border-t border-sidebar-border transition-all duration-300 ${isSidebarCollapsed ? "flex justify-center" : ""
          }`}>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center transition-colors px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive ${isSidebarCollapsed ? "justify-center" : "gap-3"
              }`}
            title={isSidebarCollapsed ? "Sign Out" : ""}
          >
            <LogOut className="w-4 h-4" />
            {!isSidebarCollapsed && <span className="animate-fade-in">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* ==================== MOBILE TOP BAR ==================== */}
        <header className="md:hidden border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-50">
          <div className="h-14 flex items-center justify-between px-4">
            {/* Left: Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center overflow-hidden">
                <img src={weskillLogo} alt="Weskill Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-foreground">Webuild</span>
            </div>

            {/* Right: Quick actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="relative w-9 h-9"
                onClick={() => navigate("/notifications")}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
                )}
              </Button>
              <button
                onClick={() => navigate("/settings")}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0"
                aria-label="Profile settings"
              >
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-primary-foreground font-medium text-xs">
                    {profile?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("") ||
                      profile?.company_name?.[0] || "?"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto relative pb-20 md:pb-8">
          <div className="hidden md:block fixed top-4 right-4 md:right-8 z-50">
            <ThemeToggle />
          </div>
          {children}
        </main>

        {/* ==================== MOBILE BOTTOM NAV BAR ==================== */}
        <nav className="md:hidden mobile-bottom-bar" id="mobile-bottom-nav">
          <div className="mobile-bottom-bar-inner">
            {mobileBottomItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleMobileNav(item.path)}
                  className={`mobile-tab-btn ${isActive ? "mobile-tab-active" : ""}`}
                  id={`mobile-tab-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="mobile-tab-icon-wrap">
                    <item.icon className="mobile-tab-icon" />
                    {item.badge && item.badge > 0 && (
                      <span className="mobile-tab-badge">{item.badge > 9 ? "9+" : item.badge}</span>
                    )}
                  </div>
                  <span className="mobile-tab-label">{item.label}</span>
                  {isActive && <div className="mobile-tab-indicator" />}
                </button>
              );
            })}

            {/* More button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`mobile-tab-btn ${isMoreItemActive ? "mobile-tab-active" : ""}`}
              id="mobile-tab-more"
            >
              <div className="mobile-tab-icon-wrap">
                <MoreHorizontal className="mobile-tab-icon" />
              </div>
              <span className="mobile-tab-label">More</span>
              {isMoreItemActive && <div className="mobile-tab-indicator" />}
            </button>
          </div>
        </nav>

        {/* ==================== MOBILE "MORE" DRAWER ==================== */}
        {isMobileMenuOpen && (
          <div className="md:hidden mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              ref={menuRef}
              className="mobile-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer handle */}
              <div className="mobile-drawer-handle-wrap">
                <div className="mobile-drawer-handle" />
              </div>

              {/* Drawer header */}
              <div className="mobile-drawer-header">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
                    {profile?.logo_url ? (
                      <img src={profile.logo_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <span className="text-primary-foreground font-medium text-sm">
                        {profile?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("") ||
                          profile?.company_name?.[0] || "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile?.full_name || profile?.company_name || profile?.university || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{profile?.role ?? "—"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer nav items */}
              <div className="mobile-drawer-nav">
                {mobileMoreItems.map((item, index) => {
                  const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path.split('?')[0]));
                  const isExpanded = expandedMenus[item.label];

                  return (
                    <div key={item.path} className="w-full">
                      <button
                        onClick={() => {
                          if (item.subItems) {
                            toggleSubMenu(item.label);
                          } else {
                            handleMobileNav(item.path);
                          }
                        }}
                        className={`mobile-drawer-item ${isActive ? "mobile-drawer-item-active" : ""}`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className={`mobile-drawer-item-icon ${isActive ? "mobile-drawer-item-icon-active" : ""}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="text-xs px-2 py-0.5 min-w-[1.5rem] h-5">
                            {item.badge}
                          </Badge>
                        )}
                        {item.subItems ? (
                          isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/50 shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                        )}
                      </button>

                      {item.subItems && isExpanded && (
                        <div className="pl-12 pr-4 py-1 space-y-1 mb-2 animate-fade-in">
                          {item.subItems.map((sub, idx) => {
                            const isSubActive = location.pathname + location.search === sub.path 
                              || (location.pathname === sub.path.split('?')[0] && location.search === '' && idx === 0);
                            
                            return (
                              <button
                                key={sub.path}
                                onClick={() => handleMobileNav(sub.path)}
                                className={`w-full text-left py-2 text-sm transition-colors ${
                                  isSubActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sign out at bottom */}
              <div className="mobile-drawer-footer">
                <button
                  onClick={handleSignOut}
                  className="mobile-drawer-signout"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-sm font-medium text-destructive">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
