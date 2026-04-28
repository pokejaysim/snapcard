/**
 * Pricing suggestion — slab/scanner edition.
 *
 * Used by both the New Listing wizard and (eventually) the Listing
 * Detail page. Hits `/pricing/suggest`, then renders:
 *   - The price input + "Get Price Suggestion" button row
 *   - Per-source result tiles (PriceCharting · eBay) showing either the
 *     CAD price, or a tagged-status reason ("Not configured", "Temporary
 *     error", "No match found") so users can self-diagnose
 *   - A PriceCharting match-detail panel with the matched product name,
 *     a Verify link to the source page, and a USD price ladder
 *     (Raw / PSA 9 / PSA 10) so users can spot wrong-variant matches
 *   - A list of the 5 most recent eBay sold comps
 *
 * Behaviour preserved 1:1 — same query, same response handling, same
 * auto-fill of the price field on success. Only the visual layer changed.
 */
import { useState } from "react";
import { ChipMono, SlabButton } from "@/components/slab";
import { apiFetch } from "@/lib/api";
import {
  DollarSign,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";

interface EbayComp {
  title: string;
  sold_price: number;
  condition: string;
  sold_date: string;
}

type SourceStatus =
  | { state: "ok" }
  | { state: "no_key" }
  | { state: "api_error"; message: string }
  | { state: "not_found"; query: string };

interface PriceChartingDetail {
  product_name: string;
  console_name: string | null;
  product_url: string | null;
  price_raw_usd: number | null;
  price_graded_9_usd: number | null;
  price_graded_10_usd: number | null;
}

interface PriceSuggestionResult {
  suggested_price_cad: number | null;
  pricechart_price: number | null;
  ebay_avg_price: number | null;
  ebay_comps: EbayComp[];
  reasoning: string;
  pricecharting_detail?: PriceChartingDetail | null;
  sources?: {
    pricecharting: SourceStatus;
    ebay: SourceStatus;
    fx_rate_usd_to_cad: number;
    condition_applied: string;
  };
}

interface PricingSuggestionProps {
  cardName: string;
  setName: string | null;
  cardNumber: string | null;
  condition: string | null;
  listingId?: string;
  price: string;
  onPriceChange: (price: string) => void;
}

export function PricingSuggestion({
  cardName,
  setName,
  cardNumber,
  condition,
  listingId,
  price,
  onPriceChange,
}: PricingSuggestionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceSuggestionResult | null>(null);
  const [error, setError] = useState("");

  async function fetchSuggestion() {
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch<PriceSuggestionResult>("/pricing/suggest", {
        method: "POST",
        body: JSON.stringify({
          card_name: cardName,
          set_name: setName,
          card_number: cardNumber,
          condition,
          listing_id: listingId,
        }),
      });

      setResult(data);
      if (data.suggested_price_cad !== null && data.suggested_price_cad > 0) {
        onPriceChange(data.suggested_price_cad.toFixed(2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get pricing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Price input + Get Suggestion button ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <label
            htmlFor="price"
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "var(--ink-soft)",
              marginBottom: 4,
              fontWeight: 700,
            }}
          >
            PRICE · CAD
          </label>
          <div style={{ position: "relative" }}>
            <DollarSign
              className="size-4"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ink-soft)",
                pointerEvents: "none",
              }}
            />
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px 8px 32px",
                background: "var(--paper)",
                border: "1.5px solid var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
                outline: "none",
                borderRadius: 0,
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = "3px 3px 0 var(--accent)";
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
        </div>
        <SlabButton onClick={fetchSuggestion} disabled={loading || !cardName}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <TrendingUp className="size-4" />
          )}
          {loading ? "RESEARCHING…" : "GET SUGGESTION"}
        </SlabButton>
      </div>

      {error && (
        <div
          style={{
            background: "#c44536",
            color: "var(--paper)",
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1,
            border: "2px solid var(--ink)",
          }}
        >
          ! {error}
        </div>
      )}

      {result && (
        <div
          style={{
            background: "var(--paper)",
            border: "2px solid var(--ink)",
            boxShadow: "3px 3px 0 var(--ink)",
          }}
        >
          {/* Header band */}
          <div
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 1.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>★ PRICE RESEARCH</span>
            {result.sources?.condition_applied && (
              <span
                style={{
                  background: "var(--accent)",
                  color: "var(--ink)",
                  padding: "2px 6px",
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {result.sources.condition_applied} ADJ
              </span>
            )}
          </div>

          <div
            style={{
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* No-key banner — both sources missing */}
            {result.sources?.pricecharting.state === "no_key" &&
              result.sources.ebay.state === "no_key" && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    border: "1.5px solid #f5a623",
                    background: "rgba(245,166,35,0.08)",
                    padding: 10,
                  }}
                >
                  <AlertTriangle
                    className="size-4 shrink-0"
                    style={{ color: "#a87a23", marginTop: 2 }}
                  />
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: 0.5,
                      color: "var(--ink)",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>
                      ? PRICING SOURCES NOT CONFIGURED
                    </div>
                    Neither PriceCharting nor eBay is reachable — add{" "}
                    <code style={kbdStyle}>PRICECHARTING_API_KEY</code> and{" "}
                    <code style={kbdStyle}>EBAY_APP_ID</code> in Railway, then redeploy.
                  </div>
                </div>
              )}

            {/* Per-source price tiles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <SourceTile
                label="PRICECHARTING"
                priceCad={result.pricechart_price}
                status={result.sources?.pricecharting}
              />
              <SourceTile
                label="EBAY AVG SOLD"
                priceCad={result.ebay_avg_price}
                status={result.sources?.ebay}
              />
            </div>

            {/* Reasoning */}
            <div
              style={{
                fontFamily: "var(--font-marker)",
                fontSize: 13,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
              }}
            >
              {result.reasoning}
            </div>

            {/* PriceCharting match detail */}
            {result.pricecharting_detail && (
              <div
                style={{
                  border: "1.5px solid var(--ink)",
                  background: "var(--paper-2)",
                }}
              >
                <div
                  style={{
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: "var(--ink-soft)",
                        fontWeight: 700,
                      }}
                    >
                      PRICECHARTING MATCHED
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 2,
                        wordBreak: "break-word",
                      }}
                    >
                      {result.pricecharting_detail.product_name}
                    </div>
                    {result.pricecharting_detail.console_name && (
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: 1,
                          color: "var(--ink-soft)",
                          marginTop: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        {result.pricecharting_detail.console_name}
                      </div>
                    )}
                  </div>
                  {result.pricecharting_detail.product_url && (
                    <a
                      href={result.pricecharting_detail.product_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        background: "var(--ink)",
                        color: "var(--accent)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: 1,
                        fontWeight: 700,
                        textDecoration: "none",
                        flexShrink: 0,
                      }}
                    >
                      VERIFY
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>

                {/* USD price ladder */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 4,
                    padding: 10,
                    borderTop: "1.5px dashed var(--ink)",
                  }}
                >
                  <PricePoint
                    label="RAW"
                    usd={result.pricecharting_detail.price_raw_usd}
                    highlight
                  />
                  <PricePoint
                    label="PSA 9"
                    usd={result.pricecharting_detail.price_graded_9_usd}
                  />
                  <PricePoint
                    label="PSA 10"
                    usd={result.pricecharting_detail.price_graded_10_usd}
                  />
                </div>
                <div
                  style={{
                    padding: "0 10px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: 0.5,
                    color: "var(--ink-soft)",
                    lineHeight: 1.5,
                  }}
                >
                  Suggestion uses the <span style={{ fontWeight: 700 }}>RAW</span> price
                  scaled by your card's condition, converted to CAD.
                </div>
              </div>
            )}

            {/* Recent eBay comps */}
            {result.ebay_comps.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: "var(--ink-soft)",
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  ★ RECENT EBAY SOLD COMPS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.ebay_comps.slice(0, 5).map((comp, i) => (
                    <div
                      key={`${comp.title}-${String(i)}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 8px",
                        background: i % 2 === 0 ? "var(--paper)" : "var(--paper-2)",
                        border: "1px solid var(--line-faint)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--ink-soft)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {comp.title}
                      </span>
                      <span
                        className="hand"
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        ${comp.sold_price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

const kbdStyle = {
  margin: "0 2px",
  padding: "1px 4px",
  background: "rgba(0,0,0,0.08)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
} as const;

/** Per-source result tile — shows price (yellow chip) or a status reason. */
function SourceTile({
  label,
  priceCad,
  status,
}: {
  label: string;
  priceCad: number | null;
  status: SourceStatus | undefined;
}) {
  if (priceCad !== null) {
    return (
      <div
        style={{
          background: "var(--accent)",
          border: "1.5px solid var(--ink)",
          padding: 10,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: 1.5,
            color: "var(--ink)",
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div
          className="hand"
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.1,
            marginTop: 2,
            color: "var(--ink)",
          }}
        >
          ${priceCad.toFixed(2)}{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              color: "var(--ink-soft)",
              letterSpacing: 1,
            }}
          >
            CAD
          </span>
        </div>
      </div>
    );
  }

  // No price — show why with a tone-appropriate border/background.
  const { text, tone } = describeStatus(status);
  const tones = {
    error: { border: "#c44536", background: "rgba(196,69,54,0.08)", color: "#c44536" },
    warn: { border: "#f5a623", background: "rgba(245,166,35,0.08)", color: "#a87a23" },
    neutral: { border: "var(--ink)", background: "var(--paper-2)", color: "var(--ink-soft)" },
  } as const;
  const t = tones[tone];

  return (
    <div
      style={{
        border: `1.5px solid ${t.border}`,
        background: t.background,
        padding: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: 1.5,
          color: t.color,
          fontWeight: 700,
          opacity: 0.9,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "flex-start",
          marginTop: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: t.color,
          fontWeight: 700,
        }}
      >
        <Info className="size-3 shrink-0" style={{ marginTop: 2 }} />
        <span>{text}</span>
      </div>
    </div>
  );
}

/** One cell of the PriceCharting USD ladder — RAW is highlighted because
 *  that's the price the suggestion is anchored on. */
function PricePoint({
  label,
  usd,
  highlight = false,
}: {
  label: string;
  usd: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight ? "var(--accent)" : "var(--paper)",
        border: "1.5px solid var(--ink)",
        padding: 6,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: 1,
          color: "var(--ink-soft)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        className="hand"
        style={{
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.1,
          marginTop: 2,
          color: "var(--ink)",
        }}
      >
        {usd !== null ? `$${usd.toFixed(2)}` : "—"}
        {usd !== null && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "var(--ink-soft)",
              fontWeight: 500,
              letterSpacing: 1,
              marginLeft: 2,
            }}
          >
            USD
          </span>
        )}
      </div>
    </div>
  );
}

function describeStatus(
  status: SourceStatus | undefined,
): { text: string; tone: "neutral" | "warn" | "error" } {
  if (!status) return { text: "Unavailable", tone: "neutral" };
  switch (status.state) {
    case "ok":
      return { text: "No usable price", tone: "neutral" };
    case "no_key":
      return { text: "Not configured", tone: "warn" };
    case "api_error":
      return { text: "Temporary error", tone: "error" };
    case "not_found":
      return { text: "No match found", tone: "neutral" };
  }
}

// Suppress unused-icon import warning while keeping the import available
// for the SlabButton / ChipMono pair in case future revisions need them.
const _ChipMonoRef = ChipMono;
void _ChipMonoRef;
