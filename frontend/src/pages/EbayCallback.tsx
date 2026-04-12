import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function EbayCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setError("No authorization code received from eBay");
      return;
    }

    apiFetch<{ message: string; ebay_user_id: string }>("/auth/ebay-callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
      .then(() => {
        const returnTo = localStorage.getItem("snapcard_ebay_return");
        const listingId = localStorage.getItem("snapcard_ebay_listing_id");
        localStorage.removeItem("snapcard_ebay_return");
        localStorage.removeItem("snapcard_ebay_listing_id");

        const destination =
          returnTo === "onboarding" ? "/onboarding"
          : returnTo === "account" ? "/account"
          : returnTo === "listing" && listingId ? `/listings/${listingId}`
          : "/dashboard";
        navigate(destination, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to link eBay account");
      });
  }, [searchParams, navigate]);

  async function handleRetry() {
    setRetrying(true);
    setError("");
    try {
      const { url } = await apiFetch<{ url: string }>("/auth/ebay-oauth-url");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start eBay authorization");
      setRetrying(false);
    }
  }

  function handleGoBack() {
    const returnTo = localStorage.getItem("snapcard_ebay_return");
    const listingId = localStorage.getItem("snapcard_ebay_listing_id");
    localStorage.removeItem("snapcard_ebay_return");
    localStorage.removeItem("snapcard_ebay_listing_id");

    const destination =
      returnTo === "onboarding" ? "/onboarding"
      : returnTo === "account" ? "/account"
      : returnTo === "listing" && listingId ? `/listings/${listingId}`
      : "/dashboard";
    navigate(destination, { replace: true });
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              eBay Link Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Authorization codes expire quickly. If this keeps happening, try again — you'll be redirected to eBay to re-authorize.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleRetry} disabled={retrying} className="flex-1">
                {retrying ? (
                  <RefreshCw className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-4" />
                )}
                Try Again
              </Button>
              <Button variant="outline" onClick={handleGoBack}>
                <ArrowLeft className="mr-1.5 size-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Linking your eBay account...</p>
    </div>
  );
}
