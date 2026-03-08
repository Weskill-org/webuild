import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, DollarSign } from "lucide-react";
import useRealtime from "@/hooks/use-realtime";
import DashboardLayout from "@/components/DashboardLayout";

const Wallet = () => {
  const { wallets, transactions, walletBalance } = useRealtime();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Wallet</h1>

        {/* Balance card */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <p className="text-4xl font-bold">${walletBalance.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {wallets[0]?.currency || "USD"}
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <WalletIcon className="w-7 h-7 text-primary" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button className="flex-1">Add Funds</Button>
            <Button variant="outline" className="flex-1">Withdraw</Button>
          </div>
        </Card>

        {/* Transactions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
          <div className="grid gap-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <Card key={tx.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "credit" ? "bg-green-100 text-green-600" :
                      tx.type === "debit" ? "bg-red-100 text-red-600" :
                      "bg-yellow-100 text-yellow-600"
                    }`}>
                      {tx.type === "credit" ? <ArrowDownLeft className="w-5 h-5" /> :
                       tx.type === "debit" ? <ArrowUpRight className="w-5 h-5" /> :
                       <DollarSign className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.type}</p>
                      <p className="text-sm text-muted-foreground">{tx.description || "Transaction"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === "credit" ? "text-green-600" : tx.type === "debit" ? "text-red-600" : ""}`}>
                      {tx.type === "credit" ? "+" : tx.type === "debit" ? "-" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
