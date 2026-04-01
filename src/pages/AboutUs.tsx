import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Users, Target, ShieldCheck, Heart, Sparkles } from "lucide-react";

const AboutUs = () => {
    const values = [
        { icon: Users, title: "Our Community", desc: "We are a diverse group of thinkers and doers from all over the world." },
        { icon: Target, title: "Our Mission", desc: "To bridge the gap between education and global industries." },
        { icon: ShieldCheck, title: "Our Commitment", desc: "We are dedicated to maintaining a secure and reliable platform." },
        { icon: Heart, title: "Our Passion", desc: "We love creating intuitive and impactful experiences." },
    ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="pt-24 pb-20 px-4">
          <div className="container mx-auto text-center max-w-4xl mb-24">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Building the <span className="text-primary italic">Bridge</span> to the Future
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                At Webuild, we believe that education should be as practical as it is theoretical. 
                We are building a platform that empowers the next generation of builders.
            </p>
          </div>

          <div className="container mx-auto max-w-7xl px-4">
              <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
                <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
                        <Sparkles className="w-4 h-4" /> Our Story
                    </div>
                    <h2 className="text-4xl font-bold leading-tight">Empowering students and companies to collaborate effortlessly.</h2>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        Webuild was founded with a simple idea: that real-world experience is the best teacher. 
                        We started by connecting local students with small projects, and today we’ve grown into a global network.
                    </p>
                    <p className="text-xl text-muted-foreground leading-relaxed text-lg italic border-l-4 border-primary pl-8 py-4">
                        "Our goal is to make industry experience accessible to every student, regardless of their location or background."
                    </p>
                </div>
                <div className="bg-card border border-border/50 rounded-3xl p-12 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full -ml-16 -mb-16 group-hover:scale-150 transition-transform duration-500"></div>
                    <h3 className="text-2xl font-bold mb-8">Our Vision</h3>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        To become the global standard for verified professional skills and real-world project collaboration. 
                        We envision a world where every student graduates with a portfolio of impactful contributions.
                    </p>
                </div>
              </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
              {values.map((v, i) => (
                <div key={i} className="bg-card p-8 rounded-3xl border border-border/50 hover:bg-primary/5 transition-all duration-300 transform hover:scale-105">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm">
                    <v.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{v.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
