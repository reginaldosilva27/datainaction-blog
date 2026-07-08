// Editor inline WYSIWYG — SÓ roda em `astro dev` (o script é injetado apenas
// quando import.meta.env.DEV no [slug].astro). Não vai pra produção.
//
// Clica em "Editar", o corpo do post vira editável na própria página. NÃO salva
// sozinho (auto-save fazia o Astro recarregar e piscava a edição). Você salva
// clicando em "Salvar" (ou Cmd/Ctrl+S): serializa o HTML, REVERTE as transformações
// do processBody() (imagens, code blocks, facade do YouTube) e faz POST /__edit ->
// o dev-server grava no JSON. Config vem em window.__INLINE_EDIT.

(function () {
  const cfg = window.__INLINE_EDIT;
  if (!cfg) return;
  const FIELD = { pt: 'html', en: 'html_en' };

  // --- reverte processBody() para voltar ao HTML-fonte do JSON ---
  function toSource(bodyEl) {
    const clone = bodyEl.cloneNode(true);
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    // .codeblock (barra + copiar) -> <pre> puro
    clone.querySelectorAll('.codeblock').forEach((cb) => {
      const pre = cb.querySelector('pre');
      if (pre) cb.replaceWith(pre.cloneNode(true));
      else cb.remove();
    });
    // facade do YouTube -> <p><a href=watch?v=ID>...</a></p> (o build re-gera a facade)
    clone.querySelectorAll('.yt-facade[data-id]').forEach((f) => {
      const id = f.getAttribute('data-id');
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = `https://www.youtube.com/watch?v=${id}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = a.href;
      p.appendChild(a);
      f.replaceWith(p);
    });
    // src="/images/..." (prefixado no build) volta pra relativo "images/..."
    return clone.innerHTML.replaceAll('src="' + cfg.base + 'images/', 'src="images/');
  }

  const visibleBody = () =>
    Array.from(document.querySelectorAll('.post-body')).find((el) => !el.hasAttribute('hidden'));
  const langOf = (el) => el.getAttribute('data-lang') || 'pt';

  // --- UI: botões flutuantes + toast ---
  const bar = document.createElement('div');
  bar.id = 'inline-edit-bar';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'inline-edit-btn';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.id = 'inline-save-btn';
  saveBtn.textContent = '💾 Salvar';
  saveBtn.hidden = true;
  bar.append(saveBtn, btn);
  const toast = document.createElement('div');
  toast.id = 'inline-edit-toast';
  const style = document.createElement('style');
  style.textContent = `
    #inline-edit-bar{position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;gap:8px}
    #inline-edit-bar button{border:0;border-radius:999px;padding:11px 16px;
      font:600 13px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}
    #inline-edit-btn{background:#111;color:#fff}
    #inline-edit-btn.on{background:#e8541e}
    #inline-save-btn{background:#16a34a;color:#fff}
    #inline-save-btn.dirty{animation:inline-pulse 1.2s ease-in-out infinite}
    @keyframes inline-pulse{0%,100%{box-shadow:0 4px 14px rgba(0,0,0,.25)}50%{box-shadow:0 0 0 4px rgba(22,163,74,.35)}}
    #inline-edit-toast{position:fixed;right:18px;bottom:66px;z-index:9999;
      padding:8px 12px;border-radius:8px;font:600 12px/1.2 system-ui,sans-serif;
      color:#fff;opacity:0;transform:translateY(6px);transition:.18s;pointer-events:none}
    #inline-edit-toast.show{opacity:1;transform:none}
    .post-body[contenteditable]{outline:2px dashed #e8541e;outline-offset:8px;border-radius:6px}
    .post-body[contenteditable] :focus{outline:none}
  `;
  document.head.appendChild(style);
  document.body.append(bar, toast);

  let editing = false;
  let dirty = false;

  function flash(msg, ok) {
    toast.textContent = msg;
    toast.style.background = ok ? '#16a34a' : '#dc2626';
    toast.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => toast.classList.remove('show'), 1400);
  }

  async function save() {
    const bodyEl = visibleBody();
    if (!bodyEl) return;
    const field = FIELD[langOf(bodyEl)] || 'html';
    if (field === 'html_en' && !cfg.hasEn) return;
    try {
      const r = await fetch('/__edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: cfg.slug, field, html: toSource(bodyEl) }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
      setDirty(false);
      flash('salvo ✓ (a página vai recarregar)', true);
      return true;
    } catch (e) {
      flash('erro: ' + e.message, false);
      return false;
    }
  }

  function setDirty(v) {
    dirty = v;
    saveBtn.classList.toggle('dirty', v);
    saveBtn.textContent = v ? '💾 Salvar *' : '💾 Salvar';
  }

  function applyEditable() {
    document.querySelectorAll('.post-body').forEach((el) => el.removeAttribute('contenteditable'));
    if (!editing) return;
    const body = visibleBody();
    if (body) {
      body.setAttribute('contenteditable', 'true');
      body.spellcheck = false;
    }
  }

  function setLabel() {
    btn.textContent = editing ? '✕ Sair' : '✏️ Editar texto';
    btn.classList.toggle('on', editing);
    saveBtn.hidden = !editing;
  }

  btn.addEventListener('click', () => {
    // saindo com alteração não salva? confirma pra não perder
    if (editing && dirty && !window.confirm('Você tem alterações não salvas. Sair sem salvar?')) return;
    editing = !editing;
    setDirty(false);
    setLabel();
    applyEditable();
    if (editing) flash('modo edição — edite e clique em Salvar (ou ⌘/Ctrl+S)', true);
  });

  saveBtn.addEventListener('click', () => save());

  // digitou: só MARCA como não salvo (sem salvar/recarregar). Salvar é manual.
  document.addEventListener('input', (e) => {
    if (!editing) return;
    if (e.target.closest && e.target.closest('.post-body[contenteditable]')) setDirty(true);
  });

  // ⌘/Ctrl+S salva sem sair
  document.addEventListener('keydown', (e) => {
    if (editing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });

  // trocou de idioma no seletor: re-aplica o editável no corpo agora visível
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-set-lang]')) setTimeout(applyEditable, 0);
  });

  setLabel();
})();
