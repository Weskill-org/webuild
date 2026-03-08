import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CertData {
  id: string;
  certificate_uid: string;
  project_title: string | null;
  company_name: string | null;
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
        setCert({
          id: data.id,
          certificate_uid: data.certificate_uid,
          project_title: data.project_title,
          company_name: data.company_name,
          issued_at: data.issued_at,
          student_name: (data as any).profiles?.full_name ?? null,
        });
      }
      setLoading(false);
    })();
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center">
        {notFound ? (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Certificate Not Found</h1>
            <p className="text-muted-foreground">
              The certificate ID <code className="text-sm bg-secondary px-2 py-1 rounded">{uid}</code> could not be verified.
            </p>
          </>
        ) : cert ? (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Award className="w-10 h-10 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Verified</Badge>
            </div>
            <h1 className="text-2xl font-bold mb-6">Certificate of Completion</h1>
            <div className="space-y-3 text-left">
              {cert.student_name && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">{cert.student_name}</span>
                </div>
              )}
              {cert.project_title && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium">{cert.project_title}</span>
                </div>
              )}
              {cert.company_name && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{cert.company_name}</span>
                </div>
              )}
              {cert.issued_at && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Issued</span>
                  <span className="font-medium">{new Date(cert.issued_at).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Certificate ID</span>
                <span className="font-mono text-xs">{cert.certificate_uid}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              This certificate was issued by Webuild and is verified authentic.
            </p>
          </>
        ) : null}
      </Card>
    </div>
  );
};

export default VerifyCertificate;
