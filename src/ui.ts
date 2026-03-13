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
};

export const globalCss = `
  :root{ color-scheme: dark; }
  *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html,body,#root{ height:100%; margin:0; background:${T.bg}; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
  @keyframes pop { 0%{ transform: scale(0.98);} 100%{ transform: scale(1);} }

  .container{ max-width: 860px; margin: 0 auto; padding: 22px; }
  .card{ background:${T.card}; border:1px solid ${T.borderSoft}; border-radius: 18px; box-shadow:${T.shadow}; }
  .btn{ border-radius: 14px; padding: 12px 16px; font-weight: 800; cursor:pointer; border:1px solid ${T.borderSoft}; background: transparent; color:${T.txt}; }
  .btnPrimary{ border: none; background: linear-gradient(135deg, ${T.gold}, ${T.teal}); color: ${T.bg}; }
  .btnGhost{ background: transparent; }
  .input{ width: 100%; padding: 12px 14px; border-radius: 14px; border: 1px solid ${T.borderSoft}; background: rgba(255,255,255,0.03); color:${T.txt}; }
  .muted{ color:${T.dim}; }
  .row{ display:flex; gap: 10px; align-items:center; }
  .wrap{ flex-wrap: wrap; }
  .spacer{ flex:1; }
  .fadeUp{ animation: fadeUp 200ms ease both; }
  .pill{ border-radius: 999px; padding: 8px 12px; border: 1px solid ${T.borderSoft}; }
`;
