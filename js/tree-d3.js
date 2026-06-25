/* =====================================================================
   tree-d3.js — Family tree rendering with D3 v7
   ===================================================================== */

const FamilyTreeRenderer = (() => {
  let svg, g, zoom, members = [], onNodeClick = null;

  // Convert Google Drive share URL to direct image URL
  function driveUrl(url) {
    if (!url) return null;
    // https://drive.google.com/file/d/FILE_ID/view
    const m = url.match(/\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
    // Already direct or other host
    return url;
  }

  function init(containerId, clickCallback) {
    onNodeClick = clickCallback;
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const W = container.clientWidth || 900;
    const H = 600;

    svg = d3.select(`#${containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', H)
      .style('font-family', 'Inter, sans-serif');

    // Defs: clip paths for circular photos will be added per node
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
    g.selectAll('*').remove();

    if (!data || !data.length) return;

    // Build tree hierarchy: pick person with no father & no mother as root
    // If multiple roots, use first generation 1 or first entry
    const byId = {};
    data.forEach(d => byId[d.id] = d);

    // Find root candidates
    const childIds = new Set();
    data.forEach(d => {
      if (d.fatherId) childIds.add(d.fatherId);
      if (d.motherId) childIds.add(d.motherId);
    });

    // Build parent-child map
    const childrenMap = {};
    data.forEach(d => {
      const pid = d.fatherId || d.motherId;
      if (pid) {
        if (!childrenMap[pid]) childrenMap[pid] = [];
        childrenMap[pid].push(d.id);
      }
    });

    // Find topmost ancestor
    let rootId = null;
    // Prefer gen 1
    const gen1 = data.filter(d => String(d.generation) === '1');
    if (gen1.length) rootId = gen1[0].id;
    else {
      // person who is not a child of anyone
      const notChild = data.filter(d => !childIds.has(d.id));
      if (notChild.length) rootId = notChild[0].id;
      else rootId = data[0].id;
    }

    // Build stratify-able flat list
    const stratData = buildStratData(data, byId, rootId);
    if (!stratData.length) return;

    try {
      const hierarchy = d3.stratify()
        .id(d => d.sid)
        .parentId(d => d.parentSid)
        (stratData);

      const treeLayout = d3.tree()
        .nodeSize([120, 140])
        .separation((a, b) => a.parent === b.parent ? 1.3 : 1.8);

      treeLayout(hierarchy);

      // Center
      const nodes = hierarchy.descendants();
      const minX = d3.min(nodes, d => d.x);
      const maxX = d3.max(nodes, d => d.x);
      const cx = (maxX + minX) / 2;

      // Draw links
      const linkGen = d3.linkVertical()
        .x(d => d.x - cx)
        .y(d => d.y);

      g.selectAll('.link')
        .data(hierarchy.links())
        .join('path')
        .attr('class', 'link')
        .attr('d', d => linkGen({ source: d.source, target: d.target }));

      // Draw spouse dashes
      drawSpouseLinks(data, nodes, cx, byId);

      // Draw nodes
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

      // Circle background
      nodeG.append('circle')
        .attr('r', R)
        .attr('fill', '#fff');

      // Photo or initial
      nodeG.each(function(d) {
        const m = byId[d.data.origId];
        if (!m) return;
        const nd = d3.select(this);
        const imgUrl = driveUrl(m.photoUrl);
        const clipId = `clip-${m.id}`;

        // Add clipPath
        svg.select('defs').append('clipPath')
          .attr('id', clipId)
          .append('circle')
          .attr('r', R - 3)
          .attr('cx', 0).attr('cy', 0);

        if (imgUrl) {
          nd.append('image')
            .attr('href', imgUrl)
            .attr('x', -(R-3)).attr('y', -(R-3))
            .attr('width', (R-3)*2).attr('height', (R-3)*2)
            .attr('clip-path', `url(#${clipId})`)
            .attr('preserveAspectRatio', 'xMidYMid slice')
            .on('error', function() {
              // On image error, show initial
              this.remove();
              showInitial(nd, m, R);
            });
        } else {
          showInitial(nd, m, R);
        }
      });

      // Outer ring
      nodeG.append('circle')
        .attr('r', R)
        .attr('fill', 'none')
        .attr('stroke-width', 3);

      // Name label
      nodeG.append('text')
        .attr('class', 'node-name')
        .attr('y', R + 16)
        .text(d => {
          const m = byId[d.data.origId];
          if (!m) return '';
          const parts = (m.name || '').split(' ');
          return parts.length > 2 ? parts[0] + ' ' + parts[parts.length-1] : m.name;
        });

      // Sub label (year or occupation)
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

      // Center tree on load
      const svgEl = svg.node();
      const W = svgEl.clientWidth || 900;
      const H = parseFloat(svg.attr('height'));
      svg.call(zoom.transform, d3.zoomIdentity.translate(W/2, 60).scale(1));

    } catch(e) {
      console.warn('Tree render error:', e);
    }
  }

  function showInitial(nd, m, R) {
    const colors = {male:'#1e40af', female:'#9d174d', other:'#4c1d95', '':'#1e293b'};
    const gender = (m.gender||'').toLowerCase();
    nd.append('circle')
      .attr('r', R-3)
      .attr('fill', colors[gender] || colors['']);
    nd.append('text')
      .attr('text-anchor','middle')
      .attr('dominant-baseline','central')
      .attr('font-size', '18px')
      .attr('font-weight','600')
      .attr('font-family','Playfair Display, serif')
      .attr('fill','#e2d9cc')
      .text(() => (m.name||'?')[0].toUpperCase());
  }

  function drawSpouseLinks(data, nodes, cx, byId) {
    const drawn = new Set();
    data.forEach(d => {
      if (!d.spouseId) return;
      const key = [d.id, d.spouseId].sort().join('_');
      if (drawn.has(key)) return;
      drawn.add(key);
      const na = nodes.find(n => n.data.origId === d.id);
      const nb = nodes.find(n => n.data.origId === d.spouseId);
      if (!na || !nb) return;
      g.insert('line','g')
        .attr('class','spouse-link')
        .attr('x1', na.x - cx).attr('y1', na.y)
        .attr('x2', nb.x - cx).attr('y2', nb.y);
    });
  }

  function buildStratData(data, byId, rootId) {
    // Simple flat tree: father → children; if no father, mother → children
    const result = [];
    const visited = new Set();

    function visit(id, parentSid) {
      if (visited.has(id)) return;
      visited.add(id);
      const m = byId[id];
      if (!m) return;
      const sid = `n_${id}`;
      result.push({ sid, parentSid, origId: id });
      // Visit children
      data.forEach(child => {
        if (child.fatherId === id || (!child.fatherId && child.motherId === id)) {
          visit(child.id, sid);
        }
      });
    }

    visit(rootId, null);

    // Add any unvisited members as children of root (data integrity fallback)
    data.forEach(d => {
      if (!visited.has(d.id)) {
        result.push({ sid: `n_${d.id}`, parentSid: `n_${rootId}`, origId: d.id });
      }
    });

    return result;
  }

  function highlightPath(ids) {
    g.selectAll('.node').classed('highlighted', d => ids.includes(d.data.origId));
    g.selectAll('.link').classed('highlighted', d =>
      ids.includes(d.source.data.origId) && ids.includes(d.target.data.origId)
    );
  }

  function focusNode(id) {
    const node = g.selectAll('.node').filter(d => d.data.origId === id);
    if (!node.empty()) {
      const d = node.datum();
      const W = svg.node().clientWidth;
      const H = parseFloat(svg.attr('height'));
      // Get current cx offset
      const nodes = g.selectAll('.node').data();
      const minX = d3.min(nodes, n => n.x);
      const maxX = d3.max(nodes, n => n.x);
      const cx = (maxX + minX) / 2;
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(W/2 - (d.x - cx), H/2 - d.y).scale(1)
      );
    }
  }

  return { init, render, highlightPath, focusNode, driveUrl };
})();
