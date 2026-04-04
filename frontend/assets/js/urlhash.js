/**
 * urlhash.js — v1.0
 * Persistência de filtros ativos na URL via hash.
 * Ex: #anos=2025,2026&secretarias=FMS,SMIDU&despesas=Combustível
 * Permite bookmarks, compartilhamento e retorno ao mesmo estado.
 */
const UrlHash = (() => {

  const KEYS = ['anos','despesas','tipos','secretarias','classificacoes'];
  let _ignoreNext = false; // evitar loop ao setar hash programaticamente

  // ── Serializar estado → hash string ──────────────────

  function _stringify(filtros) {
    const parts = [];
    KEYS.forEach(k => {
      const vals = filtros[k];
      if (Array.isArray(vals) && vals.length) {
        parts.push(`${k}=${encodeURIComponent(vals.join(','))}`);
      }
    });
    return parts.join('&');
  }

  // ── Parsear hash string → objeto de filtros ───────────

  function _parse(hash) {
    const str    = hash.startsWith('#') ? hash.slice(1) : hash;
    const result = {};
    KEYS.forEach(k => result[k] = []);
    if (!str) return result;
    str.split('&').forEach(part => {
      const [key, val] = part.split('=');
      if (!key || !val) return;
      const k = decodeURIComponent(key).trim();
      if (KEYS.includes(k)) {
        result[k] = decodeURIComponent(val).split(',').map(v=>v.trim()).filter(Boolean);
      }
    });
    return result;
  }

  // ── Atualizar hash na URL com filtros atuais ─────────

  function push() {
    const filtros = State.getFilters();
    const str     = _stringify(filtros);
    _ignoreNext   = true;
    const newHash = str ? '#'+str : location.pathname + location.search;
    if (str) {
      history.replaceState(null, '', '#'+str);
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
    setTimeout(() => { _ignoreNext = false; }, 50);
  }

  // ── Restaurar filtros a partir do hash atual ──────────

  function restore() {
    const hash = location.hash;
    if (!hash || hash === '#') return false;
    const filtros = _parse(hash);
    const temAlgo = KEYS.some(k => filtros[k]?.length > 0);
    if (!temAlgo) return false;
    KEYS.forEach(k => State.setMultiFilter(k, filtros[k]));
    return true;
  }

  // ── Inicializar listeners ─────────────────────────────

  function init() {
    // Quando o usuário navega com back/forward, restaurar filtros
    window.addEventListener('hashchange', () => {
      if (_ignoreNext) return;
      const restored = restore();
      if (restored && typeof Filters !== 'undefined' && typeof App !== 'undefined') {
        Filters.applyFilters();
        App.refresh();
        App.showToast('info', 'Filtros restaurados', 'Estado carregado da URL');
      }
    });
  }

  // ── Gerar URL compartilhável ──────────────────────────

  function copiarLink() {
    push(); // garantir que hash está atual
    const url = location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        App?.showToast('success', 'Link copiado!', 'Cole e compartilhe com qualquer pessoa');
      }).catch(() => _fallbackCopy(url));
    } else {
      _fallbackCopy(url);
    }
  }

  function _fallbackCopy(text) {
    const el = Object.assign(document.createElement('textarea'), { value:text, style:'position:fixed;opacity:0' });
    document.body.appendChild(el); el.select();
    try { document.execCommand('copy'); App?.showToast('success','Link copiado!'); }
    catch { App?.showToast('warn','Não foi possível copiar','Copie manualmente a URL'); }
    document.body.removeChild(el);
  }

  return { init, push, restore, copiarLink };
})();
