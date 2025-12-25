import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Coins, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp,
  Loader2,
  CheckCircle,
  Sparkles,
  CreditCard,
  Star
} from "lucide-react";
import type { Transaction } from "@shared/schema";

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

  const { data: packages, isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await apiRequest("POST", "/api/credits/checkout", { packageId });
      return res.json();
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
    const success = params.get("success");
    const sessionId = params.get("session_id");
    const canceled = params.get("canceled");

    if (success === "true" && sessionId) {
      fetch(`/api/credits/verify/${sessionId}`, {
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{user?.credits || 0}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
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
            Secure payment powered by Stripe. Credits are non-refundable.
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
