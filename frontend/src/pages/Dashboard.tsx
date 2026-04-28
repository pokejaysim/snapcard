/**
 * Dashboard — slab/scanner edition.
 *
 * Inventory-overview view: paper-tag listing rows with status chips, mini
 * card thumbs, monospace metadata. Stat slabs across the top, ticket-style
 * filter bar, eBay setup checklist surfaced as a slab so it can't get lost.
 *
 * Behaviour preserved 1:1 from the previous shadcn implementation —
 * listings query, usage query, eBay status, publish settings, cleanup
 * mutation, upgrade prompt, dismissible setup banner. Only the visuals
 * changed.
 */
import { Link } from "react-router-dom";
import { useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Crown,
  X,
  EyeOff,
  Trash2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  ChipMono,
  MiniCard,
  Slab,
  StatSlab,
  StatusChip,
} from "@/components/slab";
import type { EbayPublishSettingsResponse, UsageInfo } from "../../../shared/types";
import { CANADA_BETA_MARKETPLACE_ID } from "../../../shared/types";

// ── Types preserved from the old Dashboard ─────────────────

interface Listing {
  id: string;
  card_name: string;
  set_name: string | null;
  condition: string | null;
  card_type: "raw" | "graded" | null;
  grading_company: string | null;
  grade: string | null;
  status: string;
  title: string | null;
  price_cad: number | null;
  currency_code: string | null;
  created_at: string;
  scheduled_at: string | null;
  ebay_item_id: number | null;
  photos?: ListingPhoto[];
}

interface ListingPhoto {
  id: string;
  file_url: string | null;
  ebay_url: string | null;
  position: number | null;
}

