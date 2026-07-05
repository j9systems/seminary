"use client";

import React, { useRef, useState } from "react";
import type { CardType } from "@/lib/types";

/**
 * Parse a CSS declaration string ("a:b;c:d") into a React style object.
 * Lets us port the prototype's inline style strings near-verbatim. Only the
 * first ":" in each declaration is used as the split, so values containing
 * colons (url(), data:, var() fallbacks) survive. Custom props (--x) pass
 * through unchanged; other properties are camelCased.
 */
export function cssx(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const rawKey = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!rawKey || !val) continue;
    const key = rawKey.startsWith("--")
      ? rawKey
      : rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  }
  return out as React.CSSProperties;
}

// ── Nav / feather-style icons (ported from the prototype's icon()) ──────────
type Seg = ["p", string] | ["c", number, number, number];
const ICONS: Record<string, Seg[]> = {
  home: [["p", "M3 10.5 12 3l9 7.5"], ["p", "M5 9.5V21h14V9.5"]],
  book: [
    ["p", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"],
    ["p", "M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-2.5"],
  ],
  check: [
    ["p", "M9 11l3 3 8-8"],
    ["p", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  ],
  users: [
    ["p", "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"],
    ["c", 9, 7, 4],
    ["p", "M23 21v-2a4 4 0 0 0-3-3.87"],
    ["p", "M16 3.13a4 4 0 0 1 0 7.75"],
  ],
  bell: [
    ["p", "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"],
    ["p", "M13.7 21a2 2 0 0 1-3.4 0"],
  ],
  live: [["c", 12, 12, 2], ["p", "M7.8 7.8a6 6 0 0 0 0 8.4"], ["p", "M16.2 7.8a6 6 0 0 1 0 8.4"]],
  pencil: [
    ["p", "M12 20h9"],
    ["p", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"],
  ],
  user: [["c", 12, 8, 4], ["p", "M4 21v-1a8 8 0 0 1 16 0v1"]],
};

export function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const segs = ICONS[name] || ICONS.home;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {segs.map((e, i) =>
        e[0] === "c" ? (
          <circle key={i} cx={e[1]} cy={e[2]} r={e[3]} />
        ) : (
          <path key={i} d={e[1]} />
        )
      )}
    </svg>
  );
}

export function typeChip(type: CardType): { label: string; bg: string; fg: string } {
  const m: Record<CardType, { label: string; bg: string; fg: string }> = {
    scripture: { label: "SCRIPTURE", bg: "var(--soft)", fg: "var(--acc)" },
    quote: { label: "QUOTE", bg: "var(--soft)", fg: "var(--acc)" },
    activity: {
      label: "ACTIVITY",
      bg: "color-mix(in oklab, var(--amb) 22%, var(--card))",
      fg: "color-mix(in oklab, var(--amb) 60%, var(--ink))",
    },
    image: {
      label: "IMAGE",
      bg: "color-mix(in oklab, var(--ok) 14%, var(--card))",
      fg: "var(--ok)",
    },
  };
  return m[type] || m.quote;
}

// ── ImageSlot — real replacement for the design-canvas <image-slot> ──────────
// Empty state matches the prototype placeholder (rounded box, picture icon,
// caption). When editable, clicking opens a file picker; the chosen image is
// read as a data URL and handed to onPick (demo mode stores it directly;
// live mode uploads to Supabase Storage).
export function ImageSlot({
  shape = "rounded",
  radius = 12,
  placeholder = "Drop an image",
  src,
  editable,
  onPick,
  style,
}: {
  shape?: "rect" | "rounded" | "circle" | "pill";
  radius?: number;
  placeholder?: string;
  src?: string | null;
  editable?: boolean;
  onPick?: (dataUrl: string) => void;
  style?: React.CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const rad =
    shape === "circle" ? "50%" : shape === "pill" ? "9999px" : shape === "rect" ? "0" : radius + "px";

  const pick = (file: File | undefined) => {
    if (!file || !onPick) return;
    setBusy(true);
    const r = new FileReader();
    r.onload = () => {
      onPick(String(r.result));
      setBusy(false);
    };
    r.onerror = () => setBusy(false);
    r.readAsDataURL(file);
  };

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: rad,
        background: "color-mix(in srgb, var(--line) 40%, transparent)",
        cursor: editable ? "pointer" : "default",
        ...style,
      }}
      onClick={editable ? () => inputRef.current?.click() : undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            textAlign: "center",
            padding: 12,
            color: "var(--mut)",
            border: "1.5px dashed color-mix(in srgb, var(--line) 90%, var(--mut))",
            borderRadius: rad,
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.55 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 500, maxWidth: "90%" }}>
            {busy ? "Uploading…" : placeholder}
          </div>
          {editable && <div style={{ fontSize: 11, opacity: 0.8 }}>Click to add</div>}
        </div>
      )}
      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}
