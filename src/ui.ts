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

  // overlay / glass
  overlay: 'rgba(0,0,0,0.15)',
  glassHi: 'rgba(255,255,255,0.04)',
  glassLo: 'rgba(255,255,255,0.02)',
  goldWash: 'rgba(212,165,116,0.10)',
  goldWashHi: 'rgba(212,165,116,0.14)',
  goldBorder: 'rgba(212,165,116,0.28)',

  // shadows
  shadow: '0 18px 60px rgba(0,0,0,0.45)',
  shadowMd: '0 10px 30px rgba(0,0,0,0.25)',
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
    xxs: 4,
    xs: 6,
    xs2: 8,
    sm: 10,
    sm2: 12,
    md: 14,
    md2: 16,
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
      emoji: 28,
    },
    weight: {
      medium: 600,
      bold: 800,
      black: 900,
      ultra: 950,
    },
  },
  motion: {
    // Keep motion short + snappy. Always provide a reduced-motion fallback.
    fadeUp: 200,
    snap: 180,
    commit: 220,
    ease: 'ease',
  },
} as const;

export const R = TOKENS.radius;
export const S = TOKENS.space;
export const F = TOKENS.font;
export const M = TOKENS.motion;

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

    --s-xxs: ${S.xxs}px;
    --s-xs: ${S.xs}px;
    --s-xs2: ${S.xs2}px;
    --s-sm: ${S.sm}px;
    --s-sm2: ${S.sm2}px;
    --s-md: ${S.md}px;
    --s-md2: ${S.md2}px;
    --s-lg: ${S.lg}px;
    --s-xl: ${S.xl}px;
    --s-page: ${S.page}px;

    --m-fadeUp: ${M.fadeUp}ms;
    --m-snap: ${M.snap}ms;
    --m-commit: ${M.commit}ms;
    --m-ease: ${M.ease};

    --font: ${F.system};
  }

  *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html,body,#root{ height:100%; margin:0; background:var(--bg); font-family:var(--font); }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
  @keyframes pop { 0%{ transform: scale(0.98);} 100%{ transform: scale(1);} }

  /* TS5: Swipe badge pulse */
  @keyframes badgePulse {
    0%, 100% { transform: rotate(-14deg) scale(1); }
    50% { transform: rotate(-14deg) scale(1.08); }
  }
  @keyframes badgePulseRight {
    0%, 100% { transform: rotate(14deg) scale(1); }
    50% { transform: rotate(14deg) scale(1.08); }
  }
  @keyframes cardPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.03); }
    100% { transform: scale(1); }
  }

  /* TS4: Fly loading animations */
  @keyframes flyAcross {
    0%   { transform: translateX(-60px) translateY(20px) rotate(-8deg); }
    50%  { transform: translateX(calc(50vw - 24px)) translateY(-30px) rotate(0deg); }
    100% { transform: translateX(calc(100vw + 20px)) translateY(15px) rotate(8deg); }
  }
  @keyframes landmarkPop {
    0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
    20%  { opacity: 1; transform: scale(1) translateY(0); }
    80%  { opacity: 1; transform: scale(1) translateY(0); }
    100% { opacity: 0; transform: scale(0.8) translateY(-5px); }
  }
  @keyframes factFade {
    0%, 100% { opacity: 0; }
    10%, 90%  { opacity: 1; }
  }

  /* TS2: Landing emoji rotation */
  @keyframes emojiRotate {
    0% { opacity: 0; transform: scale(0.7); }
    10% { opacity: 1; transform: scale(1); }
    90% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.7); }
  }

  /* TS1: Toast animation */
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(12px); }
  }

  .container{ max-width: 860px; margin: 0 auto; padding: var(--s-xl); }
  .page{ max-width: 760px; margin: 0 auto; padding: var(--s-page); }
  .card{ background:var(--card); border:1px solid var(--border-soft); border-radius: var(--r-lg); box-shadow:var(--shadow); }

  .btn{ display:inline-flex; align-items:center; justify-content:center; gap: 8px; border-radius: var(--r-md); padding: 12px 16px; font-weight: ${F.weight.bold}; cursor:pointer; border:1px solid var(--border-soft); background: transparent; color:var(--txt); }
  .btnPrimary{ border: none; background: linear-gradient(135deg, ${T.gold}, ${T.teal}); color: var(--bg); }
  .btnGhost{ background: transparent; }

  .input{ width: 100%; padding: 12px 14px; border-radius: var(--r-md); border: 1px solid var(--border-soft); background: rgba(255,255,255,0.03); color:var(--txt); }

  .muted{ color:var(--dim); }
  .row{ display:flex; gap: var(--s-sm); align-items:center; }
  .wrap{ flex-wrap: wrap; }
  .spacer{ flex:1; }
  .fadeUp{ animation: fadeUp var(--m-fadeUp) var(--m-ease) both; }
  .pill{ border-radius: var(--r-pill); padding: 8px 12px; border: 1px solid var(--border-soft); }

  .emptyState{ padding: var(--s-md2); border: 1px dashed var(--border-soft); border-radius: var(--r-lg); background: rgba(255,255,255,0.02); }
  .emptyActions{ display:flex; gap: var(--s-sm); flex-wrap:wrap; margin-top: var(--s-sm2); }

  .notice{ padding: var(--s-sm2); border: 1px solid var(--border-soft); border-radius: var(--r-lg); background: rgba(255,255,255,0.02); }
  .noticeWarn{ border-color: rgba(212,165,116,0.28); background: rgba(212,165,116,0.06); }
  .noticeActions{ display:flex; gap: var(--s-sm); flex-wrap:wrap; margin-top: var(--s-sm); }

  .btnPill{ display:inline-flex; align-items:center; justify-content:center; gap: 8px; border-radius: var(--r-pill); padding: 10px 14px; font-weight: ${F.weight.black}; cursor:pointer; border:1px solid var(--border-soft); background: transparent; color:var(--txt); }
  .btnPillPrimary{ border: none; background: linear-gradient(135deg, ${T.gold}, ${T.teal}); color: var(--bg); }

  /* Text clamp helpers */
  .clamp2{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .clamp3{ display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }

  /* Mobile polish */
  @media (max-width: 520px){
    .container{ padding: var(--s-md2); }
    .page{ padding: var(--s-md2); }

    .btnFull{ width:100%; justify-content:center; }
    .noticeActions .btnPill{ width:100%; }

    /* Slightly tighter empty-state buttons on tiny screens */
    .emptyActions .btnPill{ width:100%; }
  }

  @media (prefers-reduced-motion: reduce){
    *,*::before,*::after{ animation: none !important; transition: none !important; }
    html:focus-within{ scroll-behavior: auto; }
  }
`;
