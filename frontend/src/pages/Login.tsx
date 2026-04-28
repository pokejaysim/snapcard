/**
 * Login — slab/scanner edition.
 *
 * Visual identity matches the marketing landing (Landing B v2) — PSA slab
 * panel on a paper background, monospace metadata strips, yellow CTA.
 */
import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Slab, SlabButton } from "@/components/slab";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { DEV_MODE } from "@/lib/devMode";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (DEV_MODE) {
      const dest = localStorage.getItem("snapcard_onboarding_complete")
        ? "/dashboard"
        : "/onboarding";
      navigate(dest, { replace: true });
    }
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiFetch<{
        user: { id: string };
        access_token: string;
        refresh_token: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      localStorage.setItem("access_token", result.access_token);
      const dest = localStorage.getItem("snapcard_onboarding_complete")
        ? "/dashboard"
        : "/onboarding";
      navigate(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="slab-theme" style={{ minHeight: "100vh" }}>
      <div
        style={{
          minHeight: "100vh",
          padding: "48px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          className="card-grid-bg"
          style={{ position: "absolute", inset: 0, opacity: 0.4 }}
        />
        <div
          className="halftone-soft"
          style={{ position: "absolute", inset: 0, opacity: 0.5 }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: 400,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 24,
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                background: "var(--accent)",
                border: "2px solid var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              S
            </div>
            <div className="hand" style={{ fontSize: 24, fontWeight: 700 }}>
              SnapCard
            </div>
          </Link>

          <Slab
            label="SIGN IN"
            grade="01"
            cert="returning seller"
            foot={
              <>
                <span>SECURE · TLS</span>
                <span>SUPABASE AUTH</span>
              </>
            }
          >
            <form onSubmit={handleSubmit}>
              <div
                className="hand"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                Welcome back.
              </div>
              <div
                style={{
                  fontFamily: "var(--font-marker)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  marginBottom: 20,
                }}
              >
                Sign in to keep listing.
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
                    marginBottom: 16,
                    border: "2px solid var(--ink)",
                  }}
                >
                  ! {error}
                </div>
              )}

              <SlabField
                id="email"
                label="EMAIL"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <div style={{ height: 12 }} />
              <SlabField
                id="password"
                label="PASSWORD"
                type="password"
                value={password}
                onChange={setPassword}
                required
                autoComplete="current-password"
              />

              <div style={{ marginTop: 20 }}>
                <SlabButton
                  primary
                  size="lg"
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%" }}
                >
                  {loading ? "SIGNING IN…" : "▸ SIGN IN"}
                </SlabButton>
              </div>

              <div
                style={{
                  marginTop: 20,
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 1,
                  color: "var(--ink-soft)",
                }}
              >
                NEW TO SNAPCARD?{" "}
                <Link
                  to="/register"
                  style={{
                    color: "var(--ink)",
                    fontWeight: 700,
                    textDecoration: "underline",
                    textDecorationColor: "var(--accent)",
                    textDecorationThickness: 2,
                  }}
                >
                  CREATE AN ACCOUNT →
                </Link>
              </div>
            </form>
          </Slab>
        </div>
      </div>
    </div>
  );
}

// ── Slab-styled input field ─────────────────────────────────

function SlabField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
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
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        style={{
          display: "block",
          width: "100%",
          padding: "10px 12px",
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
  );
}
