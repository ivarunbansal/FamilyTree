(function () {
  "use strict";

  const config = window.FAMILY_TREE_CONFIG || {};
  const themeConfig = config.theme || {};
  const cacheKey = "family-tree-sheet-cache-v1";
  const cacheMinutes = Number(themeConfig.cacheMinutes || 15);
  const emptyPhoto = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%239f7aea'/%3E%3Cstop offset='1' stop-color='%232dd4bf'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='160' height='160' rx='80' fill='url(%23g)'/%3E%3Ccircle cx='80' cy='62' r='28' fill='white' fill-opacity='.88'/%3E%3Cpath d='M38 132c8-28 27-43 42-43s34 15 42 43' fill='white' fill-opacity='.88'/%3E%3C/svg%3E";

  const state = {
    allMembers: [],
    members: [],
    byId: new Map(),
    selectedPath: [],
    treeD3: null
  };

  const el = {
    siteTitle: document.getElementById("siteTitle"),
    heroTitle: document.getElementById("heroTitle"),
    syncStatus: document.getElementById("syncStatus"),
    loading: document.getElementById("loadingState"),
    error: document.getElementById("errorState"),
    errorMessage: document.getElementById("errorMessage"),
    retry: document.getElementById("retryButton"),
    tree: document.getElementById("familyTree"),
    search: document.getElementById("searchInput"),
    generation: document.getElementById("generationFilter"),
    surname: document.getElementById("surnameFilter"),
    personA: document.getElementById("personA"),
    personB: document.getElementById("personB"),
    result: document.getElementById("relationshipResult"),
    timeline: document.getElementById("timeline"),
    drawer: document.getElementById("profileDrawer"),
    drawerContent: document.getElementById("drawerContent"),
    scrim: document.getElementById("drawerScrim")
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    document.title = config.siteTitle || "Family Tree";
    el.siteTitle.textContent = config.siteTitle || "Family Tree";
    el.heroTitle.textContent = config.siteTitle || "Family Tree";
    document.documentElement.style.setProperty("--accent", themeConfig.accentColor || "#9f7aea");
    setTheme(localStorage.getItem("family-tree-theme") || themeConfig.defaultMode || "dark");
    bindEvents();
    loadFamilyData();
  }

  function bindEvents() {
    document.getElementById("themeToggle").addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
      if (state.members.length) renderTree(state.members);
    });
    el.retry.addEventListener("click", () => loadFamilyData(true));
    el.search.addEventListener("input", debounce(applyFilters, 160));
    el.generation.addEventListener("change", applyFilters);
    el.surname.addEventListener("change", applyFilters);
    document.getElementById("expandAll").addEventListener("click", () => {
      if (state.treeD3 && state.treeD3.fitToScreen) state.treeD3.fitToScreen();
    });
    document.getElementById("collapseAll").addEventListener("click", () => {
      if (state.treeD3 && state.treeD3.fitToScreen) state.treeD3.fitToScreen();
    });
    document.getElementById("findRelationship").addEventListener("click", showRelationshipPath);
    document.getElementById("printButton").addEventListener("click", () => window.print());
    document.getElementById("pngButton").addEventListener("click", () => exportImage("png"));
    document.getElementById("pdfButton").addEventListener("click", () => exportImage("pdf"));
    document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
    el.scrim.addEventListener("click", closeDrawer);
  }

  function setTheme(mode) {
    const next = mode === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("family-tree-theme", next);
  }

  async function loadFamilyData(forceRefresh) {
    showLoading();
    try {
      if (!config.googleSheetUrl) {
        throw new Error("Add a public Google Sheet URL, CSV export URL, Google Visualization URL, or SheetDB API URL in config.js.");
      }
      const cached = readCache();
      if (!forceRefresh && cached) {
        hydrate(cached.data, "Loaded from cache while keeping your sheet live.");
        refreshInBackground();
        return;
      }
      const rows = await fetchSheetRows(config.googleSheetUrl);
      writeCache(rows);
      hydrate(rows, "Live sheet synced just now.");
    } catch (error) {
      const cached = readCache(true);
      if (cached) {
        hydrate(cached.data, "Network issue. Showing the last saved copy.");
        return;
      }
      showError(error.message);
    }
  }

  async function refreshInBackground() {
    try {
      const rows = await fetchSheetRows(config.googleSheetUrl);
      writeCache(rows);
      hydrate(rows, "Live sheet synced just now.");
    } catch (error) {
      el.syncStatus.textContent = "Using cache. Live refresh failed.";
    }
  }

  async function fetchSheetRows(sheetUrl) {
    const url = buildFetchUrl(sheetUrl);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("The sheet service returned " + response.status + ".");
    const text = await response.text();
    if (looksLikeJson(text)) return parseJsonRows(JSON.parse(stripGviz(text)));
    return parseCsv(text);
  }

  function buildFetchUrl(input) {
    const url = new URL(input);
    if (url.hostname.includes("sheetdb.io")) return input;
    if (url.pathname.includes("/gviz/tq")) return input;
    if (url.pathname.includes("/export") || input.includes("output=csv")) return input;
    if (url.hostname.includes("docs.google.com") && url.pathname.includes("/spreadsheets/d/")) {
      const id = url.pathname.match(/\/d\/([^/]+)/)?.[1];
      const gid = url.searchParams.get("gid") || "0";
      return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&gid=${gid}`;
    }
    return input;
  }

  function looksLikeJson(text) {
    const trimmed = text.trim();
    return trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("google.visualization");
  }

  function stripGviz(text) {
    return text.replace(/^[^{]+/, "").replace(/;?\s*$/, "");
  }

  function parseJsonRows(payload) {
    if (Array.isArray(payload)) return payload;
    const tableRows = payload.table?.rows || [];
    const headers = (payload.table?.cols || []).map((col) => col.label || col.id);
    return tableRows.map((row) => {
      const item = {};
      (row.c || []).forEach((cell, index) => {
        item[headers[index]] = cell && (cell.f || cell.v) ? String(cell.f || cell.v) : "";
      });
      return item;
    });
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], value = "", quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i], next = text[i + 1];
      if (char === '"' && quoted && next === '"') { value += '"'; i += 1; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === "," && !quoted) { row.push(value); value = ""; continue; }
      if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(value); rows.push(row); row = []; value = ""; continue;
      }
      value += char;
    }
    row.push(value); rows.push(row);
    const headers = rows.shift().map(cleanKey);
    return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ""])));
  }

  function hydrate(rows, status) {
    const members = rows.map(normalizeMember).filter((member) => member.id && member.name);
    state.allMembers = members;
    state.byId = new Map(members.map((member) => [member.id, member]));
    hideStates();
    el.syncStatus.textContent = status;
    updateStats(members);
    updateFilterOptions(members);
    renderTimeline(members);
    applyFilters();
  }

  function normalizeMember(row) {
    const find = (...keys) => {
      for (const key of keys) {
        const value = row[key] ?? row[cleanKey(key)] ?? row[key.toLowerCase()];
        if (value !== undefined && value !== null) return String(value).trim();
      }
      return "";
    };
    return {
      id: find("ID", "Id", "id"),
      name: find("Name"),
      gender: find("Gender"),
      fatherId: find("FatherID", "Father ID", "Father"),
      motherId: find("MotherID", "Mother ID", "Mother"),
      spouseId: find("SpouseID", "Spouse ID", "Spouse"),
      photoUrl: find("PhotoURL", "Photo URL", "Photo"),
      dob: find("DOB", "Date of Birth"),
      marriageDate: find("MarriageDate", "Date of Marriage"),
      occupation: find("Occupation"),
      education: find("Education"),
      city: find("City"),
      bio: find("Bio"),
      email: find("Email"),
      phone: find("Phone"),
      generation: find("Generation", "Generation Number")
    };
  }

  function cleanKey(key) {
    return String(key || "").replace(/\s+/g, "").trim();
  }

  function applyFilters() {
    const query = el.search.value.toLowerCase().trim();
    const generation = el.generation.value;
    const surname = el.surname.value;
    const visible = state.allMembers.filter((member) => {
      const haystack = [member.name, member.city, member.occupation, member.education, member.bio].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) &&
        (!generation || member.generation === generation) &&
        (!surname || getSurname(member.name) === surname);
    });
    state.members = visible;
    renderTree(visible);
  }

  function renderTree(members) {
    if (typeof renderD3Tree !== "function") {
      renderFallbackTree(members);
      return;
    }
    state.treeD3 = renderD3Tree(members, {
      container: el.tree,
      onNodeClick: openDrawer,
      selectedPath: state.selectedPath
    });
  }

  function renderFallbackTree(members) {
    el.tree.innerHTML = `<div class="fallback-grid">${members.map((member) => `<button class="family-node" data-id="${escapeHtml(member.id)}"><img loading="lazy" src="${escapeHtml(member.photoUrl || emptyPhoto)}" alt=""><strong>${escapeHtml(member.name)}</strong><span>${escapeHtml(relationshipLabel(member))}</span><span>Gen ${escapeHtml(member.generation || "?")}</span></button>`).join("")}</div>`;
    el.tree.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => openDrawer(state.byId.get(button.dataset.id)));
    });
  }

  function updateStats(members) {
    document.getElementById("totalMembers").textContent = members.length;
    document.getElementById("totalGenerations").textContent = new Set(members.map((m) => m.generation).filter(Boolean)).size;
    document.getElementById("totalCities").textContent = new Set(members.map((m) => m.city).filter(Boolean)).size;
    document.getElementById("totalSurnames").textContent = new Set(members.map((m) => getSurname(m.name)).filter(Boolean)).size;
  }

  function updateFilterOptions(members) {
    fillSelect(el.generation, "All generations", [...new Set(members.map((m) => m.generation).filter(Boolean))].sort(naturalSort));
    fillSelect(el.surname, "All surnames", [...new Set(members.map((m) => getSurname(m.name)).filter(Boolean))].sort());
    const people = members.slice().sort((a, b) => a.name.localeCompare(b.name));
    fillSelect(el.personA, "From member", people.map((m) => [m.id, m.name]));
    fillSelect(el.personB, "To member", people.map((m) => [m.id, m.name]));
  }

  function fillSelect(select, placeholder, values) {
    const current = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + values.map((item) => {
      const value = Array.isArray(item) ? item[0] : item;
      const label = Array.isArray(item) ? item[1] : item;
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    }).join("");
    select.value = current;
  }

  function renderTimeline(members) {
    const events = [];
    members.forEach((member) => {
      if (member.dob) events.push({ date: member.dob, title: `${member.name} was born`, meta: member.city });
      if (member.marriageDate) events.push({ date: member.marriageDate, title: `${member.name} married`, meta: spouseName(member) });
    });
    events.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    el.timeline.innerHTML = events.slice(0, 60).map((event) => `
      <article class="timeline-item">
        <time>${escapeHtml(event.date)}</time>
        <h3>${escapeHtml(event.title)}</h3>
        <p class="muted">${escapeHtml(event.meta || "Family milestone")}</p>
      </article>
    `).join("") || `<p class="muted">Add DOB and MarriageDate columns to your sheet to populate the timeline.</p>`;
  }

  function openDrawer(member) {
    if (!member) return;
    const parents = [state.byId.get(member.fatherId), state.byId.get(member.motherId)].filter(Boolean).map((m) => m.name).join(", ");
    const children = state.allMembers.filter((m) => m.fatherId === member.id || m.motherId === member.id).map((m) => m.name).join(", ");
    const contact = [member.email, member.phone].filter(Boolean).join(" | ");
    el.drawerContent.innerHTML = `
      <div class="profile-hero">
        <img class="profile-photo" loading="lazy" src="${escapeHtml(member.photoUrl || emptyPhoto)}" alt="">
        <div>
          <p class="eyebrow">${escapeHtml(relationshipLabel(member))}</p>
          <h2>${escapeHtml(member.name)}</h2>
          <div class="badge-row">
            <span class="badge">Generation ${escapeHtml(member.generation || "?")}</span>
            ${member.city ? `<span class="badge">${escapeHtml(member.city)}</span>` : ""}
            ${member.gender ? `<span class="badge">${escapeHtml(member.gender)}</span>` : ""}
          </div>
        </div>
      </div>
      <dl class="detail-list">
        ${detail("Born", member.dob)}
        ${detail("Married", member.marriageDate)}
        ${detail("Occupation", member.occupation)}
        ${detail("Education", member.education)}
        ${detail("Spouse", spouseName(member))}
        ${detail("Parents", parents)}
        ${detail("Children", children)}
        ${detail("Contact", contact)}
      </dl>
      <h3>Bio</h3>
      <p class="muted">${escapeHtml(member.bio || "No bio has been added yet.")}</p>
      <h3>Family Gallery</h3>
      <div class="gallery">
        <img loading="lazy" src="${escapeHtml(member.photoUrl || emptyPhoto)}" alt="">
        ${[parents, children].filter(Boolean).map((label) => `<img loading="lazy" src="${emptyPhoto}" alt="${escapeHtml(label)}">`).join("")}
      </div>`;
    el.drawer.classList.add("open");
    el.drawer.setAttribute("aria-hidden", "false");
    el.scrim.hidden = false;
  }

  function closeDrawer() {
    el.drawer.classList.remove("open");
    el.drawer.setAttribute("aria-hidden", "true");
    el.scrim.hidden = true;
  }

  function detail(label, value) {
    return value ? `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>` : "";
  }

  function showRelationshipPath() {
    const start = el.personA.value;
    const end = el.personB.value;
    if (!start || !end || start === end) {
      el.result.textContent = "Choose two different family members.";
      return;
    }
    const path = shortestPath(start, end);
    if (!path.length) {
      el.result.textContent = "No direct relationship path was found in the current sheet.";
      return;
    }
    state.selectedPath = path;
    el.result.textContent = path.map((id) => state.byId.get(id)?.name || id).join(" -> ");
    renderTree(state.members);
  }

  function shortestPath(start, end) {
    const graph = new Map();
    state.allMembers.forEach((m) => {
      addEdge(graph, m.id, m.fatherId);
      addEdge(graph, m.id, m.motherId);
      addEdge(graph, m.id, m.spouseId);
    });
    const queue = [[start]];
    const seen = new Set([start]);
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      if (last === end) return path;
      (graph.get(last) || []).forEach((next) => {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push([...path, next]);
        }
      });
    }
    return [];
  }

  function addEdge(graph, a, b) {
    if (!a || !b) return;
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a).add(b);
    graph.get(b).add(a);
  }

  async function exportImage(type) {
    if (!window.html2canvas) return alert("Export tools are still loading. Please try again in a moment.");
    const canvas = await html2canvas(document.querySelector(".workspace"), { backgroundColor: null, scale: 2 });
    if (type === "png") {
      download(canvas.toDataURL("image/png"), "family-tree.png");
      return;
    }
    const pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("family-tree.pdf");
  }

  function download(dataUrl, name) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name;
    link.click();
  }

  function relationshipLabel(member) {
    if (!member.fatherId && !member.motherId) return member.spouseId ? "Root couple" : "Family member";
    return "Child";
  }

  function spouseName(member) {
    return state.byId.get(member.spouseId)?.name || "";
  }

  function getSurname(name) {
    return String(name || "").trim().split(/\s+/).pop() || "";
  }

  function parseDate(value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function naturalSort(a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  }

  function readCache(allowExpired) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (!cached) return null;
      const fresh = Date.now() - cached.savedAt < cacheMinutes * 60 * 1000;
      return fresh || allowExpired ? cached : null;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data }));
  }

  function showLoading() {
    el.loading.hidden = false;
    el.error.hidden = true;
  }

  function hideStates() {
    el.loading.hidden = true;
    el.error.hidden = true;
  }

  function showError(message) {
    el.loading.hidden = true;
    el.error.hidden = false;
    el.errorMessage.textContent = message;
    el.syncStatus.textContent = "Family data is unavailable.";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }
})();
