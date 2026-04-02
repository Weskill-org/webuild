import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Zap, Heart, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Careers = () => {
  const navigate = useNavigate();

  const scrollToOpenings = () => {
    const element = document.getElementById("openings");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };
  const jobs = [
    { title: "Senior Frontend Engineer", department: "Engineering", location: "Remote", type: "Full-time" },
    { title: "Product Manager", department: "Product", location: "Bengaluru, KA", type: "Full-time" },
    { title: "Developer Advocate", department: "DevRel", location: "Remote", type: "Full-time" },
    { title: "UX/UI Designer", department: "Design", location: "New York, NY", type: "Contract" },
  ];

  const values = [
    { icon: Users, title: "Collaborative Spirit", desc: "We build together and win together." },
    { icon: Zap, title: "Fast Execution", desc: "We move fast and embrace iteration." },
    { icon: Heart, title: "Care Deeply", desc: "We care about our users, product, and each other." },
    { icon: Globe, title: "Global Impact", desc: "We aim to make a difference worldwide." },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Join the <span className="text-primary">Webuild</span> team
            </h1>
            <p className="text-xl text-muted-foreground mb-10">
              Help us reshape the future of collaborative learning and bridge the gap between education and industry.
            </p>
            <Button size="lg" className="rounded-full px-8 gap-2" onClick={scrollToOpenings}>
              View Openings <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {values.map((v, i) => (
                <div key={i} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                    <v.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions Section */}
        <section id="openings" className="py-24 px-4 container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-10">Open Positions</h2>
          <div className="flex flex-col gap-4">
            {jobs.map((job, index) => (
              <div key={index} className="group p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer">
                <div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">{job.department}</span>
                    <span>•</span>
                    <span>{job.location}</span>
                    <span>•</span>
                    <span>{job.type}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={() => navigate("/role-selection")}
                >
                  Apply Now
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
