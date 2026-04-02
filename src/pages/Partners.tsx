import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Building2, Handshake, Network, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Partners = () => {
  const navigate = useNavigate();
  const benefits = [
    { icon: Network, title: "Unmatched Reach", desc: "Connect with thousands of students and companies actively building and learning." },
    { icon: ShieldCheck, title: "Verified Network", desc: "Partner with a trusted ecosystem where identities and skills are verified." },
    { icon: Handshake, title: "Dedicated Support", desc: "Get priority access to our support team for a seamless partnership experience." },
  ];

  const partners = [
    "Google", "Microsoft", "Amazon", "Meta", "Stripe", "Vercel", "Supabase", "Github"
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8 text-primary font-medium text-sm">
              <Building2 className="w-4 h-4" /> Partner Program
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Grow with <span className="text-primary">Webuild</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 mx-auto max-w-2xl leading-relaxed">
              Join our network of industry leaders, educational institutions, and innovators reshaping the tech ecosystem.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="rounded-full px-8" onClick={() => navigate("/role-selection")}>Become a Partner</Button>
              <Button size="lg" variant="outline" className="rounded-full px-8" onClick={() => navigate("/contact?subject=Partnership%20Inquiry")}>Talk to Sales</Button>
            </div>
          </div>
        </section>

        {/* Dynamic Logo Marquee (Simulated with grid for now) */}
        <section className="py-20 bg-secondary/20 border-y border-border/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-10">Trusted by modern teams</h2>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {partners.map((p, i) => (
                <div key={i} className="text-2xl md:text-4xl font-black text-foreground/80 tracking-tighter">
                  {p}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 px-4 container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Why partner with us?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {benefits.map((b, i) => (
              <div key={i} className="bg-card p-8 rounded-3xl border border-border/50 hover:border-primary/50 transition-colors duration-300">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <b.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{b.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-4xl bg-primary rounded-[3rem] p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Ready to grow with us?</h2>
              <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
                Join our ecosystem and start building the future of tech. Whether you're a campus or a company, we have a place for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="rounded-full px-10 h-14 text-lg font-semibold group"
                  onClick={() => navigate("/role-selection")}
                >
                  Get Started <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="rounded-full px-10 h-14 text-lg font-semibold bg-white/10 border-white/20 hover:bg-white/20 text-white"
                  onClick={() => navigate("/contact?subject=Partnership%20Inquiry")}
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Partners;
