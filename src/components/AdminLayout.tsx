import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Shield, ShieldAlert, LayoutDashboard, Settings, Users, Briefcase,
  FolderTree, ListChecks, UserPlus, AlertTriangle, BarChart3,
  Gift, Wallet, Award, Cog, Loader2, PanelLeftClose, PanelLeftOpen,
  ChevronRight, LogOut, ArrowLeft, Menu, X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import weskillLogo from "@/assets/weskill logo.avif";

interface AdminNavItem {
  label: string;
  icon: any;
  path: string;
  group: string;
}

const adminNavItems: AdminNavItem[] = [
  { label: "Overview",                icon: LayoutDashboard, path: "/admin/overview",           group: "Main" },
  { label: "Platform Settings",       icon: Settings,        path: "/admin/platform-settings",  group: "Platform" },
  { label: "User Management",         icon: Users,           path: "/admin/users",              group: "Management" },
  { label: "Project Management",      icon: Briefcase,       path: "/admin/projects",           group: "Management" },
  { label: "Categories",              icon: FolderTree,      path: "/admin/categories",         group: "Content Config" },
  { label: "Eligibility Criteria",    icon: ListChecks,      path: "/admin/eligibility",        group: "Content Config" },
  { label: "Referrals",               icon: UserPlus,        path: "/admin/referrals",          group: "Moderation" },
  { label: "Disputes",                icon: AlertTriangle,   path: "/admin/disputes",           group: "Moderation" },
  { label: "Reports & Analytics",     icon: BarChart3,       path: "/admin/reports",            group: "Moderation" },
  { label: "Gift Cards",              icon: Gift,            path: "/admin/gift-cards",         group: "Finance" },
  { label: "Wallet Management",       icon: Wallet,          path: "/admin/wallets",            group: "Finance" },
  { label: "Certificates",            icon: Award,           path: "/admin/certificates",       group: "Other" },
  { label: "System Settings",         icon: Cog,             path: "/admin/system-settings",    group: "Platform" },
];

// Group items for sidebar sections
const groupOrder = ["Main", "Platform", "Management", "Content Config", "Moderation", "Finance", "Other"];

function getGroupedNav() {
  const grouped: Record<string, AdminNavItem[]> = {};
  for (const item of adminNavItems) {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  }
  return groupOrder.filter((g) => grouped[g]).map((g) => ({ group: g, items: grouped[g] }));
}

function getBreadcrumbs(pathname: string) {
  const crumbs = [{ label: "Admin", path: "/admin/overview" }];
  const current = adminNavItems.find((i) => pathname.startsWith(i.path));
  if (current) {
    crumbs.push({ label: current.label, path: current.path });
  }
  return crumbs;
}

export default function AdminLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = profile?.role === "admin";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const breadcrumbs = getBreadcrumbs(location.pathname);
  const groupedNav = getGroupedNav();

  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Logo / Brand */}
      <div className={`admin-sidebar-brand ${collapsed && !isMobile ? "admin-sidebar-brand-collapsed" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        {(!collapsed || isMobile) && (
          <span className="text-base font-bold text-sidebar-foreground truncate animate-fade-in">
            Admin Console
          </span>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="admin-sidebar-toggle"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="admin-sidebar-toggle">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Profile */}
      <div className={`admin-sidebar-profile ${collapsed && !isMobile ? "admin-sidebar-profile-collapsed" : ""}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <span className="text-primary-foreground font-medium text-xs">
              {profile?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("") || "A"}
            </span>
          )}
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 animate-fade-in">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || profile?.company_name || "Admin"}
            </p>
            <p className="text-xs text-primary font-medium">Administrator</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`admin-sidebar-nav ${collapsed && !isMobile ? "px-2" : "px-3"}`}>
        {groupedNav.map(({ group, items }) => (
          <div key={group} className="admin-sidebar-group">
            {(!collapsed || isMobile) && (
              <p className="admin-sidebar-group-label animate-fade-in">{group}</p>
            )}
            {collapsed && !isMobile && <div className="admin-sidebar-group-divider" />}
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                  className={`admin-sidebar-item ${isActive ? "admin-sidebar-item-active" : ""} ${collapsed && !isMobile ? "justify-center" : ""}`}
                  title={collapsed && !isMobile ? item.label : ""}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="truncate flex-1 text-left animate-fade-in">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <button
          onClick={() => navigate("/dashboard")}
          className={`admin-sidebar-item text-sidebar-foreground/60 hover:text-primary ${collapsed && !isMobile ? "justify-center" : ""}`}
          title={collapsed && !isMobile ? "Back to Dashboard" : ""}
        >
          <ArrowLeft className="w-4 h-4" />
          {(!collapsed || isMobile) && <span className="animate-fade-in">Back to Dashboard</span>}
        </button>
        <button
          onClick={async () => { /* signOut would go here */ navigate("/"); }}
          className={`admin-sidebar-item text-sidebar-foreground/60 hover:text-destructive ${collapsed && !isMobile ? "justify-center" : ""}`}
          title={collapsed && !isMobile ? "Sign Out" : ""}
        >
          <LogOut className="w-4 h-4" />
          {(!collapsed || isMobile) && <span className="animate-fade-in">Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col admin-sidebar h-screen sticky top-0 ${collapsed ? "w-[68px]" : "w-64"}`}>
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <aside
            className="admin-sidebar w-72 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slideInLeft 0.3s ease-out" }}
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="admin-header">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <nav className="flex items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`${i === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                    } transition-colors`}
                  >
                    {crumb.label}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
