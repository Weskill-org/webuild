import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { UserCircle2, Building, GraduationCap, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HowItWorks = () => {
  const navigate = useNavigate();
  const steps = [
    {
      group: "For Students",
      icon: GraduationCap,
      items: [
        { title: "Create Your Profile", desc: "Showcase your skills, education, and past projects to potential partners." },
        { title: "Browse Projects", desc: "Find real-world projects matching your interests and expertise levels." },
        { title: "Collaborate & Learn", desc: "Work with companies, get mentored, and gain industry experience." },
        { title: "Earn & Certify", desc: "Get paid for your contributions and receive verified certificates." }
      ]
    },
    {
      group: "For Companies",
      icon: Building,
      items: [
        { title: "Post a Project", desc: "Define your project needs and find talented students to collaborate." },
        { title: "Select Talent", desc: "Review profiles and select the best candidates for your projects." },
        { title: "Collaborate Directly", desc: "Manage projects and communicate with students within our platform." },
        { title: "Scale Innovation", desc: "Build your talent pipeline and accelerate project delivery." }
      ]
    },
    {
      group: "For Campuses",
      icon: UserCircle2,
      items: [
        { title: "Register Campus", desc: "Join our network and offer your students real industry exposure." },
        { title: "Track Progress", desc: "Monitor student performance and project outcomes in real-time." },
        { title: "Curriculum Alignment", desc: "Align external projects with your internal course credits." },
        { title: "Foster Growth", desc: "Empower your students with hands-on experience and industry connections." }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="pt-24 pb-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              A Simple <span className="text-primary italic">Process</span> for Everyone
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              We've built a seamless platform that connects students, companies, and campuses through verified projects.
            </p>
          </div>

          <div className="container mx-auto max-w-7xl px-4 flex flex-col gap-24">
            {steps.map((step, groupIndex) => (
              <div key={groupIndex} className="relative">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-bold">{step.group}</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {step.items.map((item, i) => (
                    <div key={i} className="bg-card p-6 rounded-3xl border border-border/50 relative group">
                      <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg">
                        {i + 1}
                      </div>
                      <h3 className="text-xl font-bold mb-3 mt-4 group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                      {i < step.items.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 -right-4 translate-x-1/2 -translate-y-1/2 z-10 text-muted-foreground/30">
                          <ChevronRight className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-primary/5 py-24 px-4">
            <div className="container mx-auto text-center max-w-3xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-8">Ready to take the first step?</h2>
                <div className="flex gap-4 justify-center">
                    <Button 
                      size="lg" 
                      className="rounded-full px-8"
                      onClick={() => navigate("/role-selection")}
                    >
                      Get Started Now
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="rounded-full px-8"
                      onClick={() => navigate("/features")}
                    >
                      Learn More
                    </Button>
                </div>
            </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;

