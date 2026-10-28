// Motion layer: Lenis smooth scroll, the torn-sheet page transition, the landing intro,
// pointer micro-interactions and haptics. Scroll-linked motion itself is pure CSS (motion.css).
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Haptics: Android only (iOS Safari has no Vibration API), coarse pointers only.
export const buzz = (ms: number | number[] = 8) => {
  if (!fine && 'vibrate' in navigator) navigator.vibrate(ms);
};
(window as any).fsBuzz = buzz;

// ---------- Smooth scroll ----------
let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.095, wheelMultiplier: 0.95, autoRaf: true, anchors: { offset: -72 } });
  (window as any).lenis = lenis;
  // Pause while any modal is open so the page behind stays still.
  const sync = () => (document.querySelector('dialog[open]') ? lenis!.stop() : lenis!.start());
  new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
}

// ---------- Page transition: two torn halves close, the next page rips them apart ----------
const curtain = document.querySelector<HTMLElement>('.curtain')!;
type Seam = number[];
const makeSeam = (): Seam => {
  const xs: number[] = [];
  let x = 50;
  for (let i = 0; i <= 16; i++) { x = Math.max(44, Math.min(56, x + (Math.random() - 0.5) * 5)); xs.push(+x.toFixed(2)); }
  return xs;
};
const poly = (xs: Seam, side: 'l' | 'r', shift = 0) => {
  const pts = xs.map((x, i) => `${(x + shift).toFixed(2)}% ${((i / (xs.length - 1)) * 100).toFixed(1)}%`);
  return side === 'l' ? `polygon(0 0, ${pts.join(', ')}, 0 100%)` : `polygon(100% 0, ${pts.join(', ')}, 100% 100%)`;
};
const dress = (seam: Seam, dest: string) => {
  curtain.querySelectorAll<HTMLElement>('.dest').forEach((d) => (d.textContent = dest));
  curtain.querySelector<HTMLElement>('.l .face')!.style.clipPath = poly(seam, 'l');
  curtain.querySelector<HTMLElement>('.l .fiber')!.style.clipPath = poly(seam, 'l', 0.7);
  curtain.querySelector<HTMLElement>('.r .face')!.style.clipPath = poly(seam, 'r');
  curtain.querySelector<HTMLElement>('.r .fiber')!.style.clipPath = poly(seam, 'r', -0.7);
};
const destFor = (a: HTMLAnchorElement) => {
  const t = a.dataset.dest || a.querySelector('.nm, .t, .menu-link, b, strong')?.textContent || a.getAttribute('aria-label') || a.textContent || '';
  const clean = t.replace(/\s+/g, ' ').trim();
  return clean.length > 26 ? clean.slice(0, 24) + '…' : clean || 'Founder Studio';
};

let leaving = false;
document.addEventListener('click', (e) => {
  if (reduce || leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) return;
  if (a.pathname === location.pathname) return; // same page (incl. #anchors): let Lenis handle it
  e.preventDefault();
  leaving = true;
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => d.close());
  const seam = makeSeam();
  const dest = destFor(a);
  dress(seam, dest);
  try { sessionStorage.setItem('fs-curtain', JSON.stringify({ seam, dest })); } catch {}
  lenis?.stop();
  buzz(10);
  root.classList.add('curtain-close');
  const go = () => (location.href = a.href);
  curtain.querySelector('.r')!.addEventListener('animationend', go, { once: true });
  setTimeout(go, 700); // safety net if animationend never fires
});

// Arrival: the head script already showed the curtain closed (html.curtain-in); rip it open.
const arrived = (window as any).__curtain as { seam: Seam; dest: string } | undefined;
const reveal = () => {
  root.classList.add('revealed');
  window.dispatchEvent(new Event('fs:revealed'));
};
if (arrived && root.classList.contains('curtain-in')) {
  dress(arrived.seam, arrived.dest);
  requestAnimationFrame(() => {
    root.classList.add('curtain-open');
    buzz([6, 40, 12]);
    setTimeout(reveal, 260);
    curtain.querySelector('.r')!.addEventListener('animationend', () => root.classList.remove('curtain-in', 'curtain-open'), { once: true });
    setTimeout(() => root.classList.remove('curtain-in', 'curtain-open'), 1200);
  });
} else {
  reveal();
}
// Back/forward cache restores the old page with the curtain shut: reset it.
addEventListener('pageshow', (e) => {
  if (e.persisted) { root.classList.remove('curtain-close', 'curtain-in', 'curtain-open'); leaving = false; lenis?.start(); }
});

// ---------- Landing intro (home only): runs once per visit, quick afterwards ----------
if (root.classList.contains('intro')) {
  const run = () => root.classList.add('intro-run');
  if (root.classList.contains('revealed')) run(); else addEventListener('fs:revealed', run, { once: true });
}

// ---------- Pointer micro-interactions (desktop only) ----------
if (fine && !reduce) {
  // Cursor follower with context labels
  const cur = document.querySelector<HTMLElement>('.cursor')!;
  const label = cur.querySelector<HTMLElement>('span')!;
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; root.classList.add('cursor-on'); }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.remove('cursor-on'));
  const loop = () => {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
  const labelFor = (el: Element) => {
    if (el.closest('[data-cursor]')) return (el.closest('[data-cursor]') as HTMLElement).dataset.cursor!;
    if (el.closest('[data-add]')) return 'Add';
    if (el.closest('[data-copy], [data-md-copy]')) return 'Copy';
    const a = el.closest('a');
    if (a) return a.target === '_blank' ? 'Visit' : 'Open';
    if (el.closest('button, label, [role="option"]')) return 'Press';
    return '';
  };
  document.addEventListener('pointerover', (e) => {
    const l = labelFor(e.target as Element);
    label.textContent = l;
    cur.classList.toggle('active', !!l);
  });

  // Magnetic buttons
  document.querySelectorAll<HTMLElement>('[data-magnetic], .btn.blue, .btn.solid').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 10}px ${((e.clientY - r.top) / r.height - 0.5) * 8}px`;
    });
    b.addEventListener('pointerleave', () => (b.style.translate = ''));
  });

  // 3D tilt on covers
  document.querySelectorAll<HTMLElement>('.card').forEach((c) => {
    const cover = c.querySelector<HTMLElement>('.cover');
    if (!cover) return;
    c.addEventListener('pointermove', (e) => {
      const r = cover.getBoundingClientRect();
      cover.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
      cover.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
    });
    c.addEventListener('pointerleave', () => { cover.style.removeProperty('--rx'); cover.style.removeProperty('--ry'); });
  });
}

// ---------- Feedback hooks used by the layout script ----------
export const pop = (el: Element | null, cls: string) => {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth; // restart the animation
  el.classList.add(cls);
};
(window as any).fsPop = pop;
