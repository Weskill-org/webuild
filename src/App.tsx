import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "@/providers/AuthProvider";
import PrivateRoute from "@/components/PrivateRoute";
import PublicRoute from "@/components/PublicRoute";
import Landing from "./pages/Landing";
import RoleSelection from "./pages/RoleSelection";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ProfileSettings from "./pages/ProfileSettings";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import PublicProfile from "./pages/PublicProfile";
import CreateProject from "./pages/CreateProject";
import ProjectMarketplace from "./pages/ProjectMarketplace";
import Wallet from "./pages/Wallet";
import Certificates from "./pages/Certificates";
import Batches from "./pages/Batches";
import Students from "./pages/Students";
import StudentProjects from "./pages/StudentProjects";
import VerifyCertificate from "./pages/VerifyCertificate";
import AdminDashboard from "./pages/AdminDashboard";
import Leaderboard from "./pages/Leaderboard";
import Portfolio from "./pages/Portfolio";
import LearningResources from "./pages/LearningResources";
import SkillQuizzes from "./pages/SkillQuizzes";
import ActivityFeed from "./pages/ActivityFeed";
import Disputes from "./pages/Disputes";
import Partnerships from "./pages/Partnerships";
import CampusAnalytics from "./pages/CampusAnalytics";
import NotFound from "./pages/NotFound";
import Careers from "./pages/Careers";
import Partners from "./pages/Partners";
import Blog from "./pages/Blog";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import AboutUs from "./pages/AboutUs";
import ExploreProjects from "./pages/ExploreProjects";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/dashboard" replace /> : <Landing />} />
            
            {/* Public Auth Routes (Redirect to dashboard if logged in) */}
            <Route element={<PublicRoute />}>
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Public Footer Pages */}
            <Route path="/careers" element={<Careers />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/explore-projects" element={<ExploreProjects />} />

            <Route path="/verify/:uid" element={<VerifyCertificate />} />
            
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<ProfileSettings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<CreateProject />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/profile/:id" element={<PublicProfile />} />
              <Route path="/portfolio/:id" element={<Portfolio />} />
              <Route path="/marketplace" element={<ProjectMarketplace />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/students" element={<Students />} />
              <Route path="/student-projects" element={<StudentProjects />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/resources" element={<LearningResources />} />
              <Route path="/quizzes" element={<SkillQuizzes />} />
              <Route path="/activity" element={<ActivityFeed />} />
              <Route path="/disputes" element={<Disputes />} />
              <Route path="/partnerships" element={<Partnerships />} />
              <Route path="/campus-analytics" element={<CampusAnalytics />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
