import type { StyledAtomStyles } from "styled-atom";

type Tokens = Record<string, string>;

/**
 * Each color preset is defined by just a hue and two saturations. Every surface,
 * text and accent token is derived from those numbers on a shared lightness
 * scale — light mode darkens the hue for text, dark mode lightens it — so adding
 * a theme means picking three numbers, not authoring a dozen colors.
 */
type ThemeHsl = { h: number; s: number; sn: number };

const themes: Record<string, ThemeHsl> = {
  // h: hue; s: chroma of text/accent; sn: chroma of the near-neutral surfaces.
  grey: { h: 40, s: 6, sn: 5 },
  blue: { h: 217, s: 55, sn: 34 },
  brown: { h: 28, s: 42, sn: 28 },
};

const hsl = (h: number, s: number, l: number) =>
  `hsl(${h} ${Math.round(s * 10) / 10}% ${l}%)`;

// Light mode: text is the hue darkened; surfaces sit near white with a faint
// tint of the same hue.
function lightPalette({ h, s, sn }: ThemeHsl): Tokens {
  return {
    "--dw-bg": hsl(h, sn, 92.5),
    "--dw-surface": hsl(h, sn, 98.5),
    "--dw-surface-hover": hsl(h, sn, 95.5),
    "--dw-text": hsl(h, s, 40),
    "--dw-muted": hsl(h, s * 0.75, 43),
    "--dw-accent": hsl(h, s, 45),
    "--dw-accent-contrast": hsl(h, sn, 99),
    "--dw-accent-soft": hsl(h, s * 0.85, 90),
    "--dw-ring": hsl(h, s, 66),
    "--dw-danger": "hsl(2 75% 48%)",
  };
}

// Dark mode mirrors the same scale: text is the hue lightened; surfaces sit near
// black with the same tint.
function darkPalette({ h, s, sn }: ThemeHsl): Tokens {
  return {
    "--dw-bg": hsl(h, sn, 10),
    "--dw-surface": hsl(h, sn, 15),
    "--dw-surface-hover": hsl(h, sn, 19.5),
    "--dw-text": hsl(h, s * 0.7, 70),
    "--dw-muted": hsl(h, s * 0.55, 62),
    "--dw-accent": hsl(h, s, 70),
    "--dw-accent-contrast": hsl(h, sn, 12),
    "--dw-accent-soft": hsl(h, s * 0.7, 24),
    "--dw-ring": hsl(h, s, 45),
    "--dw-danger": "hsl(2 80% 71%)",
  };
}

// Edges and shadows are theme-agnostic: pure black in light mode, pure white in
// dark mode, differing only by opacity. Borders are expressed as a 1px inset
// shadow (`--dw-border`) so a control's edge and its drop shadow live in one
// `box-shadow` and never depend on the palette color. Palettes below carry only
// real colors (surfaces, text, accent).
const lightNeutrals: Tokens = {
  "--dw-border": "rgba(0, 0, 0, 0.1)",
  "--dw-shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
  "--dw-shadow-md":
    "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
  "--dw-shadow-lg": "0 12px 32px rgba(0, 0, 0, 0.14)",
};

const darkNeutrals: Tokens = {
  "--dw-border": "rgba(255, 255, 255, 0.12)",
  "--dw-shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.4)",
  "--dw-shadow-md": "0 2px 6px rgba(0, 0, 0, 0.45)",
  "--dw-shadow-lg": "0 16px 40px rgba(0, 0, 0, 0.6)",
};

const palettes: Record<string, Tokens> = {
  "light-grey": lightPalette(themes.grey),
  "light-blue": lightPalette(themes.blue),
  "light-brown": lightPalette(themes.brown),
  "dark-grey": darkPalette(themes.grey),
  "dark-blue": darkPalette(themes.blue),
  "dark-brown": darkPalette(themes.brown),
};

