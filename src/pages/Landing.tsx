import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, BookOpen, Briefcase, Building2, Award, MessageSquare, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Briefcase,
      title: "Real Projects",
      description: "Work on actual industry projects from top companies"
    },
    {
      icon: BookOpen,
      title: "Learn by Doing",
      description: "Gain practical experience while earning"
    },
    {
      icon: Award,
      title: "Get Certified",
      description: "Earn verified certificates for completed projects"
    },
    {
      icon: MessageSquare,
      title: "Direct Communication",
      description: "Connect directly with companies and mentors"
    },
    {
      icon: Wallet,
      title: "Earn While Learning",
      description: "Get paid for your contributions"
    },
    {
      icon: Building2,
      title: "Campus Integration",
      description: "Seamless integration with your university"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-sm font-medium">The Future of Collaborative Learning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Build. Learn.{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-blue-600 bg-clip-text text-transparent">
              Earn.
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with real companies, work on meaningful projects, and earn while you learn. 
            The bridge between education and industry.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/role-selection")} className="gap-2 text-base">
              Join as Student <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/role-selection")}>
              Post a Project
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 pb-20">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Webuild?</h2>
          <p className="text-muted-foreground text-lg">Everything you need in one platform</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to get started</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: "01", title: "Choose Your Role", desc: "Sign up as a Student, Company, or Campus" },
              { step: "02", title: "Find or Post Projects", desc: "Browse opportunities or post your project needs" },
              { step: "03", title: "Collaborate & Earn", desc: "Work together, learn skills, and earn certificates" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Building?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of students, companies, and campuses already collaborating on Webuild
          </p>
          <Button size="lg" onClick={() => navigate("/role-selection")} className="gap-2">
            Get Started Now <ArrowRight className="w-5 h-5" />
          </Button>
        </Card>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;