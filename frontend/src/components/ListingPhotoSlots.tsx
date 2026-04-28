/**
 * Listing photo slots — slab/scanner edition.
 *
 * 3-slot uploader (Front · Back · Extra) used by the New Listing wizard.
 * Each slot is a self-contained drop target with its own preview, replace,
 * and remove behaviour. Bulk drop assigns up to 3 files in order.
 *
 * Behaviour preserved 1:1 — same exports, same slot definitions, same
 * file-assignment order, same swap front/back, same `assignFilesByOrder`
 * fallback. Only the visual layer changed.
 */
import { useRef, useState, type DragEventHandler } from "react";
import { AlertTriangle, ArrowLeftRight, ImageIcon, Upload, X } from "lucide-react";
import { SlabButton } from "@/components/slab";

export type ListingPhotoSlotKey = "front" | "back" | "extra";

export interface ListingPhotoSlotFile {
  file: File;
  preview: string;
  position: number;
  slot: ListingPhotoSlotKey;
}

export type ListingPhotoSlots = Record<ListingPhotoSlotKey, ListingPhotoSlotFile | null>;

const SLOT_DEFINITIONS: Array<{
  key: ListingPhotoSlotKey;
  label: string;
  shortLabel: string;
  helper: string;
  position: number;
  required?: boolean;
}> = [
  {
    key: "front",
    label: "FRONT",
    shortLabel: "FRONT",
    helper: "Required. Used for AI identification and as the main eBay photo.",
    position: 1,
    required: true,
  },
  {
    key: "back",
    label: "BACK",
    shortLabel: "BACK",
    helper: "Recommended. Buyers like seeing the actual card back.",
    position: 2,
  },
  {
    key: "extra",
    label: "EXTRA",
    shortLabel: "EXTRA",
    helper: "Optional. Use sparingly — eBay prefers gallery photos of the item.",
    position: 3,
  },
];

export const EMPTY_LISTING_PHOTO_SLOTS: ListingPhotoSlots = {
  front: null,
  back: null,
  extra: null,
};

export function listingPhotoSlotsToArray(
  slots: ListingPhotoSlots,
): ListingPhotoSlotFile[] {
  return SLOT_DEFINITIONS.map((slot) => slots[slot.key]).filter(
    (photo): photo is ListingPhotoSlotFile => Boolean(photo),
  );
}

interface ListingPhotoSlotsUploaderProps {
  slots: ListingPhotoSlots;
  onChange: (slots: ListingPhotoSlots) => void;
}

