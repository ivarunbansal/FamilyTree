/* =====================================================================
   tree-d3.js — Family tree rendering with D3 v7
   Card-based layout with orthogonal connectors
   ===================================================================== */

const FamilyTreeRenderer = (() => {
  let svg, g, zoom, members = [], onNodeClick = null;
  let collapsedNodes = new Set();
  let currentData = null;

  const CARD_W = 180, CARD_H = 64, PHOTO_R = 20;
  const SPOUSE_GAP = 10;
  const H_SPACING = 280, V_SPACING = 140;

  function driveUrl(url) {
    if (!url) return null;
    const m = url.match(/\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
    return url;
  }

  function init(containerId, clickCallback) {
    onNodeClick = clickCallback;
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const H = Math.max(window.innerHeight * 0.7, 500);

    svg = d3.select(`#${containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', H)
      .style('font-family', 'Inter, system-ui, sans-serif');

    svg.append('defs');

    zoom = d3.zoom()
      .scaleExtent([0.15, 2.5])
      .on('zoom', (e) => g.attr('transform', e.transform));

    svg.call(zoom);
    g = svg.append('g');
  }

  function render(data) {
    if (!g) return;
    members = data;
    currentData = data;
    g.selectAll('*').remove();
    svg.select('defs').selectAll('*').remove();

    if (!data || !data.length) return;

    const byId = {};
    data.forEach(d => byId[d.id] = d);

    const spouseOf = {};
    data.forEach(d => {
      if (d.spouseId) {
        spouseOf[d.id] = d.spouseId;
        spouseOf[d.spouseId] = d.id;
      }
    });

    const hasFatherChildren = new Set();
    data.forEach(d => { if (d.fatherId) hasFatherChildren.add(d.fatherId); });

    const spouseOnly = new Set();
    data.forEach(d => {
      if (!d.fatherId && !d.motherId && d.spouseId && !hasFatherChildren.has(d.id)) {
        spouseOnly.add(d.id);
      }
    });

    // Find root
    let rootId = null;
    const primaryMembers = data.filter(d => !spouseOnly.has(d.id));
    const withGen = primaryMembers.filter(d => d.generation != null && d.generation !== '');
    if (withGen.length) {
      withGen.sort((a, b) => Number(a.generation) - Number(b.generation));
      rootId = withGen[0].id;
    } else {
      const notChild = primaryMembers.filter(d => !d.fatherId && !d.motherId);
      rootId = notChild.length ? notChild[0].id : (primaryMembers[0] || data[0]).id;
    }

    const stratData = buildStratData(data, byId, rootId, spouseOnly);
    if (!stratData.length) return;

    try {
      const hierarchy = d3.stratify()
        .id(d => d.sid)
        .parentId(d => d.parentSid)
        (stratData);

      pruneCollapsed(hierarchy);

      const treeLayout = d3.tree()
        .nodeSize([H_SPACING, V_SPACING])
        .separation((a, b) => a.parent === b.parent ? 1.5 : 2.0);

      treeLayout(hierarchy);

      const nodes = hierarchy.descendants();
      const minX = d3.min(nodes, d => d.x);
      const maxX = d3.max(nodes, d => d.x);
      const cx = (maxX + minX) / 2;

      // Draw orthogonal links
      drawOrthogonalLinks(hierarchy, cx, spouseOf, spouseOnly);

      // Draw spouse connectors and cards
      drawSpouseCards(nodes, cx, byId, spouseOf, spouseOnly);

      // Draw primary member cards
      nodes.forEach(nd => {
        const m = byId[nd.data.origId];
        if (!m) return;
        const x = nd.x - cx;
        const y = nd.y;
        drawCard(m, x, y, false);
      });

      // Draw collapse buttons
      nodes.forEach(nd => {
        const origId = nd.data.origId;
        if (!hasVisibleChildren(origId, data, spouseOnly)) return;
        const x = nd.x - cx;
        const y = nd.y;
        drawCollapseBtn(x, y, origId);
      });

      // Auto-fit
      const svgEl = svg.node();
      const W = svgEl.clientWidth || 900;
      const H = parseFloat(svg.attr('height'));
      const treeWidth = (maxX - minX) + CARD_W * 2 + 200;
      const treeHeight = (d3.max(nodes, d => d.y) || 0) + CARD_H + 120;
      const scaleX = W / Math.max(treeWidth, 1);
      const scaleY = H / Math.max(treeHeight, 1);
      const autoScale = Math.max(Math.min(scaleX, scaleY, 1), 0.25);
      svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, 50).scale(autoScale));

    } catch (e) {
      console.warn('Tree render error:', e);
    }
  }

  function drawCard(m, cx, cy, isSpouse) {
    const gender = (m.gender || '').toLowerCase();
    const isDec = !!m.dod;
    const w = isSpouse ? CARD_W - 10 : CARD_W;
    const h = CARD_H;
    const x = cx - w / 2;
    const y = cy - h / 2;

    const colors = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6' };
    const borderColor = colors[gender] || '#94a3b8';

    const card = g.append('g')
      .attr('class', `tree-card ${gender} ${isDec ? 'deceased' : ''}`)
      .attr('cursor', 'pointer')
      .on('click', () => { if (onNodeClick) onNodeClick(m.id); });

    // Card background
    card.append('rect')
      .attr('x', x).attr('y', y)
      .attr('width', w).attr('height', h)
      .attr('rx', 6)
      .attr('fill', '#fff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,.08))');

    // Top accent bar
    card.append('rect')
      .attr('x', x).attr('y', y)
      .attr('width', w).attr('height', 3)
      .attr('rx', 0)
      .attr('fill', borderColor);

    // Round top corners of accent bar
    card.append('rect')
      .attr('x', x).attr('y', y)
      .attr('width', w).attr('height', 6)
      .attr('rx', 6)
      .attr('fill', borderColor);
    card.append('rect')
      .attr('x', x).attr('y', y + 3)
      .attr('width', w).attr('height', 3)
      .attr('fill', borderColor);

    // Photo
    const photoX = x + 12;
    const photoY = cy;
    const clipId = `clip-card-${m.id}`;

    svg.select('defs').append('clipPath')
      .attr('id', clipId)
      .append('circle')
      .attr('r', PHOTO_R).attr('cx', photoX + PHOTO_R).attr('cy', photoY);

    // Photo circle background
    card.append('circle')
      .attr('cx', photoX + PHOTO_R).attr('cy', photoY)
      .attr('r', PHOTO_R)
      .attr('fill', '#f1f5f9')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1);

    const imgUrl = driveUrl(m.photoUrl);
    if (imgUrl) {
      card.append('image')
        .attr('href', imgUrl)
        .attr('x', photoX).attr('y', photoY - PHOTO_R)
        .attr('width', PHOTO_R * 2).attr('height', PHOTO_R * 2)
        .attr('clip-path', `url(#${clipId})`)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .on('error', function () {
          this.remove();
          drawInitial(card, photoX + PHOTO_R, photoY, m, PHOTO_R);
        });
    } else {
      drawInitial(card, photoX + PHOTO_R, photoY, m, PHOTO_R);
    }

    // Name text
    const textX = photoX + PHOTO_R * 2 + 10;
    const name = m.name || '';
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const restName = nameParts.slice(1).join(' ');

    card.append('text')
      .attr('x', textX).attr('y', cy - 6)
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#1e293b')
      .attr('text-transform', 'uppercase')
      .attr('letter-spacing', '0.5px')
      .text(firstName.toUpperCase());

    if (restName) {
      card.append('text')
        .attr('x', textX).attr('y', cy + 9)
        .attr('font-size', '10px')
        .attr('font-weight', '400')
        .attr('font-style', 'italic')
        .attr('fill', '#64748b')
        .text(restName);
    }

    if (isDec) {
      card.selectAll('rect').style('opacity', 0.7);
    }
  }

  function drawInitial(container, cx, cy, m, r) {
    const colors = { male: '#1e40af', female: '#9d174d', other: '#4c1d95', '': '#1e293b' };
    const gender = (m.gender || '').toLowerCase();
    container.append('circle')
      .attr('cx', cx).attr('cy', cy)
      .attr('r', r - 1)
      .attr('fill', colors[gender] || colors['']);
    container.append('text')
      .attr('x', cx).attr('y', cy)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#e2e8f0')
      .text((m.name || '?')[0].toUpperCase());
  }

  function drawOrthogonalLinks(hierarchy, cx, spouseOf, spouseOnly) {
    const COUPLE_OFFSET = (CARD_W + SPOUSE_GAP) / 2;

    hierarchy.links().forEach(link => {
      const sx = link.source.x - cx;
      const sy = link.source.y + CARD_H / 2;
      const tx = link.target.x - cx;
      const ty = link.target.y - CARD_H / 2;

      // If source has a spouse, start from midpoint of couple
      const srcId = link.source.data.origId;
      let startX = sx;
      if (spouseOf[srcId] && spouseOnly.has(spouseOf[srcId])) {
        startX = sx + COUPLE_OFFSET / 2;
      }

      const midY = sy + (ty - sy) * 0.4;

      const path = `M${startX},${sy} L${startX},${midY} L${tx},${midY} L${tx},${ty}`;

      g.append('path')
        .attr('class', 'tree-link')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1.5);
    });
  }

  function drawSpouseCards(nodes, cx, byId, spouseOf, spouseOnly) {
    const drawn = new Set();

    nodes.forEach(nd => {
      const id = nd.data.origId;
      const sid = spouseOf[id];
      if (!sid || !spouseOnly.has(sid)) return;
      const key = [id, sid].sort().join('_');
      if (drawn.has(key)) return;
      drawn.add(key);

      const spouse = byId[sid];
      if (!spouse) return;

      const px = nd.x - cx;
      const py = nd.y;

      // Position spouse card to the left of the primary
      const spouseX = px - CARD_W / 2 - SPOUSE_GAP - CARD_W / 2 + 5;

      // Horizontal connector between cards
      const lineY = py;
      const lineX1 = px - CARD_W / 2;
      const lineX2 = spouseX + CARD_W / 2 - 5;

      g.append('line')
        .attr('class', 'spouse-connector')
        .attr('x1', lineX2).attr('y1', lineY)
        .attr('x2', lineX1).attr('y2', lineY)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1.5);

      drawCard(spouse, spouseX, py, true);
    });
  }

  function hasVisibleChildren(origId, data, spouseOnly) {
    return data.some(child =>
      !spouseOnly.has(child.id) &&
      (child.fatherId === origId || child.motherId === origId)
    );
  }

  function drawCollapseBtn(cx, cy, origId) {
    const isCollapsed = collapsedNodes.has(origId);
    const btnY = cy + CARD_H / 2 + 12;

    const btn = g.append('g')
      .attr('class', 'collapse-btn')
      .attr('transform', `translate(${cx}, ${btnY})`)
      .attr('cursor', 'pointer')
      .on('click', (e) => {
        e.stopPropagation();
        if (collapsedNodes.has(origId)) {
          collapsedNodes.delete(origId);
        } else {
          collapsedNodes.add(origId);
        }
        render(currentData);
      });

    btn.append('circle')
      .attr('r', 9)
      .attr('fill', '#f8fafc')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1);

    btn.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#64748b')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .text(isCollapsed ? '+' : '−');
  }

  function pruneCollapsed(node) {
    if (!node.children) return;
    if (collapsedNodes.has(node.data.origId)) {
      node._children = node.children;
      node.children = null;
      return;
    }
    node.children.forEach(c => pruneCollapsed(c));
  }

  function buildStratData(data, byId, rootId, spouseOnly) {
    const result = [];
    const visited = new Set();

    function visit(id, parentSid) {
      if (visited.has(id)) return;
      if (spouseOnly.has(id)) return;
      visited.add(id);
      const m = byId[id];
      if (!m) return;
      const sid = `n_${id}`;
      result.push({ sid, parentSid, origId: id });
      data.forEach(child => {
        if (child.fatherId === id || (!child.fatherId && child.motherId === id)) {
          visit(child.id, sid);
        }
      });
    }

    visit(rootId, null);

    data.forEach(d => {
      if (!visited.has(d.id) && !spouseOnly.has(d.id)) {
        result.push({ sid: `n_${d.id}`, parentSid: `n_${rootId}`, origId: d.id });
      }
    });

    return result;
  }

  function highlightPath(ids) {
    g.selectAll('.tree-card').each(function () {
      const el = d3.select(this);
      el.classed('highlighted', false);
    });
  }

  function focusNode(id) {
    // Find the card for this id by scanning
    const allCards = g.selectAll('.tree-card');
    let found = null;
    allCards.each(function () {
      const el = d3.select(this);
      const rect = el.select('rect');
      if (rect.empty()) return;
    });

    // Use the hierarchy data to find position
    if (!currentData) return;
    const byId = {};
    currentData.forEach(d => byId[d.id] = d);

    const W = svg.node().clientWidth;
    const H = parseFloat(svg.attr('height'));
    svg.transition().duration(600).call(
      zoom.transform,
      d3.zoomIdentity.translate(W / 2, H / 2).scale(0.8)
    );
  }

  return { init, render, highlightPath, focusNode, driveUrl };
})();
