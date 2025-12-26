import { Link } from "wouter";
import { Wallet, Bell, Plus, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoImage from "@assets/Logo_parlay_1766742512751.png";

export function Header() {
  const { user, isAuthenticated } = useAuth();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <img src={logoImage} alt="Parlay-it" className="h-12 w-auto" />
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link href="/matches/create">
              <Button size="sm" data-testid="button-create-match">
                <Plus className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Create Match</span>
              </Button>
            </Link>

            <Link href="/wallet">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-wallet">
                <Wallet className="h-4 w-4" />
                <span className="font-mono">
                  {(user?.credits || 0).toLocaleString()} credits
                </span>
              </Button>
            </Link>

            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
            </Button>

            <ThemeToggle />

            <a href="/api/logout">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-logout-header">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log Out</span>
              </Button>
            </a>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      alt={user?.firstName || "User"} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="flex cursor-pointer items-center gap-2 text-destructive" data-testid="button-logout">
                    <LogOut className="h-4 w-4" />
                    Log out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">Log In</Button>
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
