/**
 * Upgrade prompt modal — slab/scanner edition.
 *
 * Same trigger surface as before (Dashboard + CreateListing call this
 * when the user hits a free-tier limit), only the visual layer is new:
 * yellow PSA slab on a dimmed paper backdrop, monospace feature tiles,
 * "Coming Soon" CTA still disabled (payment integration isn't wired yet).
 */
import { Slab, SlabButton, ChipMono } from "@/components/slab";
import { X, Sparkles, BarChart3, Infinity as InfinityIcon } from "lucide-react";
import type { ReactNode } from "react";

interface UpgradePromptProps {
  onClose: () => void;
}

export function UpgradePrompt({ onClose }: UpgradePromptProps) {
  return (
    <div
      className="slab-theme"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(14,14,16,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          position: "relative",
        }}
      >
        {/* Floating close button */}
        <button
          onClick={onClose}
          aria-label="Close upgrade prompt"
          style={{
            position: "absolute",
            top: -12,
            right: -12,
            zIndex: 1,
            width: 32,
            height: 32,
            background: "var(--paper)",
            border: "2px solid var(--ink)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink)",
            boxShadow: "2px 2px 0 var(--ink)",
          }}
        >
          <X className="size-4" />
        </button>

        <Slab
          yellow
          label="UPGRADE TO PRO"
          grade="A"
          cert="UNLIMITED"
          foot={
            <>
              <span>BILLED MONTHLY</span>
              <span>CANCEL ANYTIME</span>
            </>
          }
        >
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <ChipMono solid style={{ marginBottom: 10 }}>
              ★ FREE TIER LIMIT REACHED
            </ChipMono>
            <div
              className="hand"
              style={{
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.05,
                marginTop: 4,
              }}
            >
              Unlock the whole SnapCard.
            </div>
            <div
              style={{
                fontFamily: "var(--font-marker)",
                fontSize: 13,
                color: "var(--ink-soft)",
                marginTop: 6,
              }}
            >
              Identify, price, draft, publish — at full speed.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <FeatureRow
              icon={<Sparkles className="size-4" />}
              title="AI CARD IDENTIFICATION"
              desc="Snap → Opus identifies set, number, rarity, language."
            />
            <FeatureRow
              icon={<InfinityIcon className="size-4" />}
              title="UNLIMITED LISTINGS"
              desc="No monthly cap — list as many cards as you want."
            />
            <FeatureRow
              icon={<BarChart3 className="size-4" />}
              title="REAL SOLD COMPS"
              desc="PriceCharting + eBay sold listings, condition-adjusted."
            />
          </div>

          <div
            style={{
              border: "1.5px dashed var(--ink)",
              background: "var(--paper)",
              padding: 14,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            <div
              className="hand"
              style={{
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              $9.99
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink-soft)",
                  letterSpacing: 1,
                  marginLeft: 4,
                }}
              >
                /MO
              </span>
            </div>
          </div>

          <SlabButton primary size="lg" disabled style={{ width: "100%" }}>
            ▸ COMING SOON
          </SlabButton>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: 1,
              color: "var(--ink-soft)",
              textAlign: "center",
              marginTop: 8,
              textTransform: "uppercase",
            }}
          >
            Payment integration coming after the Canada beta launches.
          </div>
        </Slab>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 12px",
        background: "var(--paper)",
        border: "1.5px solid var(--ink)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          background: "var(--ink)",
          color: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1,
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-marker)",
            fontSize: 12,
            color: "var(--ink-soft)",
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}
