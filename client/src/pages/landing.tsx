import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Swords, Users, Wallet, Shield, TrendingUp, Zap, Trophy, Calendar, Coins } from "lucide-react";
import heroImage from "@assets/generated_images/bloodstrike_hero_action_scene.png";
import battleBanner from "@assets/banner_parlay_1766688349033.png";
import logoImage from "@assets/Logo_parlay_1766742512751.png";
import { useQuery } from "@tanstack/react-query";
import type { Campaign } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Landing() {
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/active"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
        
        <div className="container relative z-10 py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30">
              <Zap className="mr-1 h-3 w-3" />
              Competitive Clan Wagering
            </Badge>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
              Wager on Your{" "}
              <span className="text-primary-gradient">Gaming</span>{" "}
              Skills
            </h1>
            
            <p className="mb-8 text-lg text-gray-300 md:text-xl">
              Challenge rival clans, stake credits, and prove your dominance. 
              The ultimate platform for competitive clan wagering.
            </p>
            
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a href="/api/login">
                <Button size="lg" className="gap-2 text-lg" data-testid="button-hero-login">
                  <Swords className="h-5 w-5" />
                  Start Competing
                </Button>
              </a>
              <Button variant="outline" size="lg" className="gap-2 text-lg bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="button-how-it-works">
                Learn How It Works
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>24 matches live</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>156 teams competing</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>50K+ credits wagered today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <a href="/api/login" className="block">
          <img 
            src={battleBanner} 
            alt="Clan vs Clan Battle" 
            className="w-full h-auto object-cover"
            data-testid="img-battle-banner"
          />
        </a>
        <div className="py-6 bg-background">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {["Blood Strike", "Call Of Duty", "Counter-Strike 2", "Valorant", "Apex Legends"].map((game) => (
              <span 
                key={game}
                className="text-sm md:text-base font-semibold bg-gradient-to-r from-[#D2A56C] to-[#FEFABB] bg-clip-text text-transparent"
              >
                {game}
              </span>
            ))}
          </div>
        </div>
      </section>

      {campaigns && campaigns.length > 0 && (
        <section className="py-16 bg-muted/30" data-testid="section-campaigns">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-10">
              <Badge variant="secondary" className="mb-4">
                <Trophy className="mr-1 h-3 w-3" />
                Active Campaigns
              </Badge>
              <h2 className="text-3xl font-bold md:text-4xl">
                Join the Competition
              </h2>
              <p className="mt-4 text-muted-foreground">
                Participate in platform-wide competitions and win credits from the prize pool
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden" data-testid={`card-campaign-${campaign.id}`}>
                  {campaign.bannerImage && (
                    <div className="relative h-32 overflow-hidden">
                      <img 
                        src={campaign.bannerImage} 
                        alt={campaign.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge variant="default" className="shrink-0">Active</Badge>
                    </div>
                    {campaign.description && (
                      <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Coins className="h-4 w-4 text-primary" />
                        <span>Prize Pool: <span className="font-semibold text-foreground">{campaign.prizePoolCredits.toLocaleString()}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span>Per Win: <span className="font-semibold text-foreground">{campaign.rewardPerWin}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Ends {format(new Date(campaign.endDate), "MMM d, yyyy")}</span>
                    </div>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button className="w-full gap-2" data-testid={`button-view-campaign-${campaign.id}`}>
                        <Swords className="h-4 w-4" />
                        View Campaign
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              How It Works
            </h2>
            <p className="mb-12 text-muted-foreground">
              Simple, secure, and fair clan-vs-clan wagering in just a few steps
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">1. Create Your Clan</h3>
                <p className="text-sm text-muted-foreground">
                  Build your squad and invite your teammates to join
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Wallet className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">2. Buy Credits</h3>
                <p className="text-sm text-muted-foreground">
                  Purchase credits to fund your team's wagers
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Swords className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">3. Challenge & Play</h3>
                <p className="text-sm text-muted-foreground">
                  Challenge opponents, set your wager, and battle it out
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">4. Win & Withdraw</h3>
                <p className="text-sm text-muted-foreground">
                  Confirm results and claim your winnings instantly
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Why Choose Parlay-it?
            </h2>
            <p className="mb-12 text-muted-foreground">
              Built by gamers, for gamers. Fair, fast, and secure.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Secure & Custodial</h3>
              <p className="text-muted-foreground">
                Your funds are protected with enterprise-grade security. 
                Full custodial control means no smart contract risks.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Fair Confirmation</h3>
              <p className="text-muted-foreground">
                Both teams confirm match results. Disputes are resolved 
                by our admin team for guaranteed fairness.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Instant Payouts</h3>
              <p className="text-muted-foreground">
                Win confirmed? Funds are instantly credited to your wallet. 
                Withdraw anytime with low fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Ready to Dominate?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join hundreds of clans already competing on Parlay-it
            </p>
            <a href="/api/login">
              <Button size="lg" className="gap-2 text-lg" data-testid="button-cta-login">
                <Swords className="h-5 w-5" />
                Create Your Clan Now
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Parlay-it" className="h-10 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground">
              2024 Parlay-it. Competitive wagering for serious gamers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
