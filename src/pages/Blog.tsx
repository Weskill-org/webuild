import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { BookOpen, Calendar, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Blog = () => {
  const posts = [
    { title: "The Future of Collaborative Learning", category: "Education", date: "Oct 24, 2026", readTime: "5 min read", image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
    { title: "Building Scalable Real-time Systems", category: "Engineering", date: "Oct 20, 2026", readTime: "8 min read", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
    { title: "Design Systems that Scale", category: "Design", date: "Oct 15, 2026", readTime: "6 min read", image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
    { title: "Community Driven Open Source", category: "Community", date: "Oct 10, 2026", readTime: "4 min read", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
    { title: "Accelerating Junior Dev Careers", category: "Career", date: "Oct 05, 2026", readTime: "7 min read", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
    { title: "The Art of Writing Good Code Reviews", category: "Engineering", date: "Oct 01, 2026", readTime: "6 min read", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header content */}
        <section className="pt-20 pb-12 px-4 container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Webuild <span className="text-primary italic">Blog</span></h1>
            <p className="text-lg text-muted-foreground">Insights, news, and engineering stories from the Webuild team.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {posts.map((post, i) => (
              <article key={i} className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div className="aspect-video w-full overflow-hidden relative">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-background/80 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-primary">
                    {post.category}
                  </div>
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                  <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4" /> {post.date}
                    </div>
                    <div className="flex items-center gap-2">
                       <Clock className="w-4 h-4" /> {post.readTime}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center">
             <Button variant="outline" size="lg" className="rounded-full gap-2">Load More Articles <ChevronRight className="w-4 h-4" /></Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
