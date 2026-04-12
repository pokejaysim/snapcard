import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { Loader2, Search } from "lucide-react";
import type { PokemonTcgSearchResult, PokemonTcgCardDetail } from "../../../shared/types";

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

  // Search query
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
      // Fallback: use the search result data without full detail
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
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => debouncedQuery.length >= 2 && setOpen(true)}
          placeholder="Search by card name (e.g. Charizard)"
          className="pl-9"
          disabled={disabled || loadingDetail}
        />
        {(isLoading || loadingDetail) && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-card shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </div>
          ) : data?.cards.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No cards found for "{debouncedQuery}"
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {data?.cards.map((card) => (
                <li key={card.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-accent"
                    onClick={() => handleSelect(card)}
                  >
                    <img
                      src={card.image_small}
                      alt={card.name}
                      className="h-11 w-8 shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{card.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {card.set_name} · {card.number}
                        {card.rarity ? ` · ${card.rarity}` : ""}
                      </p>
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
