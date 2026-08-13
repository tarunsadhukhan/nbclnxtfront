import * as React from "react";
import { brand } from "@/styles/brand";

interface InfoSkyMarkProps {
  /** Rendered width/height in px */
  size?: number;
  /** Hexagon, "i" stem and orbit colour */
  navy?: string;
  /** "S", dot and tail colour */
  green?: string;
  className?: string;
}

/**
 * InfoSky Global mark — hexagon enclosing an "iS" monogram with an orbit
 * ellipse. Drawn inline so it stays crisp at any size and recolours by prop
 * (the brand navy replaces the original charcoal).
 */
export default function InfoSkyMark({
  size = 28,
  navy = brand.navyInk,
  green = brand.green,
  className,
}: InfoSkyMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="InfoSky Global"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hexagon, pointy top and bottom */}
      <polygon
        points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5"
        stroke={navy}
        strokeWidth={6}
        strokeLinejoin="round"
      />

      {/* Orbit ellipse behind the monogram */}
      <ellipse
        cx="50"
        cy="55"
        rx="34"
        ry="12"
        stroke={navy}
        strokeOpacity={0.35}
        strokeWidth={3}
        transform="rotate(-12 50 55)"
      />

      {/* "i" — green dot over a navy stem */}
      <circle cx="35" cy="33" r="6" fill={green} />
      <rect x="30" y="43" width="10" height="32" rx="5" fill={navy} />

      {/* "S" — set in the app font so it matches the wordmark */}
      <text
        x="58"
        y="72"
        textAnchor="middle"
        fontFamily="inherit"
        fontSize="52"
        fontWeight={700}
        fill={green}
      >
        S
      </text>

      {/* Trailing dot */}
      <circle cx="84" cy="57" r="5" fill={green} />
    </svg>
  );
}
