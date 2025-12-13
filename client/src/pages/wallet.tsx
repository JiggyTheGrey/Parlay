import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Copy, 
  Check,
  TrendingUp,
  QrCode,
  Loader2,
  AlertCircle
} from "lucide-react";
import type { Transaction } from "@shared/schema";

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const mockDepositAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      return await apiRequest("POST", "/api/wallet/deposit", { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Deposit successful!", description: "Funds added to your wallet." });
      setDepositAmount("");
    },
    onError: (error: Error) => {
      toast({ title: "Deposit failed", description: error.message, variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: string; address: string }) => {
      return await apiRequest("POST", "/api/wallet/withdraw", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Withdrawal initiated!", description: "Funds will be sent shortly." });
      setWithdrawAmount("");
      setWithdrawAddress("");
    },
    onError: (error: Error) => {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    },
  });

  const copyAddress = () => {
    navigator.clipboard.writeText(mockDepositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Address copied!" });
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes("win") || type === "deposit" || type === "team_payout") {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    if (type.includes("win") || type === "deposit" || type === "team_payout") {
      return "text-green-500";
    }
    return "text-red-500";
  };

  const balance = parseFloat(user?.balance || "0");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your crypto balance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="font-mono text-4xl font-bold" data-testid="text-wallet-balance">
                {balance.toFixed(4)}
              </p>
              <p className="text-xl text-muted-foreground">BTC</p>
              <p className="mt-2 text-sm text-muted-foreground">
                ~${(balance * 67000).toFixed(2)} USD
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Deposit or withdraw funds</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="deposit">
              <TabsList className="w-full">
                <TabsTrigger value="deposit" className="flex-1" data-testid="tab-deposit">Deposit</TabsTrigger>
                <TabsTrigger value="withdraw" className="flex-1" data-testid="tab-withdraw">Withdraw</TabsTrigger>
              </TabsList>

              <TabsContent value="deposit" className="mt-6 space-y-4">
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Your Deposit Address</p>
                      <p className="font-mono text-xs text-muted-foreground break-all">
                        {mockDepositAddress}
                      </p>
                    </div>
                    <Button variant="outline" size="icon" onClick={copyAddress}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center py-4">
                  <div className="flex h-32 w-32 items-center justify-center rounded-md border bg-white">
                    <QrCode className="h-20 w-20 text-black" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Mock Deposit (Demo)</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Amount in BTC"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="font-mono"
                      data-testid="input-deposit-amount"
                    />
                    <Button 
                      onClick={() => depositMutation.mutate(depositAmount)}
                      disabled={!depositAmount || depositMutation.isPending}
                      data-testid="button-deposit"
                    >
                      {depositMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Deposit
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is a demo feature. In production, you'd send BTC to the address above.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="withdraw" className="mt-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Withdrawal Address</label>
                    <Input
                      placeholder="Enter BTC address"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      className="font-mono"
                      data-testid="input-withdraw-address"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="Amount in BTC"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="font-mono"
                        data-testid="input-withdraw-amount"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => setWithdrawAmount(balance.toString())}
                      >
                        Max
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {balance.toFixed(4)} BTC
                    </p>
                  </div>

                  {parseFloat(withdrawAmount) > balance && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      Insufficient balance
                    </div>
                  )}

                  <Button 
                    className="w-full"
                    onClick={() => withdrawMutation.mutate({ amount: withdrawAmount, address: withdrawAddress })}
                    disabled={
                      !withdrawAmount || 
                      !withdrawAddress || 
                      parseFloat(withdrawAmount) > balance ||
                      withdrawMutation.isPending
                    }
                    data-testid="button-withdraw"
                  >
                    {withdrawMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Withdraw
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Network fee: ~0.00005 BTC | Processing time: ~10 minutes
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All your wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-md p-4 border"
                  data-testid={`transaction-row-${tx.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.type.includes("win") || tx.type === "deposit" || tx.type === "team_payout"
                        ? "bg-green-500/10" 
                        : "bg-red-500/10"
                    }`}>
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {tx.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.description || tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-medium ${getTransactionColor(tx.type)}`}>
                      {tx.type.includes("win") || tx.type === "deposit" || tx.type === "team_payout" ? "+" : "-"}
                      {parseFloat(tx.amount).toFixed(4)} BTC
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt!).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-2 font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Make a deposit to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
