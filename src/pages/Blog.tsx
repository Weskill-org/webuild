import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Share2, 
  Facebook, 
  Linkedin, 
  MessageCircle, 
  Copy, 
  Check 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import allPostsData from "@/blogPosts.json";

const Blog = () => {
  const allPosts = allPostsData;

  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedPost, setSelectedPost] = useState<null | typeof allPosts[0]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleShare = (platform: string, post: typeof allPosts[0]) => {
    const url = window.location.origin + window.location.pathname;
    const text = `Check out this article: ${post.title}`;
    let shareUrl = '';

    switch (platform) {
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
    }
  };

  const copyToClipboard = async () => {
    try {
      const url = window.location.origin + window.location.pathname;
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast({
        title: "Link Copied!",
        description: "The article link has been copied to your clipboard.",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please try again.",
      });
    }
  };

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
                onClick={() => setSelectedPost(post)}
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

      {/* Article Detail Popup */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-2xl p-0 rounded-3xl border-none shadow-2xl bg-background ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
          {selectedPost && (
            <ScrollArea className="max-h-[85vh] w-full">
              <div className="flex flex-col">
                <div className="relative h-56 md:h-72 w-full shrink-0">
                  <img 
                    src={selectedPost.image} 
                    alt={selectedPost.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-2 shadow-xl">
                      {selectedPost.category}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg leading-tight lg:max-w-[90%]">
                      {selectedPost.title}
                    </h2>
                  </div>
                </div>
                
                <div className="px-6 py-8">
                  <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-muted-foreground border-b border-border/50 pb-5">
                    <div className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1.5 rounded-full font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> {selectedPost.date}
                    </div>
                    <div className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1.5 rounded-full font-semibold">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {selectedPost.readTime}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="text-lg text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedPost.content}
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground pr-1">Share:</span>
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleShare('x', selectedPost)}
                                className="w-9 h-9 rounded-full hover:bg-black hover:text-white transition-all duration-300"
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share on X</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleShare('facebook', selectedPost)}
                                className="w-9 h-9 rounded-full hover:bg-[#1877F2] hover:text-white transition-all duration-300"
                              >
                                <Facebook className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share on Facebook</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleShare('linkedin', selectedPost)}
                                className="w-9 h-9 rounded-full hover:bg-[#0A66C2] hover:text-white transition-all duration-300"
                              >
                                <Linkedin className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share on LinkedIn</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleShare('whatsapp', selectedPost)}
                                className="w-9 h-9 rounded-full hover:bg-[#25D366] hover:text-white transition-all duration-300"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share on WhatsApp</TooltipContent>
                          </Tooltip>

                          <div className="w-px h-6 bg-border mx-1" />

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={copyToClipboard}
                                className="w-9 h-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-300"
                              >
                                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isCopied ? "Copied!" : "Copy Link"}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                    <Button 
                      className="rounded-full px-6 py-5 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300" 
                      onClick={() => setSelectedPost(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Blog;

