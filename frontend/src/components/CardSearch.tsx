/**
 * Card search — slab/scanner edition.
 *
 * Debounced search against `/cards/search` (Pokemon TCG). Renders a
 * monospace search field with a dropdown of result tiles styled as
 * mini "card slabs" (small thumbnail + name + monospace metadata).
 *
 * Behaviour preserved 1:1 — same debounce, same query, same selection
 * flow including the fallback to the search-result data when the
 * detail call fails.
 */
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Loader2, Search } from "lucide-react";
import type {
  PokemonTcgSearchResult,
  PokemonTcgCardDetail,
} from "../../../shared/types";

interface CardSearchProps {
  onSelect: (card: PokemonTcgCardDetail) => void;
  disabled?: boolean;
}

export function CardSearch({ onSelect, disabled }: CardSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["card-search", debouncedQuery],
    queryFn: () =>
      apiFetch<{ cards: PokemonTcgSearchResult[]; totalCount: number }>(
        `/cards/search?q=${encodeURIComponent(debouncedQuery)}&pageSize=8`,
      ),
    enabled: debouncedQuery.length >= 2,
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  async function handleSelect(result: PokemonTcgSearchResult) {
    setLoadingDetail(true);
    try {
      const detail = await apiFetch<PokemonTcgCardDetail>(
        `/cards/pokemon-tcg/${result.id}`,
      );
      setOpen(false);
      setQuery(result.name);
      onSelect(detail);
    } catch {
      // Fallback: use the search-result data without the full detail.
      setOpen(false);
      setQuery(result.name);
      onSelect({
        ...result,
        supertype: "Pokémon",
        subtypes: [],
        tcgplayer_url: null,
        tcgplayer_prices: null,
      });
    } finally {
      setLoadingDetail(false);
    }
  }

  const showDropdown = open && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search
          className="size-4"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-soft)",
            pointerEvents: "none",
          }}
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => debouncedQuery.length >= 2 && setOpen(true)}
          placeholder="Search by card name (e.g. Charizard)"
          disabled={disabled || loadingDetail}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 36px",
            background: "var(--paper)",
            border: "1.5px solid var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--ink)",
            outline: "none",
            borderRadius: 0,
            boxSizing: "border-box",
            opacity: disabled || loadingDetail ? 0.6 : 1,
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.boxShadow =
              "3px 3px 0 var(--accent)";
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "none";
          }}
        />
        {(isLoading || loadingDetail) && (
          <Loader2
            className="size-4 animate-spin"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-soft)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "var(--paper)",
            border: "2px solid var(--ink)",
            boxShadow: "4px 4px 0 var(--ink)",
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 1,
                color: "var(--ink-soft)",
              }}
            >
              <Loader2 className="size-4 animate-spin" />
              ◉ SEARCHING POKÉMON TCG…
            </div>
          ) : data?.cards.length === 0 ? (
            <div
              style={{
                padding: 16,
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 1,
                color: "var(--ink-soft)",
              }}
            >
              ◯ NO CARDS FOUND FOR "{debouncedQuery.toUpperCase()}"
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {data?.cards.map((card, i, arr) => (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(card)}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      borderBottom:
                        i < arr.length - 1
                          ? "1.5px dashed var(--line-faint)"
                          : "none",
                      cursor: "pointer",
                      transition: "background 0.1s",
                      color: "var(--ink)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--paper-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <img
                      src={card.image_small}
                      alt={card.name}
                      style={{
                        height: 56,
                        width: 40,
                        flexShrink: 0,
                        border: "1.5px solid var(--ink)",
                        objectFit: "cover",
                        background: "var(--paper-2)",
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        className="hand"
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          lineHeight: 1.1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {card.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: 1,
                          color: "var(--ink-soft)",
                          marginTop: 2,
                          textTransform: "uppercase",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {card.set_name} · {card.number}
                        {card.rarity ? ` · ${card.rarity}` : ""}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
