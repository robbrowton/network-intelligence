import { useState, useCallback, useRef, useEffect } from "react";
import JSZip from "jszip";

// ─── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #050508;
    --surface: #0d0d14;
    --border: #1a1a28;
    --border-bright: #2a2a40;
    --text: #e2ddd6;
    --muted: #6b6580;
    --faint: #2a2535;
    --silver: #e0e0e0;
    --silver-dim: #8a8a9a;
    --silver-glow: rgba(224,224,224,0.12);
    --xblue: #1d9bf0;
    --xblue-dim: #0d5a8a;
    --xblue-glow: rgba(29,155,240,0.15);
    --teal: #3dd6c8;
    --teal-dim: #1a7a72;
    --rose: #e86060;
    --green: #5dd68a;
    --amber: #e8a840;
    --cream: #f5f0e8;
    --cream-surface: #ede6d8;
    --cream-border: #d5cdb8;
    --cream-text: #1a1a1a;
    --cream-muted: #6b6560;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Space Mono', monospace; overflow-x: hidden; }
  ::selection { background: var(--xblue-glow); }
  .serif { font-family: 'Playfair Display', Georgia, serif; }

  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 9999; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.4;
  }

  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px var(--silver-glow); } 50% { box-shadow: 0 0 40px rgba(224,224,224,0.25); } }
  @keyframes drawIn { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
  @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes barGrowH { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes floatIn { from { opacity: 0; transform: translateY(20px) scale(0.8); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  .animate-fade-up   { animation: fadeUp 0.7s ease forwards; }
  .animate-fade-up-1 { animation: fadeUp 0.7s 0.1s ease forwards; opacity:0; }
  .animate-fade-up-2 { animation: fadeUp 0.7s 0.2s ease forwards; opacity:0; }
  .animate-fade-up-3 { animation: fadeUp 0.7s 0.3s ease forwards; opacity:0; }
  .animate-fade-up-4 { animation: fadeUp 0.7s 0.4s ease forwards; opacity:0; }
  .animate-fade-up-5 { animation: fadeUp 0.7s 0.5s ease forwards; opacity:0; }
  .animate-fade-up-6 { animation: fadeUp 0.7s 0.6s ease forwards; opacity:0; }
  .animate-fade-up-7 { animation: fadeUp 0.7s 0.7s ease forwards; opacity:0; }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 1px; position: relative; overflow: hidden; }
  .card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--silver-dim),transparent); }

  .drop-zone { border: 1px dashed var(--border-bright); cursor: pointer; transition: all 0.3s; }
  .drop-zone:hover, .drop-zone.over { border-color: var(--silver); background: var(--silver-glow); }
  .drop-zone:hover .upload-icon { transform: translateY(-4px); color: var(--silver); }
  .upload-icon { transition: all 0.3s; color: var(--muted); }

  .btn-primary { background: var(--silver); color: var(--bg); border: none; padding: 14px 40px; font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; }
  .btn-primary:hover { background: #ffffff; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(224,224,224,0.3); }

  .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border-bright); padding: 10px 24px; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s; }
  .btn-ghost:hover { border-color: var(--xblue); color: var(--xblue); }

  .btn-demo { background: transparent; color: var(--xblue); border: 1px solid var(--xblue-dim); padding: 14px 40px; font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s; margin-top: 16px; }
  .btn-demo:hover { background: var(--xblue-glow); border-color: var(--xblue); transform: translateY(-1px); }

  .chapter { position: relative; padding: 100px 0; }
  .chapter-dark { background: var(--bg); color: var(--text); }
  .chapter-light { background: var(--cream); color: var(--cream-text); --text: var(--cream-text); --muted: var(--cream-muted); --faint: var(--cream-border); }
  .chapter-light .card { background: var(--cream-surface); border-color: var(--cream-border); }
  .chapter-light .card::before { background: linear-gradient(90deg,transparent,var(--silver-dim),transparent); }

  .chapter-opener { min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px 24px; }
  .chapter-divider { width: 60px; height: 1px; background: var(--silver); margin: 0 auto; }

  .scroll-reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.8s ease, transform 0.8s ease; }
  .scroll-reveal.visible { opacity: 1; transform: translateY(0); }
  .scroll-reveal-delay-1 { transition-delay: 0.1s; }
  .scroll-reveal-delay-2 { transition-delay: 0.2s; }
  .scroll-reveal-delay-3 { transition-delay: 0.3s; }
  .scroll-reveal-delay-4 { transition-delay: 0.4s; }

  .hex-score { filter: drop-shadow(0 0 24px rgba(224,224,224,0.3)); }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-bright); }
`;

// ─── Scroll reveal hook ──────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    el.querySelectorAll(".scroll-reveal").forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

function CountUp({ value, suffix = "", duration = 1500 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef();
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const num = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
        const startTime = performance.now();
        const step = (now) => {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(num * eased));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);
  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

// ─── Twitter date parser ──────────────────────────────────────────────────────
function parseTwitterDate(str) {
  if (!str) return null;
  // Format: "Wed Oct 15 14:30:00 +0000 2025"
  const d = new Date(str);
  if (!isNaN(d)) return d;
  // Manual parse
  const m = str.match(/\w+ (\w+) (\d+) (\d+):(\d+):(\d+) \+\d+ (\d+)/);
  if (m) {
    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    return new Date(parseInt(m[6]), months[m[1]]||0, parseInt(m[2]), parseInt(m[3]), parseInt(m[4]), parseInt(m[5]));
  }
  return null;
}

// ─── Parse Twitter .js files ──────────────────────────────────────────────────
function parseTwitterJS(text) {
  const cleaned = text.replace(/^window\.YTD\.\w+\.part\d+\s*=\s*/, "");
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Failed to parse Twitter JS file:", e.message);
    return [];
  }
}

// ─── Extract source from HTML anchor ──────────────────────────────────────────
function extractSource(html) {
  if (!html) return "Unknown";
  const m = html.match(/>([^<]+)</);
  if (m) {
    const s = m[1].toLowerCase();
    if (s.includes("iphone")) return "iPhone";
    if (s.includes("android")) return "Android";
    if (s.includes("web")) return "Web";
    if (s.includes("tweetdeck") || s.includes("deck")) return "TweetDeck";
    if (s.includes("ipad")) return "iPad";
    if (s.includes("mac")) return "Mac";
    return m[1];
  }
  return "Unknown";
}
