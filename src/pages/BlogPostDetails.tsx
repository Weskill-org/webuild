import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Facebook,
  Linkedin,
  MessageCircle,
  Copy,
  Check,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import allPostsData from "@/blogPosts.json";
import { generateSlug } from "@/utils/slugify";

const BlogPostDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  // Find the post matching the slug
  const post = allPostsData.find(
    (p) => generateSlug(p.title) === slug
  );

  // Update SEO Metadata dynamically
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Webuild Blog`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      const originalDescription = metaDescription?.getAttribute("content") || "";
      
      if (metaDescription) {
        // Extract first 155 chars of text without newlines for a clean meta description
        const cleanDesc = post.content.replace(/\s+/g, " ").substring(0, 155).trim() + "...";
        metaDescription.setAttribute("content", cleanDesc);
      }

      return () => {
        document.title = "Webuild | Build. Learn. Earn. - The Future of Project-Based Learning";
        if (metaDescription) {
          metaDescription.setAttribute("content", originalDescription);
        }
      };
    }
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-card border border-border/50 rounded-3xl p-8 shadow-2xl">
            <BookOpen className="w-16 h-16 text-primary mx-auto mb-6 opacity-80" />
            <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-8">
              We couldn't find the article you are looking for. It may have been moved or deleted.
            </p>
            <Button asChild className="rounded-full px-6 py-5 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40">
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out this article: ${post.title}`;
    let shareUrl = "";

    switch (platform) {
      case "x":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8">
        <article className="max-w-4xl mx-auto">
          {/* Back button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/blog")}
              className="rounded-full text-muted-foreground hover:text-foreground font-semibold flex items-center gap-2 group transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Blog
            </Button>
          </div>

          {/* Hero Header Card */}
          <div className="relative rounded-3xl overflow-hidden aspect-video max-h-[480px] w-full mb-10 shadow-2xl border border-border/20">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10">
              <span className="inline-block px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-[0.2em] rounded-full mb-4 shadow-xl border border-primary/20">
                {post.category}
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg leading-tight md:max-w-[90%]">
                {post.title}
              </h1>
            </div>
          </div>

          {/* Metadata & Stats */}
          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-muted-foreground border-b border-border/50 pb-6">
            <div className="flex items-center gap-2 bg-secondary/40 px-4 py-2 rounded-full font-semibold border border-border/30">
              <Calendar className="w-4 h-4 text-primary" /> {post.date}
            </div>
            <div className="flex items-center gap-2 bg-secondary/40 px-4 py-2 rounded-full font-semibold border border-border/30">
              <Clock className="w-4 h-4 text-primary" /> {post.readTime}
            </div>
          </div>

          {/* Body Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none mb-12">
            <div className="text-lg md:text-xl text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
              {post.content}
            </div>
          </div>

          {/* Share & Actions Section */}
          <div className="pt-8 border-t border-border/50 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                Share this post:
              </span>
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShare("x")}
                        className="w-10 h-10 rounded-full hover:bg-black hover:text-white transition-all duration-300 border border-border/50 hover:border-black"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5">
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
                        onClick={() => handleShare("facebook")}
                        className="w-10 h-10 rounded-full hover:bg-[#1877F2] hover:text-white transition-all duration-300 border border-border/50 hover:border-[#1877F2]"
                      >
                        <Facebook className="w-4.5 h-4.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share on Facebook</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShare("linkedin")}
                        className="w-10 h-10 rounded-full hover:bg-[#0A66C2] hover:text-white transition-all duration-300 border border-border/50 hover:border-[#0A66C2]"
                      >
                        <Linkedin className="w-4.5 h-4.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share on LinkedIn</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShare("whatsapp")}
                        className="w-10 h-10 rounded-full hover:bg-[#25D366] hover:text-white transition-all duration-300 border border-border/50 hover:border-[#25D366]"
                      >
                        <MessageCircle className="w-4.5 h-4.5" />
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
                        className="w-10 h-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-300 border border-border/50 hover:border-primary/30"
                      >
                        {isCopied ? (
                          <Check className="w-4.5 h-4.5 text-green-500" />
                        ) : (
                          <Copy className="w-4.5 h-4.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isCopied ? "Copied!" : "Copy Link"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            <Button
              className="rounded-full px-8 py-5 font-bold shadow-lg shadow-primary/10 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              onClick={() => navigate("/blog")}
            >
              Back to Articles
            </Button>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostDetails;
