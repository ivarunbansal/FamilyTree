/* =====================================================================
   tree-d3.js — Family tree rendering with D3 v7
   ===================================================================== */

const FamilyTreeRenderer = (() => {
  let svg, g, zoom, members = [], onNodeClick = null;
  let collapsedNodes = new Set();
  let currentData = null, currentById = null, currentRootId = null;

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
    const H = 600;

    svg = d3.select(`#${containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', H)
      .style('font-family', 'Inter, sans-serif');

    svg.append('defs');

    zoom = d3.zoom()
      .scaleExtent([0.2, 3])
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
    currentById = byId;

    // Build spouse lookup (bidirectional)
    const spouseOf = {};
    data.forEach(d => {
      if (d.spouseId) {
        spouseOf[d.id] = d.spouseId;
        spouseOf[d.spouseId] = d.id;
      }
    });

    // Married-in members: no fatherId/motherId, have a spouseId set,
    // and no children through the father line (children use fatherId for tree structure).
    const hasFatherChildren = new Set();
    data.forEach(d => { if (d.fatherId) hasFatherChildren.add(d.fatherId); });

    const spouseOnly = new Set();
    data.forEach(d => {
      if (!d.fatherId && !d.motherId && d.spouseId && !hasFatherChildren.has(d.id)) {
        spouseOnly.add(d.id);
      }
    });

    // Find root — pick the person in the lowest generation who isn't spouse-only
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
    currentRootId = rootId;

    // Build stratify data excluding spouse-only members
    const stratData = buildStratData(data, byId, rootId, spouseOnly);
    if (!stratData.length) return;

    try {
      const hierarchy = d3.stratify()
        .id(d => d.sid)
        .parentId(d => d.parentSid)
        (stratData);

      // Apply collapse: remove children of collapsed nodes
      pruneCollapsed(hierarchy);

      const treeLayout = d3.tree()
        .nodeSize([140, 160])
        .separation((a, b) => a.parent === b.parent ? 1.3 : 1.8);

      treeLayout(hierarchy);

      const nodes = hierarchy.descendants();
      const minX = d3.min(nodes, d => d.x);
      const maxX = d3.max(nodes, d => d.x);
      const cx = (maxX + minX) / 2;

      // Draw links — if parent has a spouse, link starts from couple midpoint
      const SPOUSE_OFFSET = 70;
      const coupleMidX = {};
      nodes.forEach(nd => {
        const id = nd.data.origId;
        if (spouseOf[id] && spouseOnly.has(spouseOf[id])) {
          coupleMidX[id] = nd.x + SPOUSE_OFFSET / 2;
        }
      });

      g.selectAll('.link')
        .data(hierarchy.links())
        .join('path')
        .attr('class', 'link')
        .attr('d', d => {
          const srcId = d.source.data.origId;
          const srcX = (coupleMidX[srcId] != null ? coupleMidX[srcId] : d.source.x) - cx;
          const srcY = d.source.y;
          const tgtX = d.target.x - cx;
          const tgtY = d.target.y;
          const midY = (srcY + tgtY) / 2;
          return `M${srcX},${srcY} C${srcX},${midY} ${tgtX},${midY} ${tgtX},${tgtY}`;
        });

      // Draw primary nodes
      const nodeG = g.selectAll('.node')
        .data(nodes)
        .join('g')
        .attr('class', d => {
          const m = byId[d.data.origId];
          if (!m) return 'node';
          const gender = (m.gender || '').toLowerCase();
          const dec = m.dod ? 'deceased' : '';
          return `node ${gender} ${dec}`.trim();
        })
        .attr('transform', d => `translate(${d.x - cx},${d.y})`)
        .attr('cursor', 'pointer')
        .on('click', (e, d) => {
          if (onNodeClick && d.data.origId) onNodeClick(d.data.origId);
        });

      const R = 32;

      nodeG.append('circle').attr('r', R).attr('fill', '#fff');

      nodeG.each(function(d) {
        const m = byId[d.data.origId];
        if (!m) return;
        renderPhoto(d3.select(this), m, R);
      });

      nodeG.append('circle')
        .attr('r', R)
        .attr('fill', 'none')
        .attr('stroke-width', 3);

      nodeG.append('text')
        .attr('class', 'node-name')
        .attr('y', R + 16)
        .text(d => shortName(byId[d.data.origId]));

      nodeG.append('text')
        .attr('class', 'node-sub')
        .attr('y', R + 28)
        .text(d => {
          const m = byId[d.data.origId];
          if (!m) return '';
          if (m.dob) return m.dob.toString().slice(-4);
          if (m.occupation) return m.occupation.slice(0, 14);
          return '';
        });

      // Draw spouse nodes beside their partners
      drawSpousePairs(data, nodes, cx, byId, spouseOf, spouseOnly);

      // Collapse/expand toggle buttons
      addCollapseButtons(nodeG, nodes, byId, data, spouseOnly, cx, R);

      // Center and auto-fit tree
      const svgEl = svg.node();
      const W = svgEl.clientWidth || 900;
      const H = parseFloat(svg.attr('height'));
      const treeWidth = (maxX - minX) + SPOUSE_OFFSET + 100;
      const treeHeight = (d3.max(nodes, d => d.y) || 0) + 120;
      const scaleX = W / Math.max(treeWidth, 1);
      const scaleY = H / Math.max(treeHeight, 1);
      const autoScale = Math.max(Math.min(scaleX, scaleY, 1), 0.35);
      svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, 40).scale(autoScale));

    } catch (e) {
      console.warn('Tree render error:', e);
    }
  }

  function shortName(m) {
    if (!m) return '';
    const parts = (m.name || '').split(' ');
    return parts.length > 2 ? parts[0] + ' ' + parts[parts.length - 1] : m.name;
  }

  function renderPhoto(nd, m, R) {
    const imgUrl = driveUrl(m.photoUrl);
    const clipId = `clip-${m.id}`;
    svg.select('defs').append('clipPath')
      .attr('id', clipId)
      .append('circle')
      .attr('r', R - 3).attr('cx', 0).attr('cy', 0);

    if (imgUrl) {
      nd.append('image')
        .attr('href', imgUrl)
        .attr('x', -(R - 3)).attr('y', -(R - 3))
        .attr('width', (R - 3) * 2).attr('height', (R - 3) * 2)
        .attr('clip-path', `url(#${clipId})`)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .on('error', function () {
          this.remove();
          showInitial(nd, m, R);
        });
    } else {
      showInitial(nd, m, R);
    }
  }

  function showInitial(nd, m, R) {
    const colors = { male: '#1e40af', female: '#9d174d', other: '#4c1d95', '': '#1e293b' };
    const gender = (m.gender || '').toLowerCase();
    nd.append('circle')
      .attr('r', R - 3)
      .attr('fill', colors[gender] || colors['']);
    nd.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('font-family', 'Playfair Display, serif')
      .attr('fill', '#e2d9cc')
      .text(() => (m.name || '?')[0].toUpperCase());
  }

  function drawSpousePairs(data, nodes, cx, byId, spouseOf, spouseOnly) {
    const drawn = new Set();
    const OFFSET = 70;

    nodes.forEach(nd => {
      const id = nd.data.origId;
      const sid = spouseOf[id];
      if (!sid) return;
      const key = [id, sid].sort().join('_');
      if (drawn.has(key)) return;
      drawn.add(key);

      const spouse = byId[sid];
      if (!spouse) return;

      const px = nd.x - cx;
      const py = nd.y;
      const sx = px + OFFSET;
      const sy = py;

      // Spouse connector line
      g.insert('line', 'g')
        .attr('class', 'spouse-link')
        .attr('x1', px).attr('y1', py)
        .attr('x2', sx).attr('y2', sy);

      // Render spouse node
      const R = 28;
      const gender = (spouse.gender || '').toLowerCase();
      const dec = spouse.dod ? 'deceased' : '';
      const spG = g.append('g')
        .attr('class', `node spouse-node ${gender} ${dec}`.trim())
        .attr('transform', `translate(${sx},${sy})`)
        .attr('cursor', 'pointer')
        .on('click', () => { if (onNodeClick) onNodeClick(sid); });

      spG.append('circle').attr('r', R).attr('fill', '#fff');
      renderPhoto(spG, spouse, R);
      spG.append('circle').attr('r', R).attr('fill', 'none').attr('stroke-width', 2.5);

      spG.append('text')
        .attr('class', 'node-name')
        .attr('y', R + 14)
        .attr('font-size', '11px')
        .text(shortName(spouse));
    });
  }

  function hasVisibleChildren(origId, data, spouseOnly) {
    return data.some(child =>
      !spouseOnly.has(child.id) &&
      (child.fatherId === origId || child.motherId === origId)
    );
  }

  function addCollapseButtons(nodeG, nodes, byId, data, spouseOnly, cx, R) {
    nodeG.each(function (d) {
      const origId = d.data.origId;
      if (!hasVisibleChildren(origId, data, spouseOnly)) return;

      const nd = d3.select(this);
      const isCollapsed = collapsedNodes.has(origId);
      const btnY = R + 2;

      const btn = nd.append('g')
        .attr('class', 'collapse-btn')
        .attr('transform', `translate(0, ${btnY})`)
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
        .attr('r', 10)
        .attr('fill', 'var(--surface-2, #1e293b)')
        .attr('stroke', 'var(--gold, #c9a84c)')
        .attr('stroke-width', 1.5);

      btn.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', 'var(--gold, #c9a84c)')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .text(isCollapsed ? '+' : '−');

      // Shift name/sub labels down to make room
      nd.selectAll('.node-name').attr('y', R + 28);
      nd.selectAll('.node-sub').attr('y', R + 40);
    });
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

    // Fallback for unvisited non-spouse members
    data.forEach(d => {
      if (!visited.has(d.id) && !spouseOnly.has(d.id)) {
        result.push({ sid: `n_${d.id}`, parentSid: `n_${rootId}`, origId: d.id });
      }
    });

    return result;
  }

  function highlightPath(ids) {
    g.selectAll('.node').classed('highlighted', d => d.data && ids.includes(d.data.origId));
    g.selectAll('.link').classed('highlighted', d =>
      ids.includes(d.source.data.origId) && ids.includes(d.target.data.origId)
    );
  }

  function focusNode(id) {
    const node = g.selectAll('.node').filter(d => d.data && d.data.origId === id);
    if (!node.empty()) {
      const d = node.datum();
      const W = svg.node().clientWidth;
      const H = parseFloat(svg.attr('height'));
      const nodes = g.selectAll('.node').data();
      const minX = d3.min(nodes, n => n.x);
      const maxX = d3.max(nodes, n => n.x);
      const cx = (maxX + minX) / 2;
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(W / 2 - (d.x - cx), H / 2 - d.y).scale(1)
      );
    }
  }

  return { init, render, highlightPath, focusNode, driveUrl };
})();
