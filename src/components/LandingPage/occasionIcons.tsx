import type { ReactNode } from 'react';

export type OccasionId = 'babyShower' | 'family' | 'office' | 'friends' | 'kids' | 'party';

/** Trazos de los íconos de las cartas de ocasiones, sobre una cuadrícula de 24 × 24. */
const ICON_PATHS: Record<OccasionId, ReactNode> = {
  babyShower: (
    <>
      <path d="M9 21h6" />
      <path d="M12 17v4" />
      <circle cx="12" cy="10" r="5" />
      <path d="M10 9.5h.01M14 9.5h.01" />
      <path d="M10.5 12c.8.6 2.2.6 3 0" />
      <path d="M12 5c0-1.5 1-2.5 2.5-2.5" />
    </>
  ),
  family: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <circle cx="9.5" cy="14" r="1.6" />
      <circle cx="14.5" cy="14" r="1.6" />
      <path d="M7.5 20c0-2 1-3 2-3s2 1 2 3M12.5 20c0-2 1-3 2-3s2 1 2 3" />
    </>
  ),
  office: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
      <path d="M11 13v2h2v-2" />
    </>
  ),
  friends: (
    <>
      <path d="M8 3h5l-1 7a3 3 0 0 1-3 0z" />
      <path d="M10.5 11v6M8 21h5M10.5 17v4" />
      <path d="M14 6h5l-1 6a3 3 0 0 1-3 0z" transform="rotate(12 16.5 9)" />
      <path d="M16.8 13.5l-.8 5.5M14.5 21h4" />
    </>
  ),
  kids: (
    <>
      <ellipse cx="12" cy="8" rx="5" ry="6" />
      <path d="M12 14l-1 2h2z" />
      <path d="M12 16c0 2-2 2.5-1 5" />
      <path d="M10 6.5a2 2 0 0 1 2-2" />
    </>
  ),
  party: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 9v6" />
    </>
  ),
};

export const OccasionIcon = ({ id, className }: { id: OccasionId; className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICON_PATHS[id]}
  </svg>
);
