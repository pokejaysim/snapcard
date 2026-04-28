/**
 * eBay OAuth callback — slab/scanner edition.
 *
 * The OAuth round-trip lands here. Two visual states:
 *   - Linking (the success path before we redirect away): "scanning"
 *     overlay over a placeholder while the API call resolves.
 *   - Failed: red ink-bordered slab with retry / go back actions.
 *
 * Behaviour preserved 1:1 — same effect, same retry flow, same
 * destination resolution from localStorage.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Slab, SlabButton } from "@/components/slab";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function EbayCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      setError("No authorization code received from eBay");
      return;
    }

    if (!state) {
      setError("No security state received from eBay. Please try linking again.");
      return;
    }

    apiFetch<{ message: string; ebay_user_id: string }>("/auth/ebay-callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    })
      .then(() => {
        const returnTo = localStorage.getItem("snapcard_ebay_return");
        const listingId = localStorage.getItem("snapcard_ebay_listing_id");
        localStorage.removeItem("snapcard_ebay_return");
        localStorage.removeItem("snapcard_ebay_listing_id");

        const destination =
          returnTo === "onboarding"
            ? "/onboarding"
            : returnTo === "account"
              ? "/account"
              : returnTo === "listing" && listingId
                ? `/listings/${listingId}`
                : "/dashboard";
        navigate(destination, { replace: true });
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to link eBay account",
        );
      });
  }, [searchParams, navigate]);

  async function handleRetry() {
    setRetrying(true);
    setError("");
    try {
      const { url } = await apiFetch<{ url: string }>("/auth/ebay-oauth-url");
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start eBay authorization",
      );
      setRetrying(false);
    }
  }

  function handleGoBack() {
    const returnTo = localStorage.getItem("snapcard_ebay_return");
    const listingId = localStorage.getItem("snapcard_ebay_listing_id");
    localStorage.removeItem("snapcard_ebay_return");
    localStorage.removeItem("snapcard_ebay_listing_id");

    const destination =
      returnTo === "onboarding"
        ? "/onboarding"
        : returnTo === "account"
          ? "/account"
          : returnTo === "listing" && listingId
            ? `/listings/${listingId}`
            : "/dashboard";
    navigate(destination, { replace: true });
  }

  if (error) {
    return (
      <div
        className="slab-theme"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          position: "relative",
        }}
      >
        <div
          className="card-grid-bg"
          style={{ position: "absolute", inset: 0, opacity: 0.4 }}
        />
        <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
          <Slab
            label="EBAY LINK FAILED"
            grade="!"
            cert="OAUTH ERROR"
            foot={
              <>
                <span>AUTH CODES EXPIRE QUICKLY</span>
                <span>RETRY SAFELY</span>
              </>
            }
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: "#c44536",
                color: "var(--paper)",
                padding: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 1,
                border: "2px solid var(--ink)",
              }}
            >
              <AlertTriangle className="size-4 shrink-0" />
              <div style={{ flex: 1 }}>! {error}</div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-marker)",
                fontSize: 13,
                color: "var(--ink-soft)",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              eBay authorization codes expire within minutes. If this keeps
              happening, try again — you'll be redirected to eBay to re-authorize.
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1.5px dashed var(--ink)",
              }}
            >
              <SlabButton
                primary
                onClick={handleRetry}
                disabled={retrying}
                style={{ flex: 1 }}
              >
                <RefreshCw
                  className={`size-4 ${retrying ? "animate-spin" : ""}`}
                />
                TRY AGAIN
              </SlabButton>
              <SlabButton onClick={handleGoBack}>
                <ArrowLeft className="size-3" />
                BACK
              </SlabButton>
            </div>
          </Slab>
        </div>
      </div>
    );
  }

  // Linking — short-lived state before the redirect, but show the
  // scanner overlay so the wait reads as "actively working" not "stuck".
  return (
    <div
      className="slab-theme"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        position: "relative",
      }}
    >
      <div
        className="card-grid-bg"
        style={{ position: "absolute", inset: 0, opacity: 0.4 }}
      />
      <div style={{ width: "100%", maxWidth: 360, position: "relative" }}>
        <Slab
          label="LINKING EBAY"
          grade="◉"
          cert="OAUTH HANDSHAKE"
          foot={
            <>
              <span>SECURE · TLS</span>
              <span>~3 SECONDS</span>
            </>
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "24px 8px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 110,
                aspectRatio: "5/7",
                border: "2px solid var(--ink)",
                background: "var(--paper-2)",
                overflow: "hidden",
              }}
            >
              <div className="scan-overlay">
                <div className="scan-corner tl" />
                <div className="scan-corner tr" />
                <div className="scan-corner bl" />
                <div className="scan-corner br" />
                <div
                  className="scan-line"
                  style={{ animationIterationCount: "infinite" }}
                />
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                className="hand"
                style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}
              >
                Linking your eBay account…
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: 1.5,
                  color: "var(--ink-soft)",
                  marginTop: 6,
                }}
              >
                ◉ EXCHANGING AUTHORIZATION CODE FOR TOKEN
              </div>
            </div>
          </div>
        </Slab>
      </div>
    </div>
  );
}