export function ListingPhotoSlotsUploader({
  slots,
  onChange,
}: ListingPhotoSlotsUploaderProps) {
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [slotDragOver, setSlotDragOver] = useState<ListingPhotoSlotKey | null>(
    null,
  );

  function createSlotPhoto(
    file: File,
    slot: (typeof SLOT_DEFINITIONS)[number],
  ): ListingPhotoSlotFile {
    return {
      file,
      preview: URL.createObjectURL(file),
      position: slot.position,
      slot: slot.key,
    };
  }

  function assignFilesByOrder(files: FileList | File[]) {
    const imageFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, SLOT_DEFINITIONS.length);

    if (imageFiles.length === 0) return;

    const nextSlots: ListingPhotoSlots = { ...slots };
    imageFiles.forEach((file, index) => {
      const slot = SLOT_DEFINITIONS[index];
      if (!slot) return;
      nextSlots[slot.key] = createSlotPhoto(file, slot);
    });
    onChange(nextSlots);
  }

  function replaceSlot(slotKey: ListingPhotoSlotKey, file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const slot = SLOT_DEFINITIONS.find((item) => item.key === slotKey);
    if (!slot) return;
    onChange({
      ...slots,
      [slotKey]: createSlotPhoto(file, slot),
    });
  }

  function removeSlot(slotKey: ListingPhotoSlotKey) {
    onChange({
      ...slots,
      [slotKey]: null,
    });
  }

  function swapFrontBack() {
    if (!slots.front || !slots.back) return;
    onChange({
      ...slots,
      front: { ...slots.back, slot: "front", position: 1 },
      back: { ...slots.front, slot: "back", position: 2 },
    });
  }

  function handleBulkInput(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) assignFilesByOrder(event.target.files);
    event.target.value = "";
  }

  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setBulkDragOver(false);
    assignFilesByOrder(event.dataTransfer.files);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Bulk drop strip + add-photos button */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setBulkDragOver(true);
          }}
          onDragLeave={() => setBulkDragOver(false)}
          onDrop={handleDrop}
          style={{
            flex: "1 1 280px",
            border: `1.5px dashed ${bulkDragOver ? "var(--accent)" : "var(--ink)"}`,
            background: bulkDragOver ? "var(--accent-soft)" : "var(--paper-2)",
            padding: 12,
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1.5,
              fontWeight: 700,
              color: "var(--ink-soft)",
            }}
          >
            ↓ DROP HERE TO BULK ASSIGN
          </div>
          <div
            style={{
              fontFamily: "var(--font-marker)",
              fontSize: 12,
              color: "var(--ink-soft)",
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            Up to 3 images. File 1 = front, file 2 = back, file 3 = extra.
          </div>
        </div>
        <SlabButton size="sm" onClick={() => bulkInputRef.current?.click()}>
          <Upload className="size-3" />
          ADD PHOTOS
        </SlabButton>
        <input
          ref={bulkInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleBulkInput}
        />
      </div>

      {/* 3-slot grid */}
      <div className="lps-slot-grid">
        {SLOT_DEFINITIONS.map((slot) => (
          <PhotoSlotCard
            key={slot.key}
            slot={slot}
            photo={slots[slot.key]}
            onReplace={(file) => replaceSlot(slot.key, file)}
            onRemove={() => removeSlot(slot.key)}
            dragOver={slotDragOver === slot.key}
            onDragOver={() => setSlotDragOver(slot.key)}
            onDragLeave={() =>
              setSlotDragOver((current) =>
                current === slot.key ? null : current,
              )
            }
            onDrop={(file) => {
              setSlotDragOver(null);
              replaceSlot(slot.key, file);
            }}
          />
        ))}
      </div>

      {/* Footer actions + warnings */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SlabButton
          size="sm"
          disabled={!slots.front || !slots.back}
          onClick={swapFrontBack}
        >
          <ArrowLeftRight className="size-3" />
          SWAP FRONT/BACK
        </SlabButton>
        {!slots.back && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1,
              padding: "4px 8px",
              background: "#f5a623",
              color: "var(--ink)",
              fontWeight: 700,
              border: "1.5px solid var(--ink)",
            }}
          >
            ? BACK PHOTO MISSING
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          border: "1.5px solid #f5a623",
          background: "rgba(245,166,35,0.08)",
          padding: "10px 12px",
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
          Optional extra images publish to eBay as listing photos. eBay prefers
          gallery photos showing the actual item — use graphics sparingly.
        </div>
      </div>

      <style>{`
        .lps-slot-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (max-width: 600px) {
          .lps-slot-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// ── Photo slot card ─────────────────────────────────────────

function PhotoSlotCard({
  slot,
  photo,
  onReplace,
  onRemove,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  slot: (typeof SLOT_DEFINITIONS)[number];
  photo: ListingPhotoSlotFile | null;
  onReplace: (file: File | undefined) => void;
  onRemove: () => void;
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (file: File | undefined) => void;
}) {
  const inputId = `listing-photo-slot-${slot.key}`;

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragOver();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragLeave();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDrop(event.dataTransfer.files[0]);
      }}
      style={{
        background: dragOver ? "var(--accent-soft)" : "var(--paper)",
        border: `2px solid ${dragOver ? "var(--accent)" : "var(--ink)"}`,
        boxShadow: photo ? "3px 3px 0 var(--ink)" : "none",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: photo ? "var(--ink)" : "var(--paper-2)",
          color: photo ? "var(--paper)" : "var(--ink)",
          padding: "5px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: 1.5,
          borderBottom: photo ? "none" : "1.5px solid var(--ink)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: photo ? "var(--accent)" : "var(--ink)",
              color: photo ? "var(--ink)" : "var(--paper)",
              padding: "1px 6px",
              fontWeight: 700,
            }}
          >
            {String(slot.position).padStart(2, "0")}
          </span>
          <span>
            {slot.label}
            {slot.required ? " *" : ""}
          </span>
        </span>
        {photo && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${slot.label} photo`}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--paper)",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Image / dropzone */}
      <label
        htmlFor={inputId}
        style={{
          display: "flex",
          aspectRatio: "5/7",
          cursor: "pointer",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: photo ? "var(--paper-2)" : "transparent",
          textAlign: "center",
          padding: photo ? 0 : 12,
        }}
      >
        {photo ? (
          <img
            src={photo.preview}
            alt={`${slot.shortLabel} preview`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "var(--ink-soft)",
              fontWeight: 700,
            }}
          >
            <ImageIcon className="size-7" />
            <span>{slot.shortLabel}</span>
            <span style={{ fontWeight: 400, opacity: 0.7 }}>CLICK TO UPLOAD</span>
          </div>
        )}
      </label>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(event) => {
          onReplace(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {/* Helper */}
      <div
        style={{
          padding: "8px 10px",
          background: photo ? "var(--paper)" : "var(--paper-2)",
          borderTop: photo ? "1.5px solid var(--ink)" : "none",
          fontFamily: "var(--font-marker)",
          fontSize: 11,
          color: "var(--ink-soft)",
          lineHeight: 1.4,
        }}
      >
        {slot.helper}
      </div>
    </div>
  );
}
