const FALLBACK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#eef3f8"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="16" fill="url(#bg)"/>
  <circle cx="80" cy="78" r="38" fill="#ffffff" opacity=".72"/>
  <rect x="51" y="53" width="58" height="44" rx="8" fill="none" stroke="#b8c4d3" stroke-width="4"/>
  <circle cx="69" cy="68" r="6" fill="#b8c4d3"/>
  <path d="M57 89l17-16 13 12 8-7 9 10" fill="none" stroke="#b8c4d3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const GLOBAL_IMAGE_FALLBACK_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(FALLBACK_SVG)}`;

export function handleNativeImageError(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.dataset.imageFallbackApplied === 'true') return;

  target.dataset.imageFallbackApplied = 'true';
  target.classList.add('app-native-image-fallback');
  target.src = GLOBAL_IMAGE_FALLBACK_SRC;
}

export function installGlobalImageFallback() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', handleNativeImageError, true);
}
