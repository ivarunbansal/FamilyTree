/* =====================================================================
   app.js — Family Tree Application Logic
   Data: Google Sheets (CSV, public)
   Updates: Admin edits the Google Sheet directly
   Photos: Any image URL or Google Drive share link
   ===================================================================== */

(function() {
  'use strict';

  const C = window.FT_CONFIG || {};
  let allMembers = [];
  let isAdmin = false;
  let currentMemberId = null;

  // ── INIT ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    applyBranding();
    bindStaticUI();
    loadData();
  });

  function applyBranding() {
    const t = C.SITE_TITLE || 'Family Tree';
    document.title = t;
    const el = document.getElementById('siteTitle');
    if (el) el.textContent = t;
    const h1 = document.getElementById('heroTitle');
    if (h1) h1.innerHTML = formatHeroTitle(C.FAMILY_NAME || t);
    const tag = document.getElementById('heroTagline');
    if (tag) tag.textContent = C.TAGLINE || '';
  }

  function formatHeroTitle(name) {
    // Italicize last word for style
    const parts = name.trim().split(' ');
    if (parts.length < 2) return name;
    const last = parts.pop();
    return parts.join(' ') + ' <em>' + last + '</em>';
  }

  // ── DATA LOADING ─────────────────────────────────────────────────────
  async function loadData() {
    setStatus('loading');
    const loadEl = document.getElementById('loadingState');
    const errEl  = document.getElementById('errorState');
    const treeEl = document.getElementById('treeContainer');
    if (loadEl) loadEl.style.display = 'flex';
    if (errEl)  errEl.setAttribute('hidden', '');
    if (treeEl) treeEl.style.display = 'none';

    // Determine which URL to use
    const primaryUrl  = C.SHEET_CSV_URL  || '';
    const fallbackUrl = C.SHEET_GVIZ_URL || '';
    const usePrimary  = primaryUrl && !primaryUrl.includes('PASTE_PUBLISHED');

    const urlsToTry = usePrimary
      ? [primaryUrl, fallbackUrl].filter(Boolean)
      : [fallbackUrl, primaryUrl].filter(u => u && !u.includes('PASTE_PUBLISHED'));

    if (!urlsToTry.length) {
      setStatus('no-config');
      if (loadEl) loadEl.style.display = 'none';
      if (treeEl) treeEl.style.display = 'block';
      return;
    }

    let lastErr = null;
    for (const url of urlsToTry) {
      try {
        const sep = url.includes('?') ? '&' : '?';
        const resp = await fetch(url + sep + '_t=' + Date.now());
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const csv = await resp.text();
        // gviz wraps values in extra quotes sometimes — normalise
        const cleaned = cleanGvizCSV(csv);
        allMembers = parseCSV(cleaned);
        if (!allMembers.length) { setStatus('empty'); break; }
        // Auto-detect deceased from "Late " prefix
        allMembers.forEach(m => {
          if (/^late\s/i.test(m.name)) {
            m.dod = m.dod || 'deceased';
            m.name = m.name.replace(/^late\s+/i, '');
            m.namePrefix = 'Late';
          }
        });
        setStatus('ok', allMembers.length);
        if (loadEl) loadEl.style.display = 'none';
        if (errEl)  errEl.setAttribute('hidden', '');
        if (treeEl) treeEl.style.display = 'block';
        renderAll();
        return;
      } catch(e) {
        lastErr = e;
        console.warn('URL failed, trying next:', url, e.message);
      }
    }

    // All URLs failed
    console.error(lastErr);
    setStatus('error', 0, lastErr?.message);
    if (loadEl) loadEl.style.display = 'none';
    if (errEl)  errEl.removeAttribute('hidden');
    const em = document.getElementById('errorMessage');
    if (em) em.textContent = 'Could not load sheet. Make sure it is shared as "Anyone with the link can view". Error: ' + (lastErr?.message || '');
  }

  // gviz CSV sometimes wraps everything in extra outer quotes — strip them
  function cleanGvizCSV(text) {
    return text.split(/\r?\n/).map(line => {
      // gviz wraps cell values in extra quotes like "","value","" - this is standard CSV, our parser handles it
      return line;
    }).join('\n');
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());
    const col = C.COLUMNS || {};
    // Build column index map
    const idx = {};
    Object.entries(col).forEach(([key, headerName]) => {
      const i = headers.indexOf(headerName.toLowerCase());
      if (i >= 0) idx[key] = i;
    });
    const members = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = parseCSVRow(lines[i]);
      const m = {};
      Object.keys(idx).forEach(k => {
        m[k] = (vals[idx[k]] || '').trim();
      });
      if (!m.id || !m.name) continue;
      members.push(m);
    }
    return members;
  }

  function parseCSVRow(row) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { result.push(cur); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur);
    return result;
  }

  function setStatus(state, count, msg) {
    const el = document.getElementById('syncStatus');
    const dot = document.querySelector('.status-dot');
    if (!el) return;
    const states = {
      loading: ['⟳ Loading family data…', 'orange'],
      ok: [`${count} members loaded`, 'green'],
      error: [`Error: ${msg || 'Could not load sheet'}`, 'red'],
      'no-config': ['Set your Google Sheet URL in config.js', 'orange'],
      empty: ['Sheet is empty — add members!', 'orange'],
    };
    const [text, color] = states[state] || [state, 'gray'];
    el.textContent = text;
    if (dot) dot.style.background = { green:'#22c55e', red:'#ef4444', orange:'#f59e0b', gray:'#94a3b8' }[color] || color;
  }

  // ── RENDER ALL ───────────────────────────────────────────────────────
  function renderAll() {
    updateStats();
    renderTree();
    renderTimeline();
    renderGallery();
    populateSelects();
  }

  function updateStats() {
    const cities = new Set(allMembers.map(m => m.city).filter(Boolean));
    const surnames = new Set(allMembers.map(m => (m.name||'').split(' ').pop()).filter(Boolean));
    const gens = new Set(allMembers.map(m => m.generation).filter(Boolean));
    setText('totalMembers', allMembers.length);
    setText('totalGenerations', gens.size || calcGenerations());
    setText('totalCities', cities.size);
    setText('totalSurnames', surnames.size);
  }

  function calcGenerations() {
    // BFS depth
    const byId = {};
    allMembers.forEach(m => byId[m.id] = m);
    let max = 0;
    allMembers.forEach(m => {
      let d = 0, cur = m;
      while (cur && d < 20) {
        const pid = cur.fatherId || cur.motherId;
        cur = pid ? byId[pid] : null;
        d++;
      }
      if (d > max) max = d;
    });
    return max || 1;
  }

  function renderTree() {
    FamilyTreeRenderer.init('treeContainer', openProfile);
    FamilyTreeRenderer.render(allMembers);
  }

  function renderTimeline() {
    const tl = document.getElementById('timeline');
    if (!tl) return;
    const events = [];
    allMembers.forEach(m => {
      if (m.dob) events.push({ year: m.dob, type: 'birth', person: m.name });
      if (m.dod) events.push({ year: m.dod, type: 'death', person: m.name });
      if (m.marriageDate) events.push({ year: m.marriageDate, type: 'marriage', person: m.name });
    });
    events.sort((a,b) => parseInt(a.year) - parseInt(b.year));
    const recent = events.slice(-30).reverse();
    tl.innerHTML = recent.length ? recent.map(e => `
      <div class="tl-card" title="${e.person}">
        <div class="tl-year">${extractYear(e.year)}</div>
        <div class="tl-event">${capitalize(e.type)}</div>
        <div class="tl-person">${e.person}</div>
        <span class="tl-type ${e.type}">${capitalize(e.type)}</span>
      </div>`).join('')
      : '<div class="empty-state">Add dates to your sheet to see the timeline.</div>';
  }

  function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const withPhotos = allMembers.filter(m => m.photoUrl);
    if (!withPhotos.length) {
      grid.innerHTML = '<div class="empty-state">Add photo URLs to your Google Sheet to see the gallery.</div>';
      return;
    }
    grid.innerHTML = withPhotos.map(m => {
      const url = FamilyTreeRenderer.driveUrl(m.photoUrl);
      return `<div class="gallery-item" onclick="openLightbox('${url}','${escHtml(m.name)}')">
        <img src="${url}" alt="${escHtml(m.name)}" loading="lazy"
             onerror="this.parentElement.style.display='none'">
        <div class="gallery-overlay"><span>${escHtml(m.name)}</span></div>
      </div>`;
    }).join('');
  }

  function populateSelects() {
    const opts = allMembers.map(m => `<option value="${m.id}">${escHtml(m.name)}</option>`).join('');
    ['personA','personB','fFather','fMother','fSpouse'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const blank = el.options[0] ? el.options[0].outerHTML : '';
      el.innerHTML = blank + opts;
    });
    // Generation filter
    const gens = [...new Set(allMembers.map(m => m.generation).filter(Boolean))].sort((a,b)=>a-b);
    const gf = document.getElementById('generationFilter');
    if (gf) {
      gf.innerHTML = '<option value="">All generations</option>' +
        gens.map(g => `<option value="${g}">Generation ${g}</option>`).join('');
    }
    // Surname filter
    const snames = [...new Set(allMembers.map(m => (m.name||'').split(' ').pop()).filter(Boolean))].sort();
    const sf = document.getElementById('surnameFilter');
    if (sf) {
      sf.innerHTML = '<option value="">All surnames</option>' +
        snames.map(s => `<option value="${s}">${escHtml(s)}</option>`).join('');
    }
  }

  // ── PROFILE DRAWER ───────────────────────────────────────────────────
  function openProfile(id) {
    currentMemberId = id;
    const m = allMembers.find(x => x.id === id);
    if (!m) return;
    const drawer = document.getElementById('profileDrawer');
    const content = document.getElementById('drawerContent');
    if (!drawer || !content) return;

    const photoUrl = FamilyTreeRenderer.driveUrl(m.photoUrl);
    const photoHtml = photoUrl
      ? `<img class="drawer-photo" src="${photoUrl}" alt="${escHtml(m.name)}"
             onerror="this.outerHTML='<div class=drawer-photo-placeholder>${escHtml(m.name[0])}</div>'">`
      : `<div class="drawer-photo-placeholder">${escHtml((m.name||'?')[0])}</div>`;

    const gender = (m.gender||'').toLowerCase();
    const genderLabel = { male:'♂ Male', female:'♀ Female', other:'⚧ Other' }[gender] || m.gender || '';

    // Find relatives
    const father   = allMembers.find(x => x.id === m.fatherId);
    const mother   = allMembers.find(x => x.id === m.motherId);
    const spouse   = allMembers.find(x => x.id === m.spouseId);
    const children = allMembers.filter(x => x.fatherId === m.id || x.motherId === m.id);
    const siblings = allMembers.filter(x =>
      x.id !== m.id && (
        (m.fatherId && x.fatherId === m.fatherId) ||
        (m.motherId && x.motherId === m.motherId)
      )
    );

    content.innerHTML = `
      <div class="drawer-header">
        ${photoHtml}
        <div style="flex:1;min-width:0">
          <div class="drawer-name">${m.namePrefix ? '<span style="font-size:14px;font-weight:400;color:var(--text-3)">Late </span>' : ''}${escHtml(m.name)}</div>
          <div class="drawer-sub">${[m.occupation, m.city, m.generation ? 'Gen '+m.generation : ''].filter(Boolean).join(' · ') || ''}</div>
          ${genderLabel ? `<span class="gender-badge ${gender}">${genderLabel}</span>` : ''}
          ${m.dod ? '<span class="gender-badge" style="background:#f1f5f9;color:#64748b;margin-left:4px">† Deceased</span>' : ''}
        </div>
        <button class="drawer-close" id="closeDrawer" aria-label="Close">×</button>
      </div>
      <div class="drawer-body">
        <div class="info-grid">
          ${infoCard('Date of birth', m.dob)}
          ${infoCard('Date of death', m.dod)}
          ${infoCard('Education', m.education)}
          ${infoCard('Generation', m.generation ? 'Gen ' + m.generation : '')}
          ${infoCard('Marriage date', m.marriageDate)}
          ${infoCard('Email', m.email)}
          ${infoCard('Phone', m.phone)}
          ${infoCard('City', m.city)}
        </div>
        ${m.bio ? `<div class="bio-section"><div class="bio-label">Biography</div><p>${escHtml(m.bio)}</p></div>` : ''}
        ${relSection('Parents', [
            father ? {m:father,role:'Father'} : null,
            mother ? {m:mother,role:'Mother'} : null
          ].filter(Boolean))}
        ${relSection('Spouse', spouse ? [{m:spouse,role:'Spouse'}] : [])}
        ${relSection('Children', children.map(c => ({m:c,role:'Child'})))}
        ${relSection('Siblings', siblings.map(s => ({m:s,role:'Sibling'})))}
      </div>
      <div class="drawer-actions">
        ${isAdmin ? `
          <button class="btn btn-accent btn-sm" onclick="openEditModal('${m.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${m.id}')">Delete</button>
        ` : ''}
        <button class="btn btn-outline btn-sm" onclick="focusTreeNode('${m.id}')">Find in tree</button>
      </div>
    `;

    drawer.classList.add('open');
    document.getElementById('drawerScrim').classList.add('visible');
    document.getElementById('closeDrawer').onclick = closeDrawer;
  }

  function infoCard(label, value) {
    if (!value) return '';
    return `<div class="info-card">
      <div class="ic-label">${label}</div>
      <div class="ic-value">${escHtml(value)}</div>
    </div>`;
  }

  function relSection(title, items) {
    if (!items.length) return '';
    return `<div class="relatives-section">
      <div class="relatives-title">${title}</div>
      <div class="relative-chips">
        ${items.map(({m, role}) => {
          const photo = FamilyTreeRenderer.driveUrl(m.photoUrl);
          const initial = (m.name||'?')[0].toUpperCase();
          const photoEl = photo
            ? `<img class="rc-photo" src="${photo}" alt="${escHtml(m.name)}"
                   onerror="this.outerHTML='<div class=rc-initial>${initial}</div>'">`
            : `<div class="rc-initial">${initial}</div>`;
          return `<a class="relative-chip" href="#" onclick="event.preventDefault();openProfile('${m.id}')">
            ${photoEl}
            <div class="rc-info">
              <div class="rc-name">${escHtml(m.name)}</div>
              <div class="rc-role">${role}</div>
            </div>
          </a>`;
        }).join('')}
      </div>
    </div>`;
  }

  function closeDrawer() {
    document.getElementById('profileDrawer').classList.remove('open');
    document.getElementById('drawerScrim').classList.remove('visible');
    currentMemberId = null;
  }

  // ── SEARCH & FILTER ──────────────────────────────────────────────────
  function filterMembers() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const gen = document.getElementById('generationFilter')?.value || '';
    const sur = document.getElementById('surnameFilter')?.value || '';

    let filtered = allMembers;
    if (q) filtered = filtered.filter(m =>
      (m.name||'').toLowerCase().includes(q) ||
      (m.city||'').toLowerCase().includes(q) ||
      (m.occupation||'').toLowerCase().includes(q)
    );
    if (gen) filtered = filtered.filter(m => m.generation === gen);
    if (sur) filtered = filtered.filter(m => (m.name||'').endsWith(sur));

    FamilyTreeRenderer.render(filtered);
  }

  // ── RELATIONSHIP FINDER ──────────────────────────────────────────────
  function findRelationship() {
    const aId = document.getElementById('personA')?.value;
    const bId = document.getElementById('personB')?.value;
    const result = document.getElementById('relationshipResult');
    if (!aId || !bId || !result) return;
    if (aId === bId) { result.textContent = 'Same person.'; return; }

    const path = bfsPath(aId, bId);
    if (!path) { result.textContent = 'No relationship path found.'; return; }

    const byId = {};
    allMembers.forEach(m => byId[m.id] = m);
    const names = path.map(id => byId[id]?.name || id).join(' → ');
    result.textContent = `Path (${path.length - 1} steps): ${names}`;
    FamilyTreeRenderer.highlightPath(path);
  }

  function bfsPath(startId, endId) {
    // Build adjacency: parent-child + spouse
    const adj = {};
    allMembers.forEach(m => {
      adj[m.id] = adj[m.id] || new Set();
      if (m.fatherId) {
        adj[m.id].add(m.fatherId);
        adj[m.fatherId] = adj[m.fatherId] || new Set();
        adj[m.fatherId].add(m.id);
      }
      if (m.motherId) {
        adj[m.id].add(m.motherId);
        adj[m.motherId] = adj[m.motherId] || new Set();
        adj[m.motherId].add(m.id);
      }
      if (m.spouseId) {
        adj[m.id].add(m.spouseId);
        adj[m.spouseId] = adj[m.spouseId] || new Set();
        adj[m.spouseId].add(m.id);
      }
    });
    const prev = { [startId]: null };
    const queue = [startId];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === endId) {
        const path = [];
        let c = endId;
        while (c !== null) { path.unshift(c); c = prev[c]; }
        return path;
      }
      for (const nb of (adj[cur] || [])) {
        if (!(nb in prev)) { prev[nb] = cur; queue.push(nb); }
      }
    }
    return null;
  }

  // ── ADMIN AUTH ───────────────────────────────────────────────────────
  function attemptLogin() {
    const pass = document.getElementById('loginPass')?.value;
    const err = document.getElementById('loginError');
    if (pass === (C.ADMIN_PASSWORD || 'family2024')) {
      isAdmin = true;
      sessionStorage.setItem('ft_admin', '1');
      setAdminUI(true);
      closeModal('loginModal');
      toast('Admin mode enabled', 'success');
    } else {
      if (err) err.textContent = 'Incorrect password.';
    }
  }

  function logout() {
    isAdmin = false;
    sessionStorage.removeItem('ft_admin');
    setAdminUI(false);
    toast('Logged out');
  }

  function setAdminUI(admin) {
    const addBtn = document.getElementById('addMemberBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    const fab = document.getElementById('fabAdd');
    const badge = document.getElementById('adminBadge');
    if (addBtn) addBtn.hidden = !admin;
    if (fab) fab.hidden = !admin;
    if (logoutBtn) logoutBtn.hidden = !admin;
    if (loginBtn) loginBtn.hidden = admin;
    if (badge) badge.hidden = !admin;
  }

  // Check session on load
  function checkSession() {
    if (sessionStorage.getItem('ft_admin') === '1') {
      isAdmin = true;
      setAdminUI(true);
    }
  }

  // ── ADD / EDIT MODAL ─────────────────────────────────────────────────
  // NOTE: Since this is a static GitHub Pages site, "saving" generates
  // a CSV row the admin can paste into their Google Sheet.
  function openAddModal() {
    if (!isAdmin) { openModal('loginModal'); return; }
    document.getElementById('modalTitle').textContent = 'Add Family Member';
    document.getElementById('addForm').reset();
    document.getElementById('fId').value = 'NEW_' + Date.now();
    document.getElementById('formHint').textContent = 'Copy the generated CSV row and paste it into your Google Sheet.';
    openModal('addModal');
  }

  window.openEditModal = function(id) {
    if (!isAdmin) return;
    const m = allMembers.find(x => x.id === id);
    if (!m) return;
    document.getElementById('modalTitle').textContent = 'Edit Member';
    // Fill form
    const fields = {
      fId: m.id, fName: m.name, fGender: m.gender,
      fFather: m.fatherId, fMother: m.motherId, fSpouse: m.spouseId,
      fPhoto: m.photoUrl, fDob: m.dob, fDod: m.dod,
      fMarriage: m.marriageDate, fCity: m.city,
      fOccupation: m.occupation, fEducation: m.education,
      fEmail: m.email, fPhone: m.phone, fGeneration: m.generation, fBio: m.bio
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    });
    document.getElementById('formHint').textContent = 'Update this row in your Google Sheet with the generated CSV.';
    openModal('addModal');
  };

  function submitForm(e) {
    e.preventDefault();
    const get = id => (document.getElementById(id)?.value || '').trim();
    if (!get('fName')) { toast('Name is required', 'error'); return; }
    const row = [
      get('fId'), get('fName'), get('fGender'),
      get('fFather'), get('fMother'), get('fSpouse'),
      get('fPhoto'), get('fDob'), get('fDod'),
      get('fMarriage'), get('fOccupation'), get('fEducation'),
      get('fCity'), get('fBio'), get('fEmail'), get('fPhone'), get('fGeneration')
    ].map(v => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v);

    const csvRow = row.join(',');
    const output = document.getElementById('csvOutput');
    if (output) {
      output.value = csvRow;
      output.style.display = 'block';
      output.select();
      document.execCommand('copy');
      toast('CSV row copied to clipboard! Paste into your Google Sheet.', 'success');
    }
  }

  window.confirmDelete = function(id) {
    const m = allMembers.find(x => x.id === id);
    if (!m) return;
    if (confirm(`Delete "${m.name}"? You'll also need to remove row ID="${m.id}" from your Google Sheet.`)) {
      toast(`To delete: remove row with ID="${m.id}" from your Google Sheet.`, 'success');
      closeDrawer();
    }
  };

  // ── GLOBAL FUNCTIONS (called from HTML) ──────────────────────────────
  window.openProfile    = openProfile;
  window.focusTreeNode  = id => { FamilyTreeRenderer.focusNode(id); closeDrawer(); };

  window.openLightbox = function(url, name) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    if (!lb || !img) return;
    img.src = url; img.alt = name;
    lb.classList.add('open');
  };
  window.closeLightbox = function() {
    document.getElementById('lightbox')?.classList.remove('open');
  };

  // ── MODAL HELPERS ────────────────────────────────────────────────────
  function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

  // ── TOAST ────────────────────────────────────────────────────────────
  window.toast = function(msg, type = '') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  };

  // ── BIND UI ──────────────────────────────────────────────────────────
  function bindStaticUI() {
    checkSession();

    // Topbar
    bind('loginBtn', 'click', () => openModal('loginModal'));
    bind('logoutBtn', 'click', logout);
    bind('addMemberBtn', 'click', openAddModal);
    bind('fabAdd', 'click', openAddModal);
    bind('themeToggle', 'click', toggleTheme);
    bind('printButton', 'click', () => window.print());
    bind('pngButton', 'click', exportPng);

    // Search & filter
    bind('searchInput', 'input', filterMembers);
    bind('generationFilter', 'change', filterMembers);
    bind('surnameFilter', 'change', filterMembers);
    bind('expandAll', 'click', () => FamilyTreeRenderer.render(allMembers));
    bind('collapseAll', 'click', () => {});

    // Relationship finder
    bind('findRelationship', 'click', findRelationship);

    // Drawer close
    bind('drawerScrim', 'click', closeDrawer);

    // Login modal
    bind('submitLogin', 'click', (e) => { e.preventDefault(); attemptLogin(); });
    bind('closeLoginModal', 'click', () => closeModal('loginModal'));
    bind('cancelLogin', 'click', () => closeModal('loginModal'));
    bind('loginForm', 'submit', (e) => { e.preventDefault(); attemptLogin(); });

    // Add modal
    bind('closeModal', 'click', () => closeModal('addModal'));
    bind('cancelModal', 'click', () => closeModal('addModal'));
    bind('addForm', 'submit', submitForm);

    // Lightbox
    bind('lightboxClose', 'click', window.closeLightbox);
    document.getElementById('lightbox')?.addEventListener('click', function(e) {
      if (e.target === this) window.closeLightbox();
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(m => {
      m.querySelector('.modal-backdrop')?.addEventListener('click', () => {
        m.classList.remove('open');
      });
    });

    // Reload data
    bind('retryButton', 'click', loadData);
    bind('reloadData', 'click', loadData);
  }

  function bind(id, event, fn) {
    document.getElementById(id)?.addEventListener(event, fn);
  }

  // ── THEME ────────────────────────────────────────────────────────────
  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const dark = document.documentElement.classList.contains('dark');
    localStorage.setItem('ft_theme', dark ? 'dark' : 'light');
  }
  // Apply saved theme
  if (localStorage.getItem('ft_theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }

  // ── EXPORT PNG ───────────────────────────────────────────────────────
  async function exportPng() {
    const el = document.getElementById('treeContainer');
    if (!el) return;
    toast('Generating image…');
    try {
      const canvas = await html2canvas(el, { useCORS: true, backgroundColor: '#fff' });
      const a = document.createElement('a');
      a.download = 'family-tree.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch(e) {
      toast('Could not export image', 'error');
    }
  }

  // ── UTILS ────────────────────────────────────────────────────────────
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  window.escHtml = function(str) {
    return String(str||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function extractYear(s) { const m = String(s||'').match(/\d{4}/); return m ? m[0] : s; }

})();
