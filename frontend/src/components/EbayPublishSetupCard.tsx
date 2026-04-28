/**
 * eBay publish setup card — slab/scanner edition.
 *
 * Used in both Onboarding (step 2) and Account (settings page). Loads
 * `/account/ebay-publish-settings`, lets the user save their eBay seller
 * defaults (location/postal, business policies, fallback shipping/return
 * settings), and surfaces a readiness ribbon that drives publishing
 * elsewhere in the app.
 *
 * Behaviour preserved 1:1 — same query/mutation, same form schema, same
 * fallback-defaults flow. Only the visual layer changed.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Truck,
} from "lucide-react";
import {
  ChipMono,
  Slab,
  SlabButton,
  SlabField,
  SlabFieldGroup,
  SlabSelect,
} from "@/components/slab";
import { apiFetch } from "@/lib/api";
import type { EbayPublishSettingsResponse } from "../../../shared/types";
import {
  CANADA_BETA_MARKETPLACE_ID,
  EBAY_MARKETPLACE_CONFIG,
  SNAPCARD_FALLBACK_HANDLING_TIME_OPTIONS,
  SNAPCARD_FALLBACK_RETURN_DAYS_OPTIONS,
  SNAPCARD_FALLBACK_SHIPPING_OPTIONS,
} from "../../../shared/types";

interface EbayPublishSetupCardProps {
  title?: string;
  description?: string;
  onStateChange?: (state: EbayPublishSettingsResponse | null) => void;
}

interface SellerSettingsForm {
  location: string;
  postal_code: string;
  fulfillment_policy_id: string;
  payment_policy_id: string;
  return_policy_id: string;
  shipping_service: string;
  shipping_cost: string;
  handling_time_days: string;
  returns_accepted: "" | "yes" | "no";
  return_period_days: string;
  return_shipping_cost_payer: "" | "Buyer" | "Seller";
}

const EMPTY_FORM: SellerSettingsForm = {
  location: "",
  postal_code: "",
  fulfillment_policy_id: "",
  payment_policy_id: "",
  return_policy_id: "",
  shipping_service: "",
  shipping_cost: "",
  handling_time_days: "",
  returns_accepted: "",
  return_period_days: "",
  return_shipping_cost_payer: "",
};

export function EbayPublishSetupCard({
  title = "EBAY PUBLISH SETUP",
  description = "Save your eBay.ca seller defaults once so SnapCard can publish without asking for shipping and return details every time.",
  onStateChange,
}: EbayPublishSetupCardProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SellerSettingsForm>(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedMarketplace = CANADA_BETA_MARKETPLACE_ID;

  const settingsQuery = useQuery({
    queryKey: ["ebay-publish-settings", CANADA_BETA_MARKETPLACE_ID],
    queryFn: () =>
      apiFetch<EbayPublishSettingsResponse>(
        `/account/ebay-publish-settings?marketplace_id=${CANADA_BETA_MARKETPLACE_ID}`,
      ),
  });

  useEffect(() => {
    onStateChange?.(settingsQuery.data ?? null);
  }, [onStateChange, settingsQuery.data]);

  useEffect(() => {
    const settings = settingsQuery.data?.settings;
    if (!settings) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      location: settings.location ?? "",
      postal_code: settings.postal_code ?? "",
      fulfillment_policy_id: settings.fulfillment_policy_id ?? "",
      payment_policy_id: settings.payment_policy_id ?? "",
      return_policy_id: settings.return_policy_id ?? "",
      shipping_service: settings.shipping_service ?? "",
      shipping_cost:
        settings.shipping_cost != null ? String(settings.shipping_cost) : "",
      handling_time_days:
        settings.handling_time_days != null
          ? String(settings.handling_time_days)
          : "",
      returns_accepted:
        settings.returns_accepted == null
          ? ""
          : settings.returns_accepted
            ? "yes"
            : "no",
      return_period_days:
        settings.return_period_days != null
          ? String(settings.return_period_days)
          : "",
      return_shipping_cost_payer: settings.return_shipping_cost_payer ?? "",
    });
  }, [settingsQuery.data?.settings]);

  function updateField<K extends keyof SellerSettingsForm>(
    key: K,
    value: SellerSettingsForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    try {
      await apiFetch<EbayPublishSettingsResponse>("/account/ebay-publish-settings", {
        method: "PUT",
        body: JSON.stringify({
          location: form.location || null,
          postal_code: form.postal_code || null,
          fulfillment_policy_id: form.fulfillment_policy_id || null,
          payment_policy_id: form.payment_policy_id || null,
          return_policy_id: form.return_policy_id || null,
          shipping_service: form.shipping_service || null,
          shipping_cost:
            form.shipping_cost.trim() === "" ? null : Number(form.shipping_cost),
          handling_time_days:
            form.handling_time_days.trim() === ""
              ? null
              : Number(form.handling_time_days),
          returns_accepted:
            form.returns_accepted === "" ? null : form.returns_accepted === "yes",
          return_period_days:
            form.returns_accepted === "yes" && form.return_period_days
              ? Number(form.return_period_days)
              : null,
          return_shipping_cost_payer:
            form.returns_accepted === "yes"
              ? form.return_shipping_cost_payer || null
              : null,
          marketplace_id: CANADA_BETA_MARKETPLACE_ID,
        }),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ebay-publish-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["publish-readiness"] }),
      ]);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save eBay publish settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Render guards ────────────────────────────────────────

  if (settingsQuery.isLoading) {
    return (
      <Slab label={title} grade="◉" cert="LOADING">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1,
            color: "var(--ink-soft)",
          }}
        >
          <Loader2 className="size-4 animate-spin" />
          LOADING YOUR EBAY PUBLISH SETTINGS…
        </div>
      </Slab>
    );
  }

  if (settingsQuery.error) {
    return (
      <Slab label={title} grade="!" cert="ERROR">
        <div
          style={{
            background: "#c44536",
            color: "var(--paper)",
            padding: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1,
            border: "2px solid var(--ink)",
          }}
        >
          !{" "}
          {settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : "Failed to load eBay publish settings."}
        </div>
      </Slab>
    );
  }

  if (!settingsQuery.data?.linked) {
    return (
      <Slab label={title} grade="?" cert="NOT LINKED">
        <div
          style={{
            border: "1.5px solid #f5a623",
            background: "rgba(245,166,35,0.08)",
            padding: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 0.5,
            color: "var(--ink)",
            lineHeight: 1.5,
          }}
        >
          ? CONNECT YOUR EBAY ACCOUNT FIRST, THEN COME BACK HERE TO CHOOSE YOUR PUBLISHING DEFAULTS.
        </div>
      </Slab>
    );
  }

  const settings = settingsQuery.data;
  const currentConfig = EBAY_MARKETPLACE_CONFIG[selectedMarketplace];
  const shippingOptions = SNAPCARD_FALLBACK_SHIPPING_OPTIONS[selectedMarketplace];
  const usingFallback = settings.publish_strategy === "snapcard_defaults";
  const returnsAccepted = form.returns_accepted === "yes";
  const ready = settings.readiness.ready;

  return (
    <Slab
      yellow={ready}
      label={title}
      grade={ready ? "✓" : "?"}
      cert={
        ready
          ? usingFallback
            ? "READY · SNAPCARD DEFAULTS"
            : "READY · POLICIES"
          : "SETUP NEEDED"
      }
      foot={
        <>
          <span>{currentConfig.label.toUpperCase()} BETA</span>
          <span>{currentConfig.currency} ONLY</span>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            fontFamily: "var(--font-marker)",
            fontSize: 13,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>

        {/* Status + readiness */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {ready ? (
            <ChipMono accent>
              <CheckCircle2 className="size-3" />
              {usingFallback ? "READY · FALLBACK" : "READY · POLICIES"}
            </ChipMono>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                background: "#f5a623",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: 1,
                fontWeight: 700,
                border: "1.5px solid var(--ink)",
              }}
            >
              <AlertTriangle className="size-3" />
              SETUP NEEDED
            </span>
          )}
        </div>

        {settings.readiness.missing.length > 0 && (
          <div
            style={{
              border: "1.5px solid #f5a623",
              background: "rgba(245,166,35,0.08)",
              padding: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: 1.5,
                color: "var(--ink)",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              ? FINISH THESE TO UNLOCK ONE-CLICK PUBLISH
            </div>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 18px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 0.5,
                color: "var(--ink-soft)",
                lineHeight: 1.6,
              }}
            >
              {settings.readiness.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {saveError && (
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
            ! {saveError}
          </div>
        )}

        {/* Beta marketplace banner */}
        <div
          style={{
            border: "1.5px solid var(--ink)",
            background: "var(--paper-2)",
            padding: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "var(--ink)",
              fontWeight: 700,
            }}
          >
            ★ {currentConfig.label.toUpperCase()} BETA · {currentConfig.currency}
          </div>
          <div
            style={{
              fontFamily: "var(--font-marker)",
              fontSize: 13,
              color: "var(--ink-soft)",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            SnapCard is proving the Canada workflow first. New beta listings use{" "}
            {currentConfig.currency}; US and international stays hidden until the
            Canada model is reliable.
          </div>
        </div>

        {/* Location + postal code */}
        <div className="ep-grid-2">
          <SlabField
            id="ebay-location"
            label="SELLER LOCATION"
            value={form.location}
            onChange={(v) => updateField("location", v)}
            placeholder="Vancouver, BC"
          />
          <SlabField
            id="ebay-postal-code"
            label="POSTAL CODE"
            value={form.postal_code}
            onChange={(v) => updateField("postal_code", v.toUpperCase())}
            placeholder="V5V 1A1"
          />
        </div>

        {settings.policy_support.message && (
          <div
            style={{
              border: "1.5px dashed var(--ink)",
              background: "var(--paper-2)",
              padding: "8px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 0.5,
              color: "var(--ink)",
              lineHeight: 1.5,
            }}
          >
            ★ {settings.policy_support.message}
          </div>
        )}

        {/* eBay business policies */}
        <SectionFrame
          title="EBAY BUSINESS POLICIES"
          subtitle="Optional in beta. Select all three to use your eBay business policies, or leave blank to use SnapCard's fallback defaults below."
        >
          <SlabFieldGroup label="FULFILLMENT POLICY">
            <SlabSelect
              id="ebay-fulfillment-policy"
              value={form.fulfillment_policy_id}
              onChange={(v) => updateField("fulfillment_policy_id", v)}
              options={[
                { value: "", label: "Use SnapCard defaults instead" },
                ...settings.available_policies.fulfillment.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
            />
          </SlabFieldGroup>
          <SlabFieldGroup label="PAYMENT POLICY">
            <SlabSelect
              id="ebay-payment-policy"
              value={form.payment_policy_id}
              onChange={(v) => updateField("payment_policy_id", v)}
              options={[
                { value: "", label: "Use SnapCard defaults instead" },
                ...settings.available_policies.payment.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
            />
          </SlabFieldGroup>
          <SlabFieldGroup label="RETURN POLICY">
            <SlabSelect
              id="ebay-return-policy"
              value={form.return_policy_id}
              onChange={(v) => updateField("return_policy_id", v)}
              options={[
                { value: "", label: "Use SnapCard defaults instead" },
                ...settings.available_policies.return.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
            />
          </SlabFieldGroup>
        </SectionFrame>

        {/* Fallback defaults */}
        <SectionFrame
          title="SNAPCARD FALLBACK DEFAULTS"
          subtitle="Use these beta defaults instead of eBay business policies. SnapCard sends shipping and return details directly in the Trading API request."
          icon={<Truck className="size-4" />}
        >
          <div className="ep-grid-2">
            <SlabFieldGroup label="SHIPPING SERVICE">
              <SlabSelect
                id="snapcard-shipping-service"
                value={form.shipping_service}
                onChange={(v) => updateField("shipping_service", v)}
                options={[
                  { value: "", label: "Select a shipping service" },
                  ...shippingOptions.map((o) => ({
                    value: o.value,
                    label: o.label,
                  })),
                ]}
              />
            </SlabFieldGroup>
            <SlabField
              id="snapcard-shipping-cost"
              label={`SHIPPING COST · ${currentConfig.currency}`}
              inputMode="decimal"
              value={form.shipping_cost}
              onChange={(v) => updateField("shipping_cost", v)}
              placeholder="0.00"
            />
          </div>

          <div className="ep-grid-2" style={{ marginTop: 12 }}>
            <SlabFieldGroup label="HANDLING TIME">
              <SlabSelect
                id="snapcard-handling-time"
                value={form.handling_time_days}
                onChange={(v) => updateField("handling_time_days", v)}
                options={[
                  { value: "", label: "Select handling time" },
                  ...SNAPCARD_FALLBACK_HANDLING_TIME_OPTIONS.map((days) => ({
                    value: String(days),
                    label: `${String(days)} business day${days === 1 ? "" : "s"}`,
                  })),
                ]}
              />
            </SlabFieldGroup>
            <SlabFieldGroup label="RETURNS ACCEPTED">
              <SlabSelect
                id="snapcard-returns-accepted"
                value={form.returns_accepted}
                onChange={(v) =>
                  updateField(
                    "returns_accepted",
                    v as SellerSettingsForm["returns_accepted"],
                  )
                }
                options={[
                  { value: "", label: "Choose a return setting" },
                  { value: "yes", label: "Yes, accept returns" },
                  { value: "no", label: "No, do not accept returns" },
                ]}
              />
            </SlabFieldGroup>
          </div>

          {returnsAccepted && (
            <div className="ep-grid-2" style={{ marginTop: 12 }}>
              <SlabFieldGroup label="RETURN WINDOW">
                <SlabSelect
                  id="snapcard-return-window"
                  value={form.return_period_days}
                  onChange={(v) => updateField("return_period_days", v)}
                  options={[
                    { value: "", label: "Select a return window" },
                    ...SNAPCARD_FALLBACK_RETURN_DAYS_OPTIONS.map((days) => ({
                      value: String(days),
                      label: `${String(days)} days`,
                    })),
                  ]}
                />
              </SlabFieldGroup>
              <SlabFieldGroup label="RETURN SHIPPING PAID BY">
                <SlabSelect
                  id="snapcard-return-payer"
                  value={form.return_shipping_cost_payer}
                  onChange={(v) =>
                    updateField(
                      "return_shipping_cost_payer",
                      v as SellerSettingsForm["return_shipping_cost_payer"],
                    )
                  }
                  options={[
                    { value: "", label: "Select who pays return shipping" },
                    { value: "Buyer", label: "Buyer" },
                    { value: "Seller", label: "Seller" },
                  ]}
                />
              </SlabFieldGroup>
            </div>
          )}
        </SectionFrame>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: 8,
            paddingTop: 14,
            borderTop: "1.5px dashed var(--ink)",
            flexWrap: "wrap",
          }}
        >
          <SlabButton primary onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            SAVE EBAY DEFAULTS
          </SlabButton>
          <SlabButton
            onClick={() => settingsQuery.refetch()}
            disabled={settingsQuery.isFetching}
          >
            {settingsQuery.isFetching ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            REFRESH FROM EBAY
          </SlabButton>
        </div>
      </div>

      <style>{`
        .ep-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 600px) {
          .ep-grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Slab>
  );
}

// ── Helpers ────────────────────────────────────────────────

function SectionFrame({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1.5px solid var(--ink)",
        background: "var(--paper)",
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        {icon && (
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
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 1.5,
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
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}
