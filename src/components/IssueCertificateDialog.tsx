import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Award, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

interface IssueCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  projectName: string;
  companyName: string;
  onConfirm: () => Promise<string | undefined>;
}

const IssueCertificateDialog = ({
  open,
  onOpenChange,
  studentName,
  projectName,
  companyName,
  onConfirm,
}: IssueCertificateDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const uid = await onConfirm();
      if (uid) {
        setShareLink(`${window.location.origin}/verify/${uid}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareLinkedIn = () => {
    if (!shareLink) return;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && shareLink) setShareLink(null);
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Issue Certificate
          </DialogTitle>
          <DialogDescription>
            {shareLink 
              ? "The certificate has been successfully issued! A shareable public link has been generated."
              : "Review the certificate details below before issuing it to the student. This action will generate a public verification link."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border-primary/20 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Student</span>
              <span className="font-medium text-right">{studentName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Project</span>
              <span className="font-medium text-right">{projectName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Issued By</span>
              <span className="font-medium text-right">{companyName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-right">{new Date().toLocaleDateString()}</span>
            </div>
          </Card>
          
          {shareLink && (
            <div className="mt-4 p-3 bg-secondary/50 rounded-lg text-sm break-all font-mono">
              {shareLink}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {!shareLink ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                Issue & Generate Link
              </Button>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button className="flex-1 bg-[#0A66C2] hover:bg-[#004182] text-white gap-2" onClick={handleShareLinkedIn}>
                <ExternalLink className="w-4 h-4" />
                Share on LinkedIn
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IssueCertificateDialog;
