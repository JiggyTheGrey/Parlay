import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Coins, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp,
  Loader2,
  Sparkles,
  CreditCard,
  Star,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import type { Transaction, WithdrawalRequest } from "@shared/schema";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonus?: number;
  priceUsd: number;
  popular?: boolean;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [withdrawCredits, setWithdrawCredits] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const { data: packages, isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: withdrawalRequests, isLoading: withdrawalsLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ["/api/withdrawal/requests"],
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { credits: number; bankName: string; accountNumber: string; accountName: string }) => {
      return await apiRequest("POST", "/api/withdrawal/request", data);
    },
    onSuccess: () => {
      toast({ title: "Withdrawal requested", description: "Your withdrawal is pending admin approval." });
      setWithdrawCredits("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawal/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: Error) => {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      return await apiRequest("POST", "/api/credits/checkout", { packageId });
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      setPurchaseLoading(null);
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    const trxref = params.get("trxref");
    const canceled = params.get("canceled");

    const paymentRef = reference || trxref;
    
    if (paymentRef) {
      fetch(`/api/credits/verify/${paymentRef}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast({ 
              title: "Purchase successful!", 
              description: `${data.credits} credits have been added to your account.` 
            });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          } else {
            toast({ 
              title: "Payment pending", 
              description: "Your payment is being processed. Credits will be added once confirmed.",
              variant: "default"
            });
          }
          window.history.replaceState({}, document.title, "/wallet");
        })
        .catch(() => {
          window.history.replaceState({}, document.title, "/wallet");
        });
    } else if (canceled === "true") {
      toast({ title: "Purchase cancelled", description: "No charges were made.", variant: "destructive" });
      window.history.replaceState({}, document.title, "/wallet");
    }
  }, [toast]);

  const handlePurchase = (packageId: string) => {
    setPurchaseLoading(packageId);
    purchaseMutation.mutate(packageId);
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes("win") || type === "credit_purchase" || type === "team_payout" || type === "wager_refund") {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    if (type.includes("win") || type === "credit_purchase" || type === "team_payout" || type === "wager_refund") {
      return "text-green-500";
    }
    return "text-red-500";
  };

  const formatCredits = (credits: number) => {
    return credits.toLocaleString();
  };

  const credits = user?.credits || 0;
  const withdrawableCredits = user?.withdrawableCredits || 0;
  const WITHDRAWAL_FEE = 5;
  const MIN_WITHDRAWAL = 100;

  const handleWithdraw = () => {
    const creditsNum = parseInt(withdrawCredits);
    if (!creditsNum || creditsNum < MIN_WITHDRAWAL) {
      toast({ title: "Invalid amount", description: `Minimum withdrawal is ${MIN_WITHDRAWAL} credits ($2)`, variant: "destructive" });
      return;
    }
    if (!bankName || !accountNumber || !accountName) {
      toast({ title: "Missing information", description: "Please fill in all bank details", variant: "destructive" });
      return;
    }
    withdrawMutation.mutate({ credits: creditsNum, bankName, accountNumber, accountName });
  };

  const getWithdrawalStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateUsdAmount = (creditAmount: number) => {
    return ((creditAmount / 100) * 2).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">
          Purchase credits and manage your balance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-[#D2A56C]" />
              Your Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="font-mono text-4xl font-bold bg-gradient-to-r from-[#D2A56C] to-[#FEFABB] bg-clip-text text-transparent" data-testid="text-credit-balance">
                {formatCredits(credits)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Available for wagering
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              Withdrawable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="font-mono text-4xl font-bold text-green-500" data-testid="text-withdrawable-balance">
                {formatCredits(withdrawableCredits)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                ~${calculateUsdAmount(withdrawableCredits)} USD
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {transactions?.filter(t => t.type === "credit_purchase").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Purchases</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {transactions?.filter(t => t.type === "wager_win").reduce((sum, t) => sum + t.credits, 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Won</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {withdrawableCredits >= MIN_WITHDRAWAL && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Request Withdrawal
            </CardTitle>
            <CardDescription>
              Withdraw your winnings to your bank account. 100 credits = $2 USD. {WITHDRAWAL_FEE} credits fee per withdrawal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-credits">Credits to Withdraw</Label>
                  <Input
                    id="withdraw-credits"
                    type="number"
                    min={MIN_WITHDRAWAL}
                    max={withdrawableCredits - WITHDRAWAL_FEE}
                    placeholder={`Min ${MIN_WITHDRAWAL} credits`}
                    value={withdrawCredits}
                    onChange={(e) => setWithdrawCredits(e.target.value)}
                    data-testid="input-withdraw-credits"
                  />
                  {withdrawCredits && parseInt(withdrawCredits) >= MIN_WITHDRAWAL && (
                    <p className="text-sm text-muted-foreground">
                      You will receive: ${calculateUsdAmount(parseInt(withdrawCredits))} USD
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    placeholder="e.g., First Bank, GTBank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    data-testid="input-bank-name"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account-number">Account Number</Label>
                  <Input
                    id="account-number"
                    placeholder="Your bank account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    data-testid="input-account-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    placeholder="Name on your bank account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    data-testid="input-account-name"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                Withdrawal fee: {WITHDRAWAL_FEE} credits. Admin approval required.
              </p>
              <Button 
                onClick={handleWithdraw}
                disabled={withdrawMutation.isPending}
                data-testid="button-withdraw"
              >
                {withdrawMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                ) : (
                  "Request Withdrawal"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {withdrawalRequests && withdrawalRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {withdrawalRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-md p-4 border"
                  data-testid={`withdrawal-row-${req.id}`}
                >
                  <div>
                    <p className="font-medium">{formatCredits(req.credits)} credits (${req.usdAmount})</p>
                    <p className="text-sm text-muted-foreground">
                      {req.bankName} - {req.accountNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    {getWithdrawalStatusBadge(req.status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy Credits
          </CardTitle>
          <CardDescription>
            Purchase credits to start wagering with your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packagesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`relative overflow-visible ${pkg.popular ? "ring-2 ring-[#D2A56C]" : ""}`}
                  data-testid={`package-card-${pkg.id}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-[#D2A56C] to-[#FEFABB] text-black">
                        <Star className="mr-1 h-3 w-3" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <h3 className="font-bold text-lg">{pkg.name}</h3>
                      <div>
                        <p className="text-3xl font-bold">
                          {formatCredits(pkg.credits)}
                        </p>
                        {pkg.bonus && pkg.bonus > 0 && (
                          <Badge variant="secondary" className="mt-1">
                            +{formatCredits(pkg.bonus)} bonus
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-semibold text-muted-foreground">
                        ${(pkg.priceUsd / 100).toFixed(2)}
                      </p>
                      <Button 
                        className="w-full"
                        variant={pkg.popular ? "default" : "outline"}
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={purchaseLoading === pkg.id || purchaseMutation.isPending}
                        data-testid={`button-buy-${pkg.id}`}
                      >
                        {purchaseLoading === pkg.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Buy Now"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Credit packages are not available at the moment.
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Secure payment powered by Paystack. Credits are non-refundable.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>All your credit activity</CardDescription>
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
                      tx.type.includes("win") || tx.type === "credit_purchase" || tx.type === "team_payout" || tx.type === "wager_refund"
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
                      {tx.type.includes("win") || tx.type === "credit_purchase" || tx.type === "team_payout" || tx.type === "wager_refund" ? "+" : "-"}
                      {formatCredits(tx.credits)} credits
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Coins className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-2 font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Purchase credits to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