function formatScheduledTime(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getListingThumbnail(listing: Listing): string | null {
  const photo = [...(listing.photos ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )[0];
  return photo?.ebay_url ?? photo?.file_url ?? null;
}

/** Short relative-time label (e.g. "2H AGO", "5D AGO"). */
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "JUST NOW";
  if (min < 60) return `${String(min)}M AGO`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${String(hr)}H AGO`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${String(d)}D AGO`;
  const mo = Math.round(d / 30);
  return `${String(mo)}MO AGO`;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [cleanupError, setCleanupError] = useState("");
  const [setupDismissed, setSetupDismissed] = useState(
    () => localStorage.getItem("snapcard_setup_dismissed") === "true",
  );
  const [filter, setFilter] = useState<
    "all" | "draft" | "scheduled" | "published" | "error"
  >("all");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => apiFetch<Listing[]>("/listings"),
  });

  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: () => apiFetch<UsageInfo>("/account/usage"),
  });

  const { data: ebayStatus } = useQuery({
    queryKey: ["ebay-status"],
    queryFn: () => apiFetch<{ linked: boolean }>("/account/ebay-status"),
  });

  const { data: publishSettings } = useQuery({
    queryKey: ["ebay-publish-settings", CANADA_BETA_MARKETPLACE_ID],
    queryFn: () =>
      apiFetch<EbayPublishSettingsResponse>(
        `/account/ebay-publish-settings?marketplace_id=${CANADA_BETA_MARKETPLACE_ID}`,
      ),
    enabled: ebayStatus?.linked === true,
  });

  async function linkEbay() {
    try {
      const { url } = await apiFetch<{ url: string }>("/auth/ebay-oauth-url");
      window.location.href = url;
    } catch (err) {
      console.error("Failed to get eBay OAuth URL:", err);
    }
  }

  const cleanupMutation = useMutation({
    mutationFn: (listing: Listing) => {
      if (listing.status === "published") {
        return apiFetch(`/listings/${listing.id}/archive`, { method: "PATCH" });
      }
      return apiFetch(`/listings/${listing.id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      setCleanupError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
      ]);
    },
    onError: (err) => {
      setCleanupError(
        err instanceof Error ? err.message : "Could not clean up this listing.",
      );
    },
  });

  function cleanUpListing(
    listing: Listing,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (listing.status === "publishing" || listing.status === "scheduled") {
      setCleanupError(
        "Wait until publishing finishes, or cancel the scheduled publish before cleaning up this listing.",
      );
      return;
    }

    const isPublished = listing.status === "published";
    const confirmed = window.confirm(
      isPublished
        ? "Hide this listing from your SnapCard dashboard? This will not end or remove the live eBay listing."
        : "Delete this draft/error listing from SnapCard?",
    );

    if (!confirmed) return;
    cleanupMutation.mutate(listing);
  }

  const drafts = listings?.filter((l) => l.status === "draft") ?? [];
  const scheduled = listings?.filter((l) => l.status === "scheduled") ?? [];
  const published = listings?.filter((l) => l.status === "published") ?? [];
  const errors = listings?.filter((l) => l.status === "error") ?? [];
  const publishSetupReady = publishSettings?.readiness.ready === true;
  const showSetupBanner =
    !setupDismissed &&
    (ebayStatus?.linked === false ||
      (ebayStatus?.linked === true && !publishSetupReady) ||
      listings?.length === 0);

  // Filter in-place, all map to a "live"-equivalent for the chip
  const filteredListings = (listings ?? []).filter((l) => {
    if (filter === "all") return true;
    if (filter === "published") return l.status === "published";
    return l.status === filter;
  });

  // Display status — map "published" → "live" for visual consistency with
  // the rest of the slab system, where everything's grouped around live/sold/draft/etc.
  function displayStatus(s: string): string {
    return s === "published" ? "live" : s;
  }

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1280, margin: "0 auto" }}>
      {showUpgrade && <UpgradePrompt onClose={() => setShowUpgrade(false)} />}

      {/* ── Header ── */}
      <div className="dashboard-header">
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 2,
              color: "var(--ink-soft)",
            }}
          >
            MODULE 01 · INVENTORY OVERVIEW
          </div>
          <div
            className="hand"
            style={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            Your listings.
          </div>
          <div
            style={{
              fontFamily: "var(--font-marker)",
              fontSize: 14,
              color: "var(--ink-soft)",
              marginTop: 6,
            }}
          >
            {published.length} live · {drafts.length} drafts · {scheduled.length}{" "}
            scheduled · {errors.length} errors
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link
            to="/listings/batch"
            className="btn"
            style={{ textDecoration: "none" }}
          >
            BATCH UPLOAD
          </Link>
          <Link
            to="/listings/new"
            className="btn primary"
            style={{ textDecoration: "none" }}
          >
            + NEW LISTING
          </Link>
        </div>
      </div>

      {/* ── Plan / Usage strip ── */}
      {usage && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 14px",
            border: "1.5px solid var(--ink)",
            background: "var(--paper-2)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ChipMono solid={usage.plan !== "free"}>
              {usage.plan === "free" ? "F · FREE" : "A · PRO"}
            </ChipMono>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 1,
                color: "var(--ink)",
              }}
            >
              {usage.listings_limit !== null
                ? `${String(usage.listings_this_month)}/${String(usage.listings_limit)} LISTINGS THIS MONTH`
                : "UNLIMITED LISTINGS"}
            </span>
          </div>
          {usage.plan === "free" && (
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                background: "var(--accent)",
                color: "var(--ink)",
                border: "1.5px solid var(--ink)",
                padding: "4px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 1,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Crown className="size-3" />
              UPGRADE TO PRO
            </button>
          )}
        </div>
      )}

      {/* ── Setup banner ── */}
      {showSetupBanner && (
        <div style={{ marginTop: 16 }}>
          <Slab
            yellow
            label="SETUP CHECKLIST"
            grade="!"
            cert="finish to publish"
            foot={
              <>
                <span>3-STEP ONBOARDING</span>
                <span>ESTIMATED 5 MIN</span>
              </>
            }
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <SetupRow
                  done={ebayStatus?.linked === true}
                  doneLabel="eBay account connected"
                  pendingLabel="Connect your eBay account"
                  onClick={ebayStatus?.linked ? undefined : linkEbay}
                />
                <SetupRow
                  done={publishSetupReady}
                  doneLabel="eBay publish setup ready"
                  pendingLabel="Finish eBay publish setup"
                  href={publishSetupReady ? undefined : "/account"}
                />
                <SetupRow
                  done={!!listings && listings.length > 0}
                  doneLabel="First listing created"
                  pendingLabel="Create your first listing"
                  href={listings && listings.length > 0 ? undefined : "/listings/new"}
                />
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("snapcard_setup_dismissed", "true");
                  setSetupDismissed(true);
                }}
                aria-label="Dismiss setup checklist"
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--ink)",
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--ink)",
                  flexShrink: 0,
                }}
              >
                <X className="size-3" />
              </button>
            </div>
          </Slab>
        </div>
      )}

      {/* ── Stat slabs ── */}
      <div className="dashboard-stats">
        <StatSlab
          grade="∞"
          label="DRAFTS"
          value={String(drafts.length)}
          sub="WAITING TO PUBLISH"
        />
        <StatSlab
          grade="◐"
          label="SCHEDULED"
          value={String(scheduled.length)}
          sub="QUEUED PUBLISHES"
        />
        <StatSlab
          grade="●"
          label="LIVE"
          value={String(published.length)}
          sub="ACTIVE LISTINGS"
          accent
        />
        <StatSlab
          grade="!"
          label="ERRORS"
          value={String(errors.length)}
          sub="NEED ATTENTION"
        />
      </div>

      {/* ── Filter ticket bar ── */}
      <div className="dashboard-filters">
        {(
          [
            { id: "all" as const, label: "ALL", n: listings?.length ?? 0 },
            { id: "draft" as const, label: "DRAFTS", n: drafts.length },
            { id: "scheduled" as const, label: "QUEUED", n: scheduled.length },
            { id: "published" as const, label: "LIVE", n: published.length },
            { id: "error" as const, label: "FLAGGED", n: errors.length },
          ]
        ).map((f, i, arr) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "10px 14px",
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--paper)" : "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: 1.5,
                fontWeight: active ? 700 : 500,
                borderRight: i < arr.length - 1 ? "1.5px solid var(--ink)" : "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span>{f.label}</span>
              <span
                style={{
                  background: active ? "var(--accent)" : "var(--paper-2)",
                  color: "var(--ink)",
                  padding: "1px 5px",
                  fontSize: 9,
                  fontWeight: 700,
                  border: active ? "none" : "1px solid var(--ink)",
                }}
              >
                {f.n}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Cleanup error ── */}
      {cleanupError && (
        <div
          style={{
            marginTop: 14,
            background: "#c44536",
            color: "var(--paper)",
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1,
            border: "2px solid var(--ink)",
          }}
        >
          ! {cleanupError}
        </div>
      )}

      {/* ── Listings list ── */}
      <div style={{ marginTop: 16 }}>
        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: 32,
              color: "var(--ink-soft)",
            }}
          >
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}

        {!isLoading && (listings?.length ?? 0) === 0 && (
          <div
            style={{
              border: "1.5px dashed var(--ink)",
              padding: 32,
              textAlign: "center",
              fontFamily: "var(--font-marker)",
              fontSize: 14,
              color: "var(--ink-soft)",
              background: "var(--paper)",
            }}
          >
            <div className="hand" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
              No listings yet.
            </div>
            <div style={{ marginTop: 6 }}>
              Snap your first card to get started.
            </div>
          </div>
        )}

        {!isLoading && (listings?.length ?? 0) > 0 && filteredListings.length === 0 && (
          <div
            style={{
              border: "1.5px dashed var(--ink)",
              padding: 24,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 1,
              color: "var(--ink-soft)",
            }}
          >
            NO LISTINGS MATCH THIS FILTER
          </div>
        )}

        {filteredListings.map((listing, i) => (
          <ListingRow
            key={listing.id}
            listing={listing}
            zebra={i % 2 === 1}
            onCleanup={cleanUpListing}
            isCleaningUp={
              cleanupMutation.isPending &&
              cleanupMutation.variables?.id === listing.id
            }
            displayStatus={displayStatus}
          />
        ))}
      </div>

      {/* Page-local responsive layout */}
      <style>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          flex-wrap: wrap;
        }
        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: 20px;
        }
        .dashboard-filters {
          display: flex;
          align-items: stretch;
          border: 2px solid var(--ink);
          background: var(--paper);
          margin-top: 16px;
          overflow-x: auto;
        }
        @media (max-width: 768px) {
          .dashboard-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

// ── Setup checklist row ─────────────────────────────────────

function SetupRow({
  done,
  doneLabel,
  pendingLabel,
  href,
  onClick,
}: {
  done: boolean;
  doneLabel: string;
  pendingLabel: string;
  href?: string;
  onClick?: () => void;
}) {
  const labelEl = done ? (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: 0.5,
        color: "var(--ink-soft)",
      }}
    >
      {doneLabel}
    </span>
  ) : href ? (
    <Link
      to={href}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: 0.5,
        color: "var(--ink)",
        fontWeight: 700,
        textDecoration: "underline",
      }}
    >
      {pendingLabel}
    </Link>
  ) : (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: 0.5,
        color: "var(--ink)",
        fontWeight: 700,
        textDecoration: "underline",
        cursor: "pointer",
      }}
    >
      {pendingLabel}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
      }}
    >
      {done ? (
        <CheckCircle2 className="size-4" style={{ color: "var(--ink)" }} />
      ) : (
        <Circle className="size-4" style={{ color: "var(--ink-soft)" }} />
      )}
      {labelEl}
    </div>
  );
}

// ── Listing row ─────────────────────────────────────────────

function ListingRow({
  listing,
  zebra,
  onCleanup,
  isCleaningUp,
  displayStatus,
}: {
  listing: Listing;
  zebra: boolean;
  onCleanup: (listing: Listing, event: MouseEvent<HTMLButtonElement>) => void;
  isCleaningUp: boolean;
  displayStatus: (s: string) => string;
}) {
  const thumbnail = getListingThumbnail(listing);
  const canCleanUp =
    listing.status === "draft" ||
    listing.status === "error" ||
    listing.status === "published";

  // Condition / grade summary
  const condText =
    listing.card_type === "graded"
      ? `${listing.grading_company ?? ""} ${listing.grade ?? ""}`.trim() || "GRADED"
      : (listing.condition ?? "—").toUpperCase();

  const priceText = listing.price_cad
    ? `$${String(listing.price_cad)}`
    : "— —";

  const updated = listing.scheduled_at
    ? formatScheduledTime(listing.scheduled_at) ?? "SCHEDULED"
    : relativeTime(listing.created_at);

  return (
    <div
      className="listing-row"
      style={{
        background: zebra ? "var(--paper-2)" : "var(--paper)",
        borderBottom: "1.5px dashed var(--line-faint)",
        position: "relative",
      }}
    >
      <Link
        to={`/listings/${listing.id}`}
        className="listing-row-grid"
        style={{ textDecoration: "none", color: "var(--ink)" }}
      >
        <div className="listing-row-thumb">
          <MiniCard width={48} src={thumbnail} alt={listing.card_name} />
        </div>
        <div className="listing-row-name" style={{ minWidth: 0 }}>
          <div
            className="hand"
            style={{
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {listing.card_name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: 1,
              color: "var(--ink-soft)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {(listing.set_name ?? "NO SET").toUpperCase()}
          </div>
        </div>
        <div className="listing-row-cond">
          <ChipMono>{condText}</ChipMono>
        </div>
        <div className="listing-row-status">
          <StatusChip status={displayStatus(listing.status)} />
        </div>
        <div
          className="listing-row-price hand"
          style={{ fontSize: 18, fontWeight: 700, textAlign: "right" }}
        >
          {priceText}
        </div>
        <div
          className="listing-row-time"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: 1,
            color: "var(--ink-soft)",
            textAlign: "right",
          }}
        >
          {updated.toUpperCase()}
        </div>
      </Link>
      {canCleanUp && (
        <button
          type="button"
          onClick={(e) => onCleanup(listing, e)}
          disabled={isCleaningUp}
          aria-label={
            listing.status === "published"
              ? "Hide listing from dashboard"
              : "Delete listing"
          }
          title={
            listing.status === "published"
              ? "Hide from dashboard"
              : "Delete listing"
          }
          style={{
            position: "absolute",
            top: "50%",
            right: 8,
            transform: "translateY(-50%)",
            background: "var(--paper)",
            border: "1.5px solid var(--ink)",
            padding: 6,
            cursor: isCleaningUp ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink)",
            opacity: isCleaningUp ? 0.5 : 1,
          }}
        >
          {isCleaningUp ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : listing.status === "published" ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>
      )}

      <style>{`
        .listing-row-grid {
          display: grid;
          grid-template-columns: 60px 1fr 110px 110px 110px 100px 40px;
          gap: 14px;
          align-items: center;
          padding: 12px;
        }
        @media (max-width: 900px) {
          .listing-row-grid {
            grid-template-columns: 56px 1fr auto;
            grid-template-rows: auto auto;
            gap: 8px 12px;
          }
          .listing-row-thumb { grid-row: 1 / span 2; }
          .listing-row-name  { grid-column: 2; grid-row: 1; }
          .listing-row-price { grid-column: 3; grid-row: 1; text-align: right; }
          .listing-row-cond  { grid-column: 2; grid-row: 2; }
          .listing-row-status{ grid-column: 3; grid-row: 2; justify-self: end; }
          .listing-row-time  { display: none; }
        }
      `}</style>
    </div>
  );
}
