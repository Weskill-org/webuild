import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone, MessageSquare } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
              
              {/* Left Column: Contact Info */}
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Get in touch</h1>
                <p className="text-xl text-muted-foreground mb-12">
                  Have a question, feedback, or need help? Our team is here for you. Drop us a message and we'll reply as soon as possible.
                </p>

                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Email us</h4>
                      <p className="text-muted-foreground mb-1">For general inquiries</p>
                      <a href="mailto:hello@webuild.app" className="text-primary hover:underline font-medium">hello@webuild.app</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Support</h4>
                      <p className="text-muted-foreground mb-1">Need technical help?</p>
                      <a href="mailto:support@webuild.app" className="text-primary hover:underline font-medium">support@webuild.app</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Office</h4>
                      <p className="text-muted-foreground">
                        123 Builder Lane, Suite 400<br />
                        San Francisco, CA 94107
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
                <h3 className="text-2xl font-bold mb-6">Send us a message</h3>
                <form className="space-y-6">
                   <div className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
                       <input type="text" id="firstName" className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Jane" />
                     </div>
                     <div className="space-y-2">
                       <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
                       <input type="text" id="lastName" className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Doe" />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label htmlFor="email" className="text-sm font-medium">Email</label>
                     <input type="email" id="email" className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="jane@example.com" />
                   </div>

                   <div className="space-y-2">
                     <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                     <input type="text" id="subject" className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="How can we help?" />
                   </div>

                   <div className="space-y-2">
                     <label htmlFor="message" className="text-sm font-medium">Message</label>
                     <textarea id="message" rows={5} className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Your message here..."></textarea>
                   </div>

                   <Button type="button" className="w-full" size="lg">Send Message</Button>
                </form>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
