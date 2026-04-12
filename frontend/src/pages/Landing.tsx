import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Search,
  TrendingUp,
  Send,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Card Identification",
    description:
      "Snap a photo and Claude Vision identifies your card — name, set, number, and rarity filled in instantly.",
  },
  {
    icon: Search,
    title: "Pokemon TCG Database",
    description:
      "Search the official Pokemon TCG database to auto-fill card details. Free for everyone.",
  },
  {
    icon: TrendingUp,
    title: "Smart Pricing",
    description:
      "Get market prices from PriceCharting and recent eBay sold comps so you price competitively.",
  },
  {
    icon: Send,
    title: "One-Click eBay Publish",
    description:
      "Review your listing and publish directly to eBay — title, description, and photos handled for you.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <h1 className="font-heading text-xl font-bold tracking-tight">
          <span className="text-primary">Snap</span>Card
        </h1>
        <Link to="/login">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="auth-bg px-6 pb-20 pt-16 text-center md:px-12 md:pt-24">
        <h2 className="mx-auto max-w-2xl font-heading text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          List Pokemon cards on eBay{" "}
          <span className="text-primary">in minutes</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
          Snap a photo, auto-identify, get pricing, publish. SnapCard handles
          the listing so you can focus on collecting.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 md:px-12">
        <h3 className="mb-10 text-center font-heading text-2xl font-bold tracking-tight">
          Everything you need to sell cards
        </h3>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="border">
              <CardContent className="flex gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold">
                    {feature.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        Built for Pokemon card sellers · snapcard.ca
      </footer>
    </div>
  );
}
