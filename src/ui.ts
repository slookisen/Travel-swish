export const T = {
  bg: '#0a0d1a',
  card: 'rgba(20,24,42,0.88)',
  gold: '#d4a574',
  teal: '#2dd4bf',
  txt: '#e8e2d8',
  dim: '#7a7b8e',
  red: '#f87171',
  green: '#34d399',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.06)',
  shadow: '0 18px 60px rgba(0,0,0,0.45)',
} as const;

// Lightweight tokens (used by inline styles + globalCss)
export const TOKENS = {
  radius: {
    sm: 10,
    md: 12,
    lg: 18,
    xl: 20,
    pill: 999,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    page: 24,
  },
  font: {
    system: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
    size: {
      sm: 12,
      base: 14,
      md: 16,
      lg: 20,
      hero: 34,
    },
    weight: {
      medium: 600,
      bold: 800,
      black: 900,
      ultra: 950,
    },
  },
} as const;

export const R = TOKENS.radius;
export const S = TOKENS.space;
export const F = TOKENS.font;

export const globalCss = `
  :root{
    color-scheme: dark;

    --bg: ${T.bg};
    --card: ${T.card};
    --txt: ${T.txt};
    --dim: ${T.dim};
    --border: ${T.border};
    --border-soft: ${T.borderSoft};
    --shadow: ${T.shadow};

    --r-sm: ${R.sm}px;
    --r-md: ${R.md}px;
    --r-lg: ${R.lg}px;
    --r-xl: ${R.xl}px;
    --r-pill: ${R.pill}px;

    --s-xs: ${S.xs}px;
    --s-sm: ${S.sm}px;
    --s-md: ${S.md}px;
    --s-lg: ${S.lg}px;
    --s-xl: ${S.xl}px;
    --s-page: ${S.page}px;

    --font: ${F.system};
  }

  *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html,body,#root{ height:100%; margin:0; background:var(--bg); font-family:var(--font); }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
  @keyframes pop { 0%{ transform: scale(0.98);} 100%{ transform: scale(1);} }

  .container{ max-width: 860px; margin: 0 auto; padding: var(--s-xl); }
  .card{ background:var(--card); border:1px solid var(--border-soft); border-radius: var(--r-lg); box-shadow:var(--shadow); }

  .btn{ border-radius: var(--r-md); padding: 12px 16px; font-weight: ${F.weight.bold}; cursor:pointer; border:1px solid var(--border-soft); background: transparent; color:var(--txt); }
  .btnPrimary{ border: none; background: linear-gradient(135deg, ${T.gold}, ${T.teal}); color: var(--bg); }
  .btnGhost{ background: transparent; }

  .input{ width: 100%; padding: 12px 14px; border-radius: var(--r-md); border: 1px solid var(--border-soft); background: rgba(255,255,255,0.03); color:var(--txt); }

  .muted{ color:var(--dim); }
  .row{ display:flex; gap: var(--s-sm); align-items:center; }
  .wrap{ flex-wrap: wrap; }
  .spacer{ flex:1; }
  .fadeUp{ animation: fadeUp 200ms ease both; }
  .pill{ border-radius: var(--r-pill); padding: 8px 12px; border: 1px solid var(--border-soft); }
`;
