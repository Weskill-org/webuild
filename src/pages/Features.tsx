import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Briefcase, BookOpen, Award, MessageSquare, Wallet, Building2, ShieldCheck, Zap, Globe } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Briefcase,
      title: "Real Projects",
      description: "Work on actual industry projects from top companies ranging from startups to Fortune 500s."
    },
    {
      icon: BookOpen,
      title: "Learn by Doing",
      description: "Gain practical experience while earning, and build a professional portfolio that stands out."
    },
    {
      icon: Award,
      title: "Get Certified",
      description: "Earn verified certificates for completed projects, recognized by industry leaders."
    },
    {
      icon: MessageSquare,
      title: "Direct Communication",
      description: "Connect directly with companies and mentors through our encrypted messaging system."
    },
    {
      icon: Wallet,
      title: "Earn While Learning",
      description: "Get paid for your contributions and build your financial foundation while studying."
    },
    {
      icon: Building2,
      title: "Campus Integration",
      description: "Seamless integration with your university curriculum and credit systems."
    },
    {
        icon: ShieldCheck,
        title: "Secure Verification",
        title2: "Fraud Protection",
        description: "All projects and certificates are secured and verified on our platform."
    },
    {
        icon: Zap,
        title: "Fast Matching",
        description: "Our AI-powered matching system connects you with the right project in minutes."
    },
    {
        icon: Globe,
        title: "Global Network",
        description: "Join a worldwide community of builders and innovators from across the globe."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="pt-24 pb-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Powerful <span className="text-primary italic">Features</span> for Builders
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Everything you need to bridge the gap between education and industry in one unified platform.
            </p>
          </div>

          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <Card 
                  key={i} 
                  className="p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-2 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                    <feature.icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Features;
