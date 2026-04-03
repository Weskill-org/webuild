import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, ExternalLink, Linkedin } from "lucide-react";
import useRealtime from "@/hooks/use-realtime";
import DashboardLayout from "@/components/DashboardLayout";

const Certificates = () => {
  const { certificates } = useRealtime();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Certificates</h1>

        <div className="grid gap-4">
          {certificates.length > 0 ? (
            certificates.map((cert) => (
              <Card key={cert.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Award className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{cert.project_title}</h3>
                    <p className="text-sm text-muted-foreground">{cert.company_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Issued {new Date(cert.issued_at).toLocaleDateString()}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      ID: {cert.certificate_uid.slice(0, 8)}...
                    </Badge>
                </div>
                  <div className="flex gap-2 shrink-0 md:flex-col lg:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/verify/${cert.certificate_uid}`, "_blank")}
                      title="Verify Certificate"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#0A66C2] hover:bg-[#004182] text-white"
                      onClick={() => {
                        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                          window.location.origin + `/verify/${cert.certificate_uid}`
                        )}`;
                        window.open(url, "_blank");
                      }}
                      title="Share on LinkedIn"
                    >
                      <Linkedin className="w-4 h-4 md:mr-1 lg:mr-1" />
                      <span className="hidden md:inline lg:inline">Share</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <Award className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No certificates yet</p>
              <p className="text-sm text-muted-foreground">
                Complete projects to earn certificates
              </p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Certificates;
