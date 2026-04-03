import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Linkedin, Link as LinkIcon, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CertData {
  id: string;
  certificate_uid: string;
  display_id: string | null;
  project_title: string | null;
  company_name: string | null;
  course_name: string | null;
  issued_at: string | null;
  student_name: string | null;
}

const VerifyCertificate = () => {
  const { uid } = useParams<{ uid: string }>();
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("certificates")
        .select("*, profiles!certificates_student_id_fkey(full_name)")
        .eq("certificate_uid", uid)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        const certData = data as any;
        setCert({
          id: certData.id,
          certificate_uid: certData.certificate_uid,
          display_id: certData.display_id,
          project_title: certData.project_title,
          company_name: certData.company_name,
          course_name: certData.course_name,
          issued_at: certData.issued_at,
          student_name: certData.profiles?.full_name ?? null,
        });
      }
      setLoading(false);
    })();
  }, [uid]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard!" });
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-4xl">
        {/* Actions Bar */}
        {!notFound && cert && (
          <div className="flex justify-end gap-3 mb-6">
            <Button variant="outline" className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50" onClick={handleCopyLink}>
              <LinkIcon className="w-4 h-4 mr-2" /> Copy Link
            </Button>
            <Button variant="outline" className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
            <Button className="bg-[#0A66C2] hover:bg-[#004182] text-white" onClick={handleLinkedInShare}>
              <Linkedin className="w-4 h-4 mr-2" /> Share on LinkedIn
            </Button>
          </div>
        )}

        {notFound ? (
          <Card className="w-full p-8 text-center bg-white shadow-xl">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Certificate Not Found</h1>
            <p className="text-muted-foreground">
              The certificate ID <code className="text-sm bg-secondary px-2 py-1 rounded">{uid}</code> could not be verified.
            </p>
          </Card>
        ) : cert ? (
          <div className="relative bg-white drop-shadow-2xl overflow-hidden print:shadow-none">
            {/* Premium Border container */}
            <div className="absolute inset-0 m-4 border-[12px] border-double border-primary/20 pointer-events-none"></div>
            <div className="absolute inset-0 m-8 border border-primary/10 pointer-events-none"></div>
            
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            </div>

            <div className="relative z-10 px-10 py-16 sm:px-20 sm:py-24 flex flex-col items-center text-center">
              {/* Header */}
              <div className="mb-12">
                <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4">Webuild Authenticated</h2>
                <h1 className="text-4xl sm:text-6xl font-serif text-slate-800 mb-2">Certificate of Completion</h1>
              </div>

              {/* Main content */}
              <p className="text-lg text-slate-600 mb-4 italic">This confirms that</p>
              
              <h3 className="text-3xl sm:text-4xl font-bold text-primary mb-6 pb-2 border-b-2 border-primary/20 inline-block px-8">
                {cert.student_name}
              </h3>

              <p className="text-lg text-slate-600 mb-6 max-w-2xl">
                Has successfully completed the requirements for the project
              </p>

              <h4 className="text-2xl font-bold text-slate-800 mb-2">
                {cert.project_title}
              </h4>
              {cert.course_name && (
                <p className="text-slate-500 mb-8 tracking-wide uppercase text-sm">{cert.course_name}</p>
              )}

              <p className="text-lg text-slate-600 mb-4">Issued in partnership with</p>
              <h5 className="text-xl font-bold text-slate-800 mb-16">{cert.company_name}</h5>

              {/* Footer details */}
              <div className="w-full flex flex-col sm:flex-row justify-between items-end mt-8 pt-8 border-t border-slate-200">
                <div className="text-left mb-6 sm:mb-0">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
                  <p className="font-medium text-slate-800">{new Date(cert.issued_at!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* The Seal */}
                <div className="relative flex flex-col items-center justify-center">
                  <img src="/src/assets/webuild_authenticity_seal.png" alt="Webuild Seal" className="w-32 h-32 object-contain" />
                  <div className="absolute -bottom-4 flex items-center justify-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-bold text-green-700">Verified Authentic</span>
                  </div>
                </div>

                <div className="text-right mt-6 sm:mt-0">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Certificate ID</p>
                  <p className="font-mono font-medium text-slate-700">{cert.display_id || cert.certificate_uid.split('-')[0]}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VerifyCertificate;
