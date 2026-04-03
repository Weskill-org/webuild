import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, DollarSign, Plus, Gift, IndianRupee, CreditCard } from "lucide-react";
import useRealtime from "@/hooks/use-realtime";
import { useAuth } from "@/providers/AuthProvider";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { createRazorpayOrder, openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "@/hooks/use-toast";

const Wallet = () => {
  const { wallets, transactions, walletBalance } = useRealtime();
  const { user, profile } = useAuth();

  const [addFundAmount, setAddFundAmount] = useState("");
  const [addFundLoading, setAddFundLoading] = useState(false);
  const [addFundOpen, setAddFundOpen] = useState(false);

  const [giftCode, setGiftCode] = useState("");
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);

  const quickAmounts = [500, 1000, 2000, 5000];

  const handleAddFunds = async () => {
    const amount = parseFloat(addFundAmount);
    if (!amount || amount < 1 || !user) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Enter a valid amount (min ₹1)." });
      return;
    }

    setAddFundLoading(true);
    try {
      const { order_id, key_id } = await createRazorpayOrder({
        projectId: "wallet_topup",
        amount,
        currency: "INR",
        userId: user.id,
      });

      const result = await openRazorpayCheckout(
        order_id,
        key_id,
        amount,
        "Wallet Top-Up",
        user.email || ""
      );

      if (result.success) {
        // Credit wallet via edge function or direct insert
        const wallet = wallets[0];
        if (wallet) {
          await supabase.from("transactions").insert({
            wallet_id: wallet.id,
            type: "credit",
            amount,
            description: `Wallet top-up via Razorpay (${result.paymentId})`,
          });
          await supabase.from("wallets").update({
            balance: (wallet.balance ?? 0) + amount,
          }).eq("id", wallet.id);
        }
        toast({ title: "Funds added!", description: `₹${amount.toFixed(2)} added to your wallet.` });
        setAddFundOpen(false);
        setAddFundAmount("");
      } else {
        toast({ variant: "destructive", title: "Payment failed", description: result.error || "Payment was not completed." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Something went wrong." });
    } finally {
      setAddFundLoading(false);
    }
  };

  const handleRedeemGiftCard = async () => {
    if (!giftCode.trim() || !user) {
      toast({ variant: "destructive", title: "Enter a gift card code" });
      return;
    }

    setGiftLoading(true);
    try {
      // Find the gift card
      const { data: card, error: findErr } = await supabase
        .from("gift_cards" as any)
        .select("*")
        .eq("code", giftCode.trim().toUpperCase())
        .eq("redeemed", false)
        .single();

      if (findErr || !card) {
        toast({ variant: "destructive", title: "Invalid or already redeemed", description: "This gift card code is invalid or has already been used." });
        setGiftLoading(false);
        return;
      }

      const giftCard = card as any;

      // Redeem: update gift card
      const { error: redeemErr } = await supabase
        .from("gift_cards" as any)
        .update({ redeemed: true, redeemed_by: user.id, redeemed_at: new Date().toISOString() })
        .eq("id", giftCard.id);

      if (redeemErr) {
        toast({ variant: "destructive", title: "Redemption failed", description: redeemErr.message });
        setGiftLoading(false);
        return;
      }

      // Credit wallet
      const wallet = wallets[0];
      if (wallet) {
        await supabase.from("transactions").insert({
          wallet_id: wallet.id,
          type: "credit",
          amount: giftCard.amount,
          description: `Gift card redeemed (${giftCard.code})`,
        });
        await supabase.from("wallets").update({
          balance: (wallet.balance ?? 0) + giftCard.amount,
        }).eq("id", wallet.id);
      }

      toast({ title: "Gift card redeemed! 🎉", description: `₹${Number(giftCard.amount).toFixed(2)} added to your wallet.` });
      setGiftOpen(false);
      setGiftCode("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setGiftLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Wallet</h1>

        {/* Balance card */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <div className="flex items-center gap-1">
                <IndianRupee className="w-7 h-7" />
                <p className="text-4xl font-bold">{walletBalance.toFixed(2)}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">INR</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <WalletIcon className="w-7 h-7 text-primary" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            {/* Add Funds Dialog */}
            <Dialog open={addFundOpen} onOpenChange={setAddFundOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 gap-2">
                  <Plus className="w-4 h-4" /> Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Add Funds via Razorpay
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter amount"
                      value={addFundAmount}
                      onChange={(e) => setAddFundAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amt) => (
                      <Button
                        key={amt}
                        variant={addFundAmount === String(amt) ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAddFundAmount(String(amt))}
                      >
                        ₹{amt}
                      </Button>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    disabled={addFundLoading || !addFundAmount}
                    onClick={handleAddFunds}
                  >
                    {addFundLoading ? "Processing..." : `Pay ₹${addFundAmount || "0"}`}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Secured by Razorpay. UPI, Cards, Net Banking accepted.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Gift Card Dialog */}
            <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 gap-2">
                  <Gift className="w-4 h-4" /> Redeem Gift Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" /> Redeem Gift Card
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Gift Card Code</Label>
                    <Input
                      placeholder="e.g. WEBUILD-XXXX-XXXX"
                      value={giftCode}
                      onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                      className="font-mono tracking-wider"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the code from your gift card. Each card can only be used once.
                  </p>
                  <Button
                    className="w-full"
                    disabled={giftLoading || !giftCode.trim()}
                    onClick={handleRedeemGiftCard}
                  >
                    {giftLoading ? "Redeeming..." : "Redeem Card"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Transactions */}
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Transaction History</h2>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="credit">Credits</TabsTrigger>
              <TabsTrigger value="debit">Debits</TabsTrigger>
            </TabsList>
          </div>

          {["all", "credit", "debit"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-3">
                {transactions
                  .filter((tx) => tab === "all" || tx.type === tab)
                  .length > 0 ? (
                  transactions
                    .filter((tx) => tab === "all" || tx.type === tab)
                    .map((tx) => (
                      <Card key={tx.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === "credit"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : tx.type === "debit"
                              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}>
                            {tx.type === "credit" ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : tx.type === "debit" ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <DollarSign className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{tx.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.description || "Transaction"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            tx.type === "credit"
                              ? "text-green-600 dark:text-green-400"
                              : tx.type === "debit"
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }`}>
                            {tx.type === "credit" ? "+" : tx.type === "debit" ? "-" : ""}
                            ₹{Math.abs(tx.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </Card>
                    ))
                ) : (
                  <Card className="p-8 text-center">
                    <WalletIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No transactions yet</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
