/**
 * Rota las sugerencias del Google Sheet cada 8s con un fade suave.
 * Puramente cosmético — no toca el mapa ni el iframe de Mexy.
 */
(function () {
  const list = Array.isArray(window.__LM_SUGGESTIONS__) ? window.__LM_SUGGESTIONS__ : [];
  const el = document.getElementById('lm-suggestion-text');

  if (!el || list.length <= 1) return;

  let i = 0;
  el.style.transition = 'opacity 0.4s ease';

  setInterval(() => {
    i = (i + 1) % list.length;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = list[i];
      el.style.opacity = '1';
    }, 400);
  }, 8000);
})();
