/**
 * Authed layout — slab/scanner edition.
 *
 * Top bar: ink-black inventory ticker strip + paper nav with yellow S logo.
 * Sidebar: ink-black panel with monospace nav links (01 · DASHBOARD …)
 * and a plan slab pinned to the bottom.
 *
 * The chrome itself is themed under `.slab-theme`. Pages rendered into
 * `<Outlet />` decide whether to opt into the theme — slabbified pages
 * (like Dashboard) wrap themselves in `.slab-theme`; legacy shadcn pages
 * keep their existing emerald look until they're refreshed.
 */
import { useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, LogOut } from "lucide-react";
import "@/styles/landing-slab.css";

const NAV_ITEMS = [
  { to: "/dashboard",      n: "01", label: "DASHBOARD",    end: false },
  { to: "/listings/new",   n: "02", label: "NEW LISTING",  end: true },
  { to: "/listings/batch", n: "03", label: "BATCH UPLOAD", end: true },
  { to: "/account",        n: "04", label: "ACCOUNT",      end: false },
] as const;

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function handleNavClick() {
    setMobileOpen(false);
  }

  // Take the local part of the email for the seller display name.
  const sellerName = user?.email?.split("@")[0] ?? "seller";

  return (
    <div
      className="slab-theme"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      {/* ── Inventory ticker strip ── */}
      <div
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "6px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: 1.5,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>★ SNAPCARD · POKÉMON CARD LISTING TOOL</span>
        <span style={{ color: "var(--accent)" }}>● {sellerName.toUpperCase()}</span>
        <span className="layout-ticker-sync">SYNC OK</span>
      </div>

      {/* ── Top nav (mobile burger + brand + sign-out) ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1.5px solid var(--ink)",
          background: "var(--paper)",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="layout-burger"
            style={{
              padding: 6,
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <Link
            to="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: "var(--accent)",
                border: "2px solid var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              S
            </div>
            <div className="hand" style={{ fontSize: 20, fontWeight: 700 }}>
              SnapCard
            </div>
          </Link>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            className="chip-mono"
            style={{ display: "inline-flex" }}
            title={user?.email ?? ""}
          >
            ● ONLINE
          </span>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            style={{
              padding: 6,
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink)",
            }}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Body: sidebar + main ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="layout-overlay"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 30,
            }}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`layout-sidebar ${mobileOpen ? "is-open" : ""}`}
          style={{
            width: 220,
            background: "var(--ink)",
            color: "var(--paper)",
            borderRight: "2px solid var(--ink)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Seller block */}
          <div
            style={{
              padding: "16px",
              borderBottom: "1.5px dashed rgba(254,253,246,0.2)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: 2,
                color: "var(--accent)",
                marginBottom: 4,
              }}
            >
              ● SELLER
            </div>
            <div
              className="hand"
              style={{
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.1,
                color: "var(--paper)",
                wordBreak: "break-word",
              }}
            >
              {sellerName}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: 1,
                color: "rgba(254,253,246,0.5)",
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              {user?.email ?? ""}
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            {NAV_ITEMS.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                onClick={handleNavClick}
                style={({ isActive }) => ({
                  padding: "10px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  background: isActive ? "var(--accent)" : "transparent",
                  color: isActive ? "var(--ink)" : "rgba(254,253,246,0.7)",
                  fontWeight: isActive ? 700 : 400,
                  borderLeft: isActive
                    ? "4px solid var(--ink)"
                    : "4px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                  textTransform: "uppercase",
                })}
              >
                {({ isActive }) => (
                  <>
                    <span style={{ opacity: isActive ? 0.7 : 0.5 }}>{it.n}</span>
                    <span>{it.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sign out (mobile-friendly, mirrors top bar button) */}
          <div style={{ padding: "12px 16px", borderTop: "1.5px dashed rgba(254,253,246,0.2)" }}>
            <button
              onClick={handleSignOut}
              style={{
                background: "transparent",
                border: "1.5px solid rgba(254,253,246,0.3)",
                color: "var(--paper)",
                padding: "8px 12px",
                width: "100%",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 1.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <LogOut className="size-3.5" />
              SIGN OUT
            </button>
          </div>
        </aside>

        {/* Main */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            background: "var(--paper)",
            position: "relative",
            overflowX: "hidden",
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Responsive: hide sidebar on mobile, slide-in on burger ── */}
      <style>{`
        .slab-theme .layout-burger {
          display: none;
        }
        @media (max-width: 768px) {
          .slab-theme .layout-burger {
            display: flex;
          }
          .slab-theme .layout-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 40;
            transform: translateX(-100%);
            transition: transform 0.2s ease-out;
          }
          .slab-theme .layout-sidebar.is-open {
            transform: translateX(0);
          }
          .slab-theme .layout-ticker-sync {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
