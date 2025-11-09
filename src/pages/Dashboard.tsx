import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Bell, 
  Wallet, 
  Award, 
  MessageSquare, 
  Settings,
  TrendingUp,
  Clock,
  DollarSign
} from "lucide-react";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const projects = [
    {
      id: 1,
      title: "E-commerce Website Development",
      company: "TechCorp Solutions",
      budget: "$2,000 - $3,000",
      duration: "3 months",
      skills: ["React", "Node.js", "MongoDB"],
      applicants: 12
    },
    {
      id: 2,
      title: "Mobile App UI/UX Design",
      company: "StartupHub",
      budget: "$1,500 - $2,500",
      duration: "2 months",
      skills: ["Figma", "UI/UX", "Prototyping"],
      applicants: 8
    },
    {
      id: 3,
      title: "AI Chatbot Integration",
      company: "InnovateLabs",
      budget: "$3,000 - $5,000",
      duration: "4 months",
      skills: ["Python", "TensorFlow", "NLP"],
      applicants: 15
    }
  ];

  const stats = [
    { label: "Active Projects", value: "2", icon: TrendingUp, color: "text-blue-600" },
    { label: "Completed", value: "8", icon: Award, color: "text-green-600" },
    { label: "Wallet Balance", value: "$2,450", icon: DollarSign, color: "text-purple-600" },
    { label: "Hours Worked", value: "156", icon: Clock, color: "text-orange-600" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-xl font-bold">Webuild</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-white font-medium">JD</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Welcome back, John! 👋</h1>
          <p className="text-muted-foreground">Here's what's happening with your projects today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </div>

        {/* Recommended Projects */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recommended Projects</h2>
            <Button variant="link">View All</Button>
          </div>

          <div className="grid gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                    <p className="text-muted-foreground">{project.company}</p>
                  </div>
                  <Badge variant="secondary">{project.applicants} applicants</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    {project.budget}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {project.duration}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {project.skills.map((skill, index) => (
                    <Badge key={index} variant="outline">{skill}</Badge>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1">Apply Now</Button>
                  <Button variant="outline">View Details</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;