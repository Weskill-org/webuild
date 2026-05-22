import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { 
  Calendar, 
  Clock, 
  ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import allPostsData from "@/blogPosts.json";
import { generateSlug } from "@/utils/slugify";

const Blog = () => {
  const navigate = useNavigate();
  const allPosts = allPostsData;

  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = () => {
    setIsLoading(true);
    // Simulate a small delay for better user feel
    setTimeout(() => {
      setVisibleCount(prev => prev + 3);
      setIsLoading(false);
    }, 600);
  };

  const visiblePosts = allPosts.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="pt-20 pb-12 px-4 container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Webuild <span className="text-primary italic">Blog</span></h1>
            <p className="text-lg text-muted-foreground font-medium">Insights, news, and engineering stories from the Webuild team.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {visiblePosts.map((post, i) => (
              <article 
                key={i} 
                onClick={() => navigate(`/blog/${generateSlug(post.title)}`)}
                className="group cursor-pointer flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-in fade-in zoom-in-95"
                style={{ animationDelay: `${(i % 3) * 150}ms` }}
              >
                <div className="aspect-video w-full overflow-hidden relative">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-background/90 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-primary border border-primary/20 shadow-sm transition-transform group-hover:scale-110">
                    {post.category}
                  </div>
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-6 flex flex-col flex-1 relative bg-gradient-to-b from-card to-card/50">
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6 opacity-80 group-hover:opacity-100 transition-opacity">
                    {post.content}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <div className="flex items-center gap-2 px-2 py-1 bg-secondary/30 rounded-md">
                       <Calendar className="w-3.5 h-3.5 text-primary/70" /> {post.date}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-secondary/30 rounded-md">
                       <Clock className="w-3.5 h-3.5 text-primary/70" /> {post.readTime}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleCount < allPosts.length && (
            <div className="mt-20 text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
               <Button 
                variant="outline" 
                size="lg" 
                onClick={handleLoadMore}
                disabled={isLoading}
                className="rounded-full gap-2 px-8 py-6 border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/40 group relative overflow-hidden"
               >
                 {isLoading ? (
                   <div className="flex items-center gap-2">
                     <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                     Loading...
                   </div>
                 ) : (
                   <>Load More Articles <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                 )}
               </Button>
            </div>
          )}
        </section>
      </main>

      <Footer />

    </div>
  );
};

export default Blog;