// Menu swatch: the preset hue at a fixed mid lightness, same in light and dark.
export const themeColorSwatches: Record<string, string> = Object.fromEntries(
  Object.entries(themes).map(([name, { h, s }]) => [name, hsl(h, s, 52)]),
);

// MorphScroll's edge gradient needs a concrete color (it can't read a CSS
// variable), so it resolves the page background from the same derivation.
export function getWorkbenchBg(darkTheme: boolean, themeColor: string): string {
  const theme = themes[themeColor] ?? themes.grey;
  return (darkTheme ? darkPalette : lightPalette)(theme)["--dw-bg"];
}

const transition = "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)";
const rootFont =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

const workbenchStyles: StyledAtomStyles = {
  position: "fixed",
  inset: 0,
  display: "block",
  fontFamily: rootFont,
  letterSpacing: 0,

  "@keyframes demo-workbench-appear": {
    "0%": { opacity: 0 },
    "100%": { opacity: 1 },
  },

  "@keyframes demo-workbench-ident": {
    "0%": { opacity: 0, scale: 0.96 },
    "100%": { opacity: 1, scale: 1 },
  },

  "@keyframes demo-workbench-menu": {
    "0%": { opacity: 0, transform: "translateX(-50%) translateY(-6px)" },
    "100%": { opacity: 1, transform: "translateX(-50%) translateY(0)" },
  },

  "*, *::before, *::after": {
    boxSizing: "border-box",
  },

  "button, input": {
    font: "inherit",
    letterSpacing: 0,
  },

  button: {
    appearance: "none",
    border: 0,
    background: "transparent",
    padding: 0,
  },

  a: {
    color: "inherit",
    textDecoration: "none",
  },

  ".demo-workbench-shell": {
    position: "absolute",
    inset: 0,
    minHeight: "100%",
    overflow: "hidden",
    colorScheme: "light",
    // Default palette: light grey. Overridden by the attribute blocks below.
    ...lightNeutrals,
    ...palettes["light-grey"],
  },

  '.demo-workbench-shell[data-demo-workbench-color="blue"]':
    palettes["light-blue"],
  '.demo-workbench-shell[data-demo-workbench-color="brown"]':
    palettes["light-brown"],

  '.demo-workbench-shell[data-demo-workbench-theme="dark"]': {
    colorScheme: "dark",
    ...darkNeutrals,
    ...palettes["dark-grey"],
  },
  '.demo-workbench-shell[data-demo-workbench-theme="dark"][data-demo-workbench-color="blue"]':
    palettes["dark-blue"],
  '.demo-workbench-shell[data-demo-workbench-theme="dark"][data-demo-workbench-color="brown"]':
    palettes["dark-brown"],

  ".demo-workbench-layout": {
    position: "fixed",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: "var(--dw-bg)",
  },

  ".demo-workbench-header": {
    position: "relative",
    zIndex: 30,
    display: "flex",
    alignItems: "center",
    width: "calc(100% - 20px)",
    maxWidth: 1160,
    height: 56,
    margin: "10px auto",
    borderRadius: 26,
    background: "var(--dw-surface)",
    padding: "0 8px",
    boxShadow: "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-sm)",
    animation: "demo-workbench-appear 0.3s ease-in-out 0s 1 forwards",
  },

  // — Title / theme-color menu —

  ".demo-workbench-title-wrap": {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: "calc(100% - 180px)",
  },

  ".demo-workbench-title": {
    display: "flex",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    cursor: "pointer",
    borderRadius: 8,
    padding: "6px 12px",
    color: "var(--dw-text)",
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: "1.5rem",
    transition,
  },

  ".demo-workbench-title:hover": {
    background: "var(--dw-surface-hover)",
  },

  ".demo-workbench-title-text": {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  ".demo-workbench-title-caret": {
    flex: "none",
    width: 8,
    height: 8,
    borderRight: "2px solid var(--dw-muted)",
    borderBottom: "2px solid var(--dw-muted)",
    transform: "translateY(-2px) rotate(45deg)",
    transition,
  },
  '.demo-workbench-title[aria-expanded="true"] .demo-workbench-title-caret': {
    transform: "translateY(2px) rotate(-45deg) scaleY(-1)",
  },

  ".demo-workbench-theme-menu": {
    position: "absolute",
    left: "50%",
    top: "calc(100% + 8px)",
    zIndex: 60,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 160,
    borderRadius: 12,
    background: "var(--dw-surface)",
    boxShadow: "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-lg)",
    padding: 6,
    transform: "translateX(-50%)",
    animation: "demo-workbench-menu 0.14s ease-out 1 forwards",
  },

  ".demo-workbench-theme-option": {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    cursor: "pointer",
    borderRadius: 8,
    padding: "8px 10px",
    color: "var(--dw-text)",
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: "1.25rem",
    textAlign: "left",
    transition,
  },

  ".demo-workbench-theme-option:hover": {
    background: "var(--dw-surface-hover)",
  },

  '.demo-workbench-theme-option[data-active="true"]': {
    background: "var(--dw-accent-soft)",
  },

  ".demo-workbench-theme-swatch": {
    flex: "none",
    width: 16,
    height: 16,
    borderRadius: "50%",
    boxShadow: "inset 0 0 0 1px var(--dw-border)",
  },

  ".demo-workbench-theme-option-label": {
    flex: 1,
    textTransform: "capitalize",
  },

  ".demo-workbench-theme-check": {
    flex: "none",
    width: 14,
    height: 8,
    borderLeft: "2px solid var(--dw-accent)",
    borderBottom: "2px solid var(--dw-accent)",
    transform: "translateY(-2px) rotate(-45deg)",
  },

  // — Search —

  ".demo-workbench-search": {
    position: "absolute",
    left: 12,
    top: "50%",
    width: "fit-content",
    height: "fit-content",
    transform: "translateY(-50%)",
  },

  ".demo-workbench-search-input": {
    width: 32,
    height: 32,
    background: "var(--dw-bg)",
    boxShadow: "inset 0 0 0 1px var(--dw-border)",
    color: "var(--dw-text)",
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: "1.25rem",
    padding: "0 18px 0 14px",
    pointerEvents: "none",
    transition: "width 0.16s ease-in-out",
    borderRadius: 20,
    border: 0,
  },

  ".demo-workbench-search-input::placeholder": {
    color: "var(--dw-muted)",
    opacity: 1,
  },

  '.demo-workbench-search[data-focus="true"] .demo-workbench-search-input': {
    width: 208,
    pointerEvents: "auto",
    boxShadow: "inset 0 0 0 1px var(--dw-ring)",
    outline: "none",
  },

  ".demo-workbench-search-button": {
    position: "absolute",
    right: 3,
    top: 3,
    width: 26,
    height: 26,
    cursor: "pointer",
    borderRadius: "50%",
    transition,
  },

  ".demo-workbench-search-button:hover": {
    background: "var(--dw-surface-hover)",
    boxShadow: "inset 0 0 0 1px var(--dw-border)",
  },

  ".demo-workbench-search-button:active": {
    scale: 0.92,
  },

  ".demo-workbench-search-icon": {
    position: "absolute",
    inset: 0,
  },

  ".demo-workbench-search-icon::before, .demo-workbench-search-icon::after": {
    content: "",
    position: "absolute",
    borderRadius: 30,
    transition,
  },

  '.demo-workbench-search-icon[data-state="search"]::before': {
    left: 4,
    top: 5,
    width: 13,
    height: 13,
    border: "2px solid var(--dw-muted)",
  },

  '.demo-workbench-search-icon[data-state="search"]::after': {
    left: 15,
    top: 14,
    width: 3,
    height: 8,
    background: "var(--dw-muted)",
    transform: "rotate(-45deg)",
  },

  '.demo-workbench-search-icon[data-state="focus"]::before, .demo-workbench-search-icon[data-state="clear"]::before':
    {
      left: "50%",
      top: 5,
      width: 2,
      height: 16,
      transform: "translateX(-50%) rotate(45deg)",
    },

  '.demo-workbench-search-icon[data-state="focus"]::after, .demo-workbench-search-icon[data-state="clear"]::after':
    {
      left: "50%",
      top: 5,
      width: 2,
      height: 16,
      transform: "translateX(-50%) rotate(-45deg)",
    },

  '.demo-workbench-search-icon[data-state="focus"]::before, .demo-workbench-search-icon[data-state="focus"]::after':
    {
      background: "var(--dw-muted)",
    },

  '.demo-workbench-search-icon[data-state="clear"]::before, .demo-workbench-search-icon[data-state="clear"]::after':
    {
      background: "var(--dw-danger)",
    },

  // — Theme (light/dark) toggle —

  ".demo-workbench-theme-toggle": {
    position: "absolute",
    right: 12,
    top: "50%",
    width: 58,
    height: 32,
    cursor: "pointer",
    borderRadius: 999,
    background: "var(--dw-bg)",
    boxShadow: "inset 0 0 0 1px var(--dw-border)",
    transform: "translateY(-50%)",
    transition,
  },

  ".demo-workbench-theme-toggle-knob": {
    position: "absolute",
    left: 3,
    top: 3,
    width: 26,
    height: 26,
    cursor: "pointer",
    borderRadius: "50%",
    background: "var(--dw-surface)",
    boxShadow: "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-sm)",
    transition,
  },

  '.demo-workbench-theme-toggle[data-active="true"] .demo-workbench-theme-toggle-knob':
    {
      left: 28,
    },

  ".demo-workbench-theme-toggle:hover .demo-workbench-theme-toggle-knob": {
    background: "var(--dw-surface-hover)",
  },

  ".demo-workbench-theme-toggle:active .demo-workbench-theme-toggle-knob": {
    scale: 0.92,
  },

  ".demo-workbench-theme-toggle-icon": {
    position: "absolute",
    left: 1,
    top: 1,
    display: "flex",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    border: "6px solid transparent",
    borderRadius: "50%",
    boxShadow: "inset 0 0 0 2px var(--dw-accent)",
    scale: 0.85,
    transition,
  },

  '.demo-workbench-theme-toggle[data-active="true"] .demo-workbench-theme-toggle-icon':
    {
      borderWidth: 4,
      boxShadow: "inset -4px -4px 0 var(--dw-accent)",
    },

  ".demo-workbench-theme-toggle-line": {
    position: "absolute",
    display: "flex",
    width: 24,
    height: 2,
    alignItems: "center",
    justifyContent: "center",
    borderLeft: "4px solid var(--dw-accent)",
    borderRight: "4px solid var(--dw-accent)",
    transition,
    "&::before": {
      content: "",
      position: "absolute",
      width: 24,
      height: 2,
      borderLeft: "4px solid var(--dw-accent)",
      borderRight: "4px solid var(--dw-accent)",
      transform: "rotate(45deg)",
    },
  },

  ".demo-workbench-theme-toggle-line-y": {
    transform: "rotate(90deg)",
  },

  '.demo-workbench-theme-toggle[data-active="true"] .demo-workbench-theme-toggle-line':
    {
      opacity: 0,
    },

  // — Grid / scroll —

  ".demo-workbench-grid-shell": {
    position: "relative",
    width: "calc(100% - 20px)",
    height: "calc(100vh - 85px)",
    margin: "auto",
  },

  ".demo-workbench-scroll": {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },

  ".demo-workbench-scroll > .ms-content > .ms-element > .ms-objects-wrapper > .ms-object-box":
    {
      opacity: "var(--content-visibility)",
      filter:
        "grayscale(calc(1 - var(--content-visibility))) blur(calc((1 - var(--content-visibility)) * 2px))",
      transition: "transform 0.2s ease-in-out",
    },

  ".demo-workbench-scroll > .ms-content > .ms-bar": {
    translate: "-2px 0px",
  },

  ".demo-workbench-card, .demo-workbench-scroll-progress": {
    animation: "demo-workbench-ident 0.2s ease-in-out 1 forwards",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 16,
    background: "var(--dw-surface)",
    boxShadow: "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-sm)",
    color: "var(--dw-muted)",
    transition,
  },

  ".demo-workbench-card:hover": {
    background: "var(--dw-surface-hover)",
    boxShadow: "inset 0 0 0 1px var(--dw-accent), var(--dw-shadow-md)",
  },

  ".demo-workbench-card": {
    position: "relative",
    display: "flex",
    width: 238,
    height: 156,
    "&:active": {
      transform: "scale(0.97)",
    },
    "&.fallback-card": {
      pointerEvents: "none",
      "@keyframes fallback-card-anim": {
        "0%": {
          transform: "rotate(5deg) translateY(0)",
        },
        "50%": {
          transform: "rotate(4deg) translateY(-10px)",
        },
        "100%": {
          transform: "rotate(5deg) translateY(0)",
        },
      },
      "@keyframes fallback-shadow-anim": {
        "0%": {
          boxShadow:
            "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-sm), 0 0 0 0px rgba(255, 255, 255, 0.05)",
        },
        "100%": {
          boxShadow:
            "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-sm), 0 0 0 20px rgba(255, 255, 255, 0)",
        },
      },
      animation:
        "fallback-card-anim 6s cubic-bezier(0.4, 0, 0.6, 1) 0s infinite, fallback-shadow-anim 2s cubic-bezier(0.4, 0, 0.6, 1) 0s infinite",
      ".content": {
        width: "100%",
        height: "100%",
        background: "var(--dw-surface-hover)",
        ".emoji": {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          margin: "0",
          fontSize: "150px",
          "@keyframes emoji-anim1": {
            "0%": { content: "^____^" },
            "50%": { content: "^____^" },
            "60%": { content: "•`____•`" },
            "70%": { content: "´•____´•" },
            "80%": { content: "* ____ *" },
            "100%": { content: "^____^" },
          },
          "@keyframes emoji-anim2": {
            "0%": { content: "-____-" },
            "50%": { content: "-____-" },
            "60%": { content: "•`____•`" },
            "70%": { content: "´•____´•" },
            "80%": { content: "~____~" },
            "100%": { content: "-____-" },
          },
          "&::before": {
            content: "",
          },
        },
      },
      "&.empty .emoji::before": {
        animation: "emoji-anim1 14s cubic-bezier(0.4, 0, 0.6, 1) 0s infinite",
      },
      "&.not-found .emoji::before": {
        animation: "emoji-anim2 14s cubic-bezier(0.4, 0, 0.6, 1) 0s infinite",
      },
    },
  },

  '.demo-workbench-card[data-open="true"]': {
    boxShadow: "inset 0 0 0 2px var(--dw-accent), var(--dw-shadow-sm)",
  },

  ".demo-workbench-load-fill": {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: 120,
    overflow: "hidden",
    borderRadius: 12,
    background: "var(--dw-surface-hover)",
  },

  ".demo-workbench-demo-body": {
    position: "relative",
  },

  '.demo-workbench-demo-body[data-mode="card"]': {
    height: "100%",
  },

  '.demo-workbench-demo-body[data-mode="page"]': {
    minHeight: "100%",
  },

  ".demo-workbench-page-cell": {
    position: "relative",
    minHeight: "100%",
    overflow: "hidden",
  },

  ".demo-workbench-preview-frame": {
    position: "absolute",
    width: 1200,
    height: 640,
    overflow: "hidden",
    borderRadius: 50,
    background: "#fff",
    boxShadow: "0 0 0 6px var(--dw-border)",
    pointerEvents: "none",
    transform: "translateY(10px) scale(0.180134)",
  },

  ".demo-workbench-card-fallback": {
    width: "100%",
    height: "100%",
    background: "var(--dw-surface-hover)",
  },

  ".demo-workbench-card-link": {
    position: "absolute",
    inset: 0,
    display: "block",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    padding: "0 20px",
    cursor: "pointer",
    color: "var(--dw-text)",
    fontSize: "0.75rem",
    fontWeight: 600,
    lineHeight: "1.75rem",
    textAlign: "center",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  ".demo-workbench-page-overlay": {
    position: "fixed",
    overflow: "hidden",
    transition,
  },

  '.demo-workbench-page-overlay[data-expanded="true"]': {
    width: "100%",
    height: "100%",
    scale: 1,
  },

  '.demo-workbench-page-overlay[data-expanded="false"]': {
    width: 1200,
    height: 640,
    borderRadius: 50,
    background: "#fff",
    boxShadow: "0 0 0 6px var(--dw-border), var(--dw-shadow-lg)",
    scale: 0.180134,
  },

  ".demo-workbench-scroll-progress": {
    position: "relative",
    display: "flex",
    width: 10,
    height: "100%",
    "&:hover": {
      background: "var(--dw-surface-hover)",
      boxShadow: "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-md)",
    },
    "&:active": {
      margin: "-2px -1px",
      height: "calc(100% + 4px)",
      width: 12,
      background: "var(--dw-surface-hover)",
      boxShadow: "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-md)",
    },
  },

  // — Floating buttons —

  ".demo-workbench-page-close, .demo-workbench-to-top": {
    position: "absolute",
    bottom: 46,
    zIndex: 20,
    width: 40,
    height: 40,
    cursor: "pointer",
    borderRadius: "50%",
    background: "var(--dw-surface)",
    boxShadow: "inset 0 0 0 1px var(--dw-border), var(--dw-shadow-md)",
    transition,
  },

  ".demo-workbench-page-close:hover, .demo-workbench-to-top:hover": {
    background: "var(--dw-surface-hover)",
  },

  ".demo-workbench-page-close:active, .demo-workbench-to-top:active": {
    scale: 0.92,
  },

  ".demo-workbench-page-close": {
    left: "50%",
    zIndex: 40,
    transform: "translateX(-50%)",
    position: "fixed",
  },

  ".demo-workbench-to-top": {
    right: 60,
    pointerEvents: "auto",
    opacity: 1,
    scale: 1,
  },

  '.demo-workbench-to-top[data-visible="false"]': {
    pointerEvents: "none",
    opacity: 0,
    scale: 0.9,
  },

  ".demo-workbench-page-close-icon": {
    position: "absolute",
    inset: 0,
  },

  ".demo-workbench-page-close-icon::before, .demo-workbench-page-close-icon::after":
    {
      content: "",
      position: "absolute",
      left: "50%",
      top: "50%",
      width: 3,
      height: 22,
      borderRadius: 30,
      background: "var(--dw-muted)",
      transform: "translate(-50%, -50%) rotate(45deg)",
      transition,
    },

  ".demo-workbench-page-close-icon::after": {
    transform: "translate(-50%, -50%) rotate(-45deg)",
  },

  ".demo-workbench-page-close:hover .demo-workbench-page-close-icon::before, .demo-workbench-page-close:hover .demo-workbench-page-close-icon::after":
    {
      background: "var(--dw-danger)",
    },

  ".demo-workbench-to-top-icon": {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 24,
    height: 24,
    transform: "translate(-50%, -50%)",
    "&::before": {
      left: 0,
      transform: "rotate(-45deg)",
    },
    "&::after": {
      right: 0,
      transform: "rotate(45deg)",
    },
  },

  ".demo-workbench-to-top-icon::before, .demo-workbench-to-top-icon::after": {
    content: "",
    position: "absolute",
    top: 10,
    width: 15,
    height: 3,
    borderRadius: 2,
    background: "var(--dw-muted)",
  },

  ".demo-workbench-to-top:hover .demo-workbench-to-top-icon::before, .demo-workbench-to-top:hover .demo-workbench-to-top-icon::after":
    {
      background: "var(--dw-accent)",
    },
};

export default workbenchStyles;
