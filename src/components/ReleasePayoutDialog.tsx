import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, ArrowUpRight } from "lucide-react";

interface ReleasePayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectMinBudget: number;
  projectMaxBudget: number;
  onConfirm: (amount: number) => Promise<void>;
}

const ReleasePayoutDialog = ({
  open,
  onOpenChange,
  projectMinBudget,
  projectMaxBudget,
  onConfirm,
}: ReleasePayoutDialogProps) => {
  const [amount, setAmount] = useState<string>(projectMaxBudget.toString());
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    setSubmitting(true);
    try {
      await onConfirm(numAmount);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Release Payout
          </DialogTitle>
          <DialogDescription>
            The project's budget range was ${projectMinBudget} - ${projectMaxBudget}.
            Enter the final agreed amount to release to the student's wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Payout Amount (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                min={1}
                step={0.01}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            Confirm Release
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReleasePayoutDialog;
