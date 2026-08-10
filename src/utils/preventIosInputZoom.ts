import { Platform } from 'react-native';

const STYLE_ID = 'poidh-prevent-ios-input-zoom';

/**
 * iOS Safari zooms the page when focusing inputs under ~16px.
 * RN-web styles are not always enough, so also lock viewport scale and
 * force native form controls to 16px.
 */
export function preventIosInputZoom() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
    );
  }

  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    input, textarea, select {
      font-size: 16px !important;
    }
  `;
  document.head.appendChild(style);
}
