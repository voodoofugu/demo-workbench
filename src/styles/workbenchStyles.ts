import type { StyledAtomStyles } from "styled-atom";

const colors = {
  blueGray50: "#f8fafc",
  blueGray950: "#020617",
  indigo50: "#eef2ff",
  indigo100: "#e0e7ff",
  indigo200: "#c7d2fe",
  indigo250: "#bbc8fc",
  indigo300: "#a5b4fc",
  indigo400: "#818cf8",
  indigo500: "#6366f1",
  indigo600: "#4f46e5",
  indigo700: "#4338ca",
  indigo800: "#3730a3",
  indigo900: "#312e81",
  indigo950: "#1e1b4b",
  indigo1000: "#1c1842",
  red500: "#ef4444",
  yellow400: "#facc15",
  zinc100: "#f4f4f5",
  zinc300: "#d4d4d8",
  zinc500: "#71717a",
  zinc800: "#27272a",
};

const shadows = {
  lightInset:
    "inset -1px -1px 3px #eaecfb, 1px 1px 3px #fff, inset 1px 1px 3px #abb1ed, -1px -1px 3px #969ee9",
  lightInput:
    "inset -1px -1px 3px #c0c5f2, 1px 1px 3px #eaecfb, inset 1px 1px 3px #818ae4, -1px -1px 3px #5763db",
  lightButton:
    "-1px -1px 2px #fff, inset 1px 1px 2px #dde0f8, 1px 1px 2px #818ae4, inset -1px -1px 2px #abb1ed",
  floatingButton:
    "-1px -1px 2px #fff, inset 1px 1px 2px #dde0f8, 1px 1px 2px #818ae4, inset -1px -1px 2px #abb1ed, 0 4px 10px #969ee9",
  darkInset:
    "inset -1px -1px 3px #2c3c6e, 1px 1px 3px #3b5093, inset 1px 1px 3px #161e38, -1px -1px 3px #0f1425",
  darkInput:
    "inset -1px -1px 3px #abb1ed, 1px 1px 3px #3b5093, inset 1px 1px 3px #25325c, -1px -1px 3px #0f1425",
  darkButton:
    "-1px -1px 2px #969ee9, inset 1px 1px 2px #344680, 1px 1px 2px #161e38, inset -1px -1px 2px #1e284a",
  sun: "inset 0 0 0 2px #818cf8",
  moon: `inset -4px -4px 0 ${colors.yellow400}`,
  preview:
    "0 0 0 10px #c0c5f2, 20px 20px 40px #969ee9, -20px -20px 40px #fff",
  previewDark:
    "0 0 0 10px #1e284a, 20px 20px 40px #0f1425, -20px -20px 40px #3b5093",
  card:
    "-4px -4px 8px #fff, inset 1px 1px 2px #fff, inset -1px -1px 2px #abb1ed, 4px 4px 8px #abb1ed",
  cardHover:
    "0 0 2px 1px #818ae4, -5px -5px 10px #fff, inset 1px 1px 2px #fff, inset -1px -1px 2px #abb1ed, 5px 5px 10px #abb1ed",
  cardDark:
    "-4px -4px 8px #3b5093, inset 1px 1px 2px #344680, inset -1px -1px 2px #161e38, 4px 4px 8px #161e38",
  cardDarkHover:
    "0 0 2px 1px #818ae4, -5px -5px 10px #3b5093, inset 1px 1px 2px #344680, inset -1px -1px 2px #161e38, 5px 5px 10px #0f1425",
  tooltip: "inset 1px 1px 2px #fff, inset -1px -1px 2px #969ee9",
  tooltipDark: "inset 1px 1px 2px #5c73be, inset -1px -1px 2px #25325c",
};

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
    "0%": {
      opacity: 0,
      scale: 0.8,
    },
    "100%": {
      opacity: 1,
      scale: 1,
    },
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
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"]': {
    colorScheme: "dark",
  },

  ".demo-workbench-layout": {
    position: "fixed",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: colors.indigo200,
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-layout':
    {
      background: colors.indigo950,
    },

  ".demo-workbench-header": {
    position: "relative",
    width: "calc(100% - 80px)",
    maxWidth: 1160,
    margin: "30px auto",
    borderRadius: 18,
    background: colors.indigo250,
    padding: 10,
    boxShadow: shadows.lightInset,
    animation: "demo-workbench-appear 0.3s ease-in-out 0s 1 forwards",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-header':
    {
      background: colors.indigo1000,
      boxShadow: shadows.darkInset,
    },

  ".demo-workbench-title": {
    overflow: "hidden",
    padding: "0 90px",
    color: colors.indigo400,
    fontSize: "1.5rem",
    fontStyle: "italic",
    fontWeight: 700,
    lineHeight: "2rem",
    textAlign: "center",
    textOverflow: "ellipsis",
    textShadow: "0.5px 0.5px 1px rgba(255, 255, 255, 0.6)",
    whiteSpace: "nowrap",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-title':
    {
      color: colors.indigo500,
      textShadow: "0.5px 0.5px 1px rgba(0, 0, 0, 0.8)",
    },

  ".demo-workbench-search": {
    position: "absolute",
    left: 10,
    top: "50%",
    width: "fit-content",
    height: "fit-content",
    transform: "translateY(-50%)",
  },

  ".demo-workbench-search-input": {
    width: 0,
    height: 0,
    border: "none",
    borderRadius: 24,
    outline: "2px solid transparent",
    outlineOffset: 2,
    background: colors.indigo300,
    boxShadow: shadows.lightInput,
    color: colors.indigo800,
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: "1.25rem",
    padding: 16,
    pointerEvents: "none",
    textShadow: "0.5px 0.5px 1px rgba(255, 255, 255, 0.6)",
    transition: "width 0.1s ease-in-out",
  },

  ".demo-workbench-search-input::placeholder": {
    color: colors.indigo500,
    opacity: 1,
  },

  '.demo-workbench-search[data-focus="true"] .demo-workbench-search-input': {
    width: 184,
    paddingRight: 34,
    pointerEvents: "auto",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-search-input':
    {
      background: colors.indigo500,
      boxShadow: shadows.darkInput,
      color: colors.indigo950,
      textShadow: "0.5px 0.5px 1px rgba(255, 255, 255, 0.2)",
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-search-input::placeholder':
    {
      color: colors.indigo700,
    },

  ".demo-workbench-search-button": {
    position: "absolute",
    right: 3,
    top: 3,
    width: 26,
    height: 26,
    cursor: "pointer",
    borderRadius: 24,
    background: colors.indigo200,
    boxShadow: shadows.lightButton,
    transition,
  },

  ".demo-workbench-search-button:hover": {
    filter: "brightness(1.05)",
  },

  ".demo-workbench-search-button:active": {
    scale: 0.9,
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-search-button':
    {
      background: colors.indigo900,
      boxShadow: shadows.darkButton,
    },

  ".demo-workbench-search-icon": {
    position: "absolute",
    inset: 0,
    filter: "drop-shadow(0.5px 0.5px 0.5px rgba(255, 255, 255, 1))",
  },

  ".demo-workbench-search-icon::before, .demo-workbench-search-icon::after": {
    content: '""',
    position: "absolute",
    borderRadius: 30,
    transition,
  },

  '.demo-workbench-search-icon[data-state="search"]::before': {
    left: 3,
    top: 3,
    width: 13,
    height: 13,
    border: `2px solid ${colors.indigo400}`,
  },

  '.demo-workbench-search-icon[data-state="search"]::after': {
    left: 15,
    top: 12,
    width: 3,
    height: 10,
    background: colors.indigo400,
    transform: "rotate(-45deg)",
  },

  '.demo-workbench-search-icon[data-state="focus"]::before, .demo-workbench-search-icon[data-state="clear"]::before':
    {
      left: "50%",
      top: 5,
      width: 3,
      height: 15,
      transform: "translateX(-50%) rotate(45deg)",
    },

  '.demo-workbench-search-icon[data-state="focus"]::after, .demo-workbench-search-icon[data-state="clear"]::after':
    {
      left: "50%",
      top: 5,
      width: 3,
      height: 15,
      transform: "translateX(-50%) rotate(-45deg)",
    },

  '.demo-workbench-search-icon[data-state="focus"]::before, .demo-workbench-search-icon[data-state="focus"]::after':
    {
      background: colors.indigo400,
    },

  '.demo-workbench-search-icon[data-state="clear"]::before, .demo-workbench-search-icon[data-state="clear"]::after':
    {
      background: colors.red500,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-search-icon':
    {
      filter: "drop-shadow(0.5px 0.5px 0.5px #0b1126)",
    },

  ".demo-workbench-theme-toggle": {
    position: "absolute",
    right: 10,
    top: "50%",
    width: 62,
    height: 32,
    cursor: "pointer",
    borderRadius: 24,
    background: colors.indigo300,
    boxShadow: shadows.lightInput,
    transform: "translateY(-50%)",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-theme-toggle':
    {
      background: colors.indigo500,
      boxShadow: shadows.darkInput,
    },

  ".demo-workbench-theme-toggle-knob": {
    position: "absolute",
    left: 3,
    top: 3,
    width: 26,
    height: 26,
    cursor: "pointer",
    borderRadius: 24,
    background: colors.indigo200,
    boxShadow: shadows.lightButton,
    transition,
  },

  '.demo-workbench-theme-toggle[data-active="true"] .demo-workbench-theme-toggle-knob':
    {
      left: 32,
    },

  ".demo-workbench-theme-toggle-knob:hover": {
    filter: "brightness(1.05)",
  },

  ".demo-workbench-theme-toggle-knob:active": {
    scale: 0.9,
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-theme-toggle-knob':
    {
      background: colors.indigo900,
      boxShadow: shadows.darkButton,
    },

  ".demo-workbench-theme-toggle-icon": {
    position: "absolute",
    left: 0.5,
    top: 0.5,
    display: "flex",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    border: "6px solid transparent",
    borderRadius: 24,
    boxShadow: shadows.sun,
    filter: "drop-shadow(0.5px 0.5px 0.5px rgba(255, 255, 255, 1))",
    scale: 0.9,
    transition,
  },

  '.demo-workbench-theme-toggle[data-active="true"] .demo-workbench-theme-toggle-icon':
    {
      borderWidth: 4,
      boxShadow: shadows.moon,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-theme-toggle-icon':
    {
      filter: "drop-shadow(0.5px 0.5px 0.5px #0b1126)",
    },

  ".demo-workbench-theme-toggle-line": {
    position: "absolute",
    display: "flex",
    width: 24,
    height: 2,
    alignItems: "center",
    justifyContent: "center",
    borderLeft: `4px solid ${colors.indigo400}`,
    borderRight: `4px solid ${colors.indigo400}`,
    transition,
  },

  ".demo-workbench-theme-toggle-line::before": {
    content: '""',
    width: 24,
    height: 2,
    borderLeft: `4px solid ${colors.indigo400}`,
    borderRight: `4px solid ${colors.indigo400}`,
    transform: "rotate(45deg)",
  },

  ".demo-workbench-theme-toggle-line-y": {
    transform: "rotate(90deg)",
  },

  '.demo-workbench-theme-toggle[data-active="true"] .demo-workbench-theme-toggle-line':
    {
      opacity: 0,
    },

  ".demo-workbench-grid-shell": {
    position: "relative",
    width: "100%",
    height: "calc(100vh - 112px)",
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
    transform: "translateX(-40px)",
  },

  ".demo-workbench-card, .demo-workbench-scroll-progress, .demo-workbench-not-found-card":
    {
      animation: "demo-workbench-ident 0.2s ease-in-out 1 forwards",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: 18,
      background: colors.indigo100,
      boxShadow: shadows.card,
      color: colors.indigo500,
      transition,
    },

  ".demo-workbench-card:hover, .demo-workbench-scroll-progress:hover, .demo-workbench-not-found-card:hover":
    {
      background: colors.indigo50,
      boxShadow: shadows.cardHover,
    },

  ".demo-workbench-card:active, .demo-workbench-scroll-progress:active, .demo-workbench-not-found-card:active":
    {
      scale: 0.95,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-card, .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-scroll-progress, .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-not-found-card':
    {
      background: colors.indigo900,
      boxShadow: shadows.cardDark,
      color: colors.indigo400,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-card:hover, .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-scroll-progress:hover, .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-not-found-card:hover':
    {
      background: colors.indigo800,
      boxShadow: shadows.cardDarkHover,
    },

  ".demo-workbench-card": {
    position: "relative",
    display: "flex",
    width: 238,
    height: 156,
  },

  '.demo-workbench-card[data-open="true"]': {
    boxShadow: `${shadows.card}, 0 0 0 2px ${colors.indigo500}, 0 0 0 4px ${colors.indigo100}`,
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-card[data-open="true"]':
    {
      boxShadow: `${shadows.cardDark}, 0 0 0 2px ${colors.indigo500}, 0 0 0 4px ${colors.blueGray950}`,
    },

  ".demo-workbench-load-fill": {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: 120,
    overflow: "hidden",
    borderRadius: 16,
    background: "rgba(224, 231, 255, 0.7)",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-load-fill':
    {
      background: "rgba(15, 23, 42, 0.7)",
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

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-page-cell':
    {
      background: colors.blueGray950,
    },

  ".demo-workbench-preview-frame": {
    position: "absolute",
    width: 1200,
    height: 640,
    overflow: "hidden",
    borderRadius: 50,
    background: "#fff",
    boxShadow: shadows.preview,
    pointerEvents: "none",
    transform: "translateY(10px) scale(0.180134)",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-preview-frame':
    {
      boxShadow: shadows.previewDark,
    },

  ".demo-workbench-card-fallback": {
    width: "100%",
    height: "100%",
    background: "rgba(224, 231, 255, 0.7)",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-card-fallback':
    {
      background: "rgba(15, 23, 42, 0.7)",
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
    fontSize: "0.75rem",
    fontWeight: 700,
    lineHeight: "1.75rem",
    textAlign: "center",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-card-link':
    {
      textShadow: "0.5px 0.5px 1px rgba(0, 0, 0, 0.8)",
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
    boxShadow: shadows.preview,
    scale: 0.180134,
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-page-overlay[data-expanded="false"]':
    {
      boxShadow: shadows.previewDark,
    },

  ".demo-workbench-scroll-progress": {
    position: "relative",
    display: "flex",
    width: 12,
    height: "100%",
  },

  ".demo-workbench-not-found-card": {
    position: "absolute",
    left: "calc(50% - 119px)",
    top: "calc(50% - 77px)",
    display: "flex",
    width: 238,
    height: 156,
    transform: "rotate(6deg)",
    transition: "none",
  },

  ".demo-workbench-not-found-label": {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    padding: "0 25px",
    fontSize: "0.75rem",
    fontWeight: 700,
    lineHeight: "1.75rem",
    textAlign: "center",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-not-found-label':
    {
      textShadow: "0.5px 0.5px 1px rgba(255, 255, 255, 0.2)",
    },

  ".demo-workbench-empty": {
    position: "absolute",
    left: "50%",
    top: "50%",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    borderRadius: 16,
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: shadows.card,
    color: colors.zinc500,
    padding: "28px 32px",
    pointerEvents: "none",
    textAlign: "center",
    transform: "translate(-50%, -50%)",
    backdropFilter: "blur(8px)",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-empty':
    {
      background: "rgba(2, 6, 23, 0.8)",
      color: colors.zinc300,
    },

  ".demo-workbench-empty-title": {
    color: colors.indigo500,
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: "1.25rem",
    textTransform: "uppercase",
  },

  ".demo-workbench-empty-body": {
    color: colors.zinc800,
    fontSize: "1.125rem",
    fontWeight: 500,
    lineHeight: "1.75rem",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-empty-body':
    {
      color: colors.zinc100,
    },

  ".demo-workbench-page-close, .demo-workbench-to-top": {
    position: "absolute",
    bottom: 30,
    zIndex: 20,
    width: 40,
    height: 40,
    cursor: "pointer",
    borderRadius: 24,
    background: colors.indigo200,
    boxShadow: shadows.floatingButton,
    filter: "brightness(1.05)",
    transition,
  },

  ".demo-workbench-page-close:hover, .demo-workbench-to-top:hover": {
    filter: "brightness(1.1)",
  },

  ".demo-workbench-page-close:active, .demo-workbench-to-top:active": {
    scale: 0.9,
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-page-close, .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-to-top':
    {
      background: colors.indigo900,
      boxShadow: shadows.darkButton,
    },

  ".demo-workbench-page-close": {
    left: "50%",
    zIndex: 40,
    transform: "translateX(-50%)",
  },

  ".demo-workbench-to-top": {
    right: 30,
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
    filter: "drop-shadow(0.5px 0.5px 0.5px rgba(255, 255, 255, 1))",
  },

  ".demo-workbench-page-close-icon::before, .demo-workbench-page-close-icon::after":
    {
      content: '""',
      position: "absolute",
      left: "50%",
      top: "50%",
      width: 3,
      height: 24,
      borderRadius: 30,
      background: colors.indigo400,
      transform: "translate(-50%, -50%) rotate(45deg)",
      transition,
    },

  ".demo-workbench-page-close-icon::after": {
    transform: "translate(-50%, -50%) rotate(-45deg)",
  },

  ".demo-workbench-page-close:hover .demo-workbench-page-close-icon::before, .demo-workbench-page-close:hover .demo-workbench-page-close-icon::after":
    {
      background: colors.red500,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-page-close-icon':
    {
      filter: "drop-shadow(0.5px 0.5px 0.5px #0b1126)",
    },

  ".demo-workbench-to-top-icon": {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 26,
    height: 26,
    filter: "drop-shadow(0.5px 0.5px 0.5px rgba(255, 255, 255, 1))",
    transform: "translate(-50%, -50%)",
  },

  ".demo-workbench-to-top-icon::before, .demo-workbench-to-top-icon::after": {
    content: '""',
    position: "absolute",
    top: 10,
    width: 16,
    height: 3,
    borderRadius: 2,
    background: colors.indigo400,
  },

  ".demo-workbench-to-top-icon::before": {
    left: 0,
    transform: "rotate(-45deg)",
  },

  ".demo-workbench-to-top-icon::after": {
    right: 0,
    transform: "rotate(45deg)",
  },

  ".demo-workbench-tooltip-target": {
    width: "100%",
    height: "100%",
  },

  ".demo-workbench-tooltip": {
    "--tooltip-x": "0",
    "--tooltip-y": "0",
    "--tooltip-margin-x": "0px",
    "--tooltip-margin-y": "0px",
    position: "absolute",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    borderRadius: 10,
    background: colors.indigo100,
    boxShadow: shadows.tooltip,
    color: colors.indigo600,
    filter: "drop-shadow(0 1px 3px rgba(4, 3, 52, 0.6))",
    fontSize: "0.875rem",
    fontWeight: 700,
    lineHeight: "1.25rem",
    marginLeft: "var(--tooltip-margin-x)",
    marginTop: "var(--tooltip-margin-y)",
    opacity: 0,
    padding: "10px 14px",
    pointerEvents: "none",
    scale: 0.9,
    textShadow: "0.5px 0.5px 1px rgba(255, 255, 255, 0.6)",
    transition,
    translate: "var(--tooltip-x) var(--tooltip-y)",
  },

  ".demo-workbench-tooltip::after": {
    content: '""',
    position: "absolute",
    width: 0,
    height: 0,
    borderLeft: "8px solid transparent",
    borderRight: "8px solid transparent",
  },

  '.demo-workbench-tooltip[data-visible="true"]': {
    opacity: 1,
    scale: 1,
  },

  '.demo-workbench-tooltip[data-placement="top"]': {
    "--tooltip-y": "-100%",
    "--tooltip-margin-y": "-10px",
  },

  '.demo-workbench-tooltip[data-placement="top"]::after': {
    bottom: -7,
    borderTop: `8px solid ${colors.indigo200}`,
  },

  '.demo-workbench-tooltip[data-placement="bottom"]': {
    "--tooltip-margin-y": "10px",
  },

  '.demo-workbench-tooltip[data-placement="bottom"]::after': {
    top: -7,
    borderBottom: `8px solid ${colors.indigo50}`,
  },

  '.demo-workbench-tooltip[data-placement="side-left"]': {
    "--tooltip-y": "-50%",
    "--tooltip-margin-x": "10px",
  },

  '.demo-workbench-tooltip[data-placement="side-left"]::after': {
    left: -11,
    top: "50%",
    borderTop: `8px solid ${colors.indigo50}`,
    transform: "translateY(-50%) rotate(90deg)",
  },

  '.demo-workbench-tooltip[data-placement="side-right"]': {
    "--tooltip-x": "-100%",
    "--tooltip-y": "-50%",
    "--tooltip-margin-x": "-10px",
  },

  '.demo-workbench-tooltip[data-placement="side-right"]::after': {
    right: -11,
    top: "50%",
    borderBottom: `8px solid ${colors.indigo200}`,
    transform: "translateY(-50%) rotate(90deg)",
  },

  '.demo-workbench-tooltip[data-align="center"]': {
    "--tooltip-x": "-50%",
  },

  '.demo-workbench-tooltip[data-align="center"]::after': {
    left: "50%",
    transform: "translateX(-50%)",
  },

  '.demo-workbench-tooltip[data-align="left"]': {
    "--tooltip-margin-x": "-16px",
  },

  '.demo-workbench-tooltip[data-align="left"]::after': {
    left: 16,
  },

  '.demo-workbench-tooltip[data-align="right"]': {
    "--tooltip-x": "-100%",
    "--tooltip-margin-x": "16px",
  },

  '.demo-workbench-tooltip[data-align="right"]::after': {
    right: 16,
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-tooltip':
    {
      background: colors.indigo800,
      boxShadow: shadows.tooltipDark,
      color: colors.indigo400,
      textShadow: "0.5px 0.5px 1px rgba(0, 0, 0, 0.8)",
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-tooltip[data-placement="top"]::after':
    {
      borderTopColor: colors.indigo900,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-tooltip[data-placement="bottom"]::after':
    {
      borderBottomColor: colors.indigo600,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-tooltip[data-placement="side-left"]::after':
    {
      borderTopColor: colors.indigo700,
    },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-tooltip[data-placement="side-right"]::after':
    {
      borderBottomColor: colors.indigo900,
    },

  ".demo-workbench-tooltip-icon": {
    display: "inline-block",
    width: 14,
    marginRight: 6,
    fill: colors.indigo500,
    filter: "drop-shadow(0.5px 0.5px 0.5px rgba(255, 255, 255, 1))",
  },

  '.demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-tooltip-icon':
    {
      fill: colors.indigo400,
      filter: "drop-shadow(0.5px 0.5px 0.5px #0b1126)",
    },
};

export default workbenchStyles;
