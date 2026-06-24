(function () {
  'use strict';

  var NODE_W = 200;
  var NODE_H = 130;
  var SPOUSE_GAP = 28;
  var COUPLE_W = NODE_W * 2 + SPOUSE_GAP;
  var GEN_GAP = 200;
  var PHOTO_R = 24;
  var PAD = 100;

  function emptyPhoto() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%239f7aea'/%3E%3Cstop offset='1' stop-color='%232dd4bf'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='160' height='160' rx='80' fill='url(%23g)'/%3E%3Ccircle cx='80' cy='62' r='28' fill='white' fill-opacity='.88'/%3E%3Cpath d='M38 132c8-28 27-43 42-43s34 15 42 43' fill='white' fill-opacity='.88'/%3E%3C/svg%3E";
  }

  function isDark() {
    return (document.documentElement.dataset.theme || 'dark') !== 'light';
  }

  function theme() {
    var dark = isDark();
    return {
      cardBg: dark ? '#0f172a' : '#ffffff',
      cardBorder: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      accent: '#9f7aea',
      accent2: '#2dd4bf',
      text: dark ? '#f1f5f9' : '#0f172a',
      muted: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
      photoBorder: dark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.12)',
      linkLine: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      linkHl: '#9f7aea',
      spouseLine: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)',
      glow: dark ? 'rgba(159,122,234,0.35)' : 'rgba(159,122,234,0.25)',
      gradFrom: dark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.95)',
      gradVia: dark ? 'rgba(79,70,229,0.18)' : 'rgba(159,122,234,0.06)',
      gradTo: dark ? 'rgba(20,184,166,0.10)' : 'rgba(45,212,191,0.04)',
      genBg: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      genText: dark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)'
    };
  }

  function buildCouples(members, byId) {
    var used = {};
    var couples = [];
    members.forEach(function (m) { used[m.id] = false; });

    members.forEach(function (m) {
      if (used[m.id]) return;
      var sid = m.spouseId;
      if (sid && byId.has(sid) && !used[sid]) {
        used[m.id] = true;
        used[sid] = true;
        couples.push({
          id: m.id + '_' + sid,
          persons: [m, byId.get(sid)],
          children: [],
          parent: null
        });
      }
    });

    members.forEach(function (m) {
      if (!used[m.id]) {
        used[m.id] = true;
        couples.push({
          id: m.id,
          persons: [m],
          children: [],
          parent: null
        });
      }
    });

    couples.forEach(function (couple) {
      couple.persons.forEach(function (parent) {
        members.forEach(function (child) {
          if (child.fatherId !== parent.id && child.motherId !== parent.id) return;
          var cc = couples.find(function (c) {
            return c.persons.some(function (p) { return p.id === child.id; });
          });
          if (cc && !couple.children.includes(cc)) {
            couple.children.push(cc);
            cc.parent = couple;
          }
        });
      });
    });
    return couples;
  }

  function assignGenerations(couples) {
    var roots = couples.filter(function (c) { return !c.parent; });
    var q = roots.map(function (c) { return { c: c, d: 0 }; });
    var seen = new Set();
    while (q.length) {
      var item = q.shift();
      if (seen.has(item.c.id)) continue;
      seen.add(item.c.id);
      item.c.gen = item.d;
      item.c.children.forEach(function (ch) { q.push({ c: ch, d: item.d + 1 }); });
    }
  }

  function buildRoot(couples) {
    var roots = couples.filter(function (c) { return !c.parent; });
    if (roots.length === 1) return roots[0];
    return { id: '__virt__', persons: [], children: roots, virt: true };
  }

  window.renderD3Tree = function (members, opts) {
    opts = opts || {};
    var container = typeof opts.container === 'string'
      ? document.querySelector(opts.container) : opts.container;
    if (!container) return;
    container.innerHTML = '';

    if (!members || !members.length) {
      container.innerHTML = '<div class="empty-tree">No family members to display.</div>';
      return;
    }

    var byId = new Map(members.map(function (m) { return [m.id, m]; }));
    var couples = buildCouples(members, byId);
    assignGenerations(couples);
    var root = buildRoot(couples);

    var hRoot = d3.hierarchy(root, function (d) { return d.children; });
    d3.tree().nodeSize([COUPLE_W + 50, GEN_GAP])(hRoot);

    var nodes = hRoot.descendants().filter(function (d) { return !d.data.virt; });
    var links = hRoot.links().filter(function (l) { return !l.source.data.virt; });

    if (!nodes.length) {
      container.innerHTML = '<div class="empty-tree">Could not build a tree from the data.</div>';
      return;
    }

    var t = theme();
    var soff = NODE_W / 2 + SPOUSE_GAP / 2;

    var xMin = d3.min(nodes, function (d) { return d.x - COUPLE_W / 2; });
    var xMax = d3.max(nodes, function (d) { return d.x + COUPLE_W / 2; });
    var yMin = d3.min(nodes, function (d) { return d.y - NODE_H / 2; });
    var yMax = d3.max(nodes, function (d) { return d.y + NODE_H / 2; });
    var tw = xMax - xMin + PAD * 2;
    var th = yMax - yMin + PAD * 2;

    var cw = container.clientWidth || 800;
    var ch = container.clientHeight || 600;

    var svg = d3.select(container).append('svg')
      .attr('width', cw).attr('height', ch)
      .style('display', 'block').style('cursor', 'grab');

    var defs = svg.append('defs');

    var gid = 'g' + Math.random().toString(36).slice(2);
    var grad = defs.append('linearGradient').attr('id', gid)
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', t.gradFrom);
    grad.append('stop').attr('offset', '60%').attr('stop-color', t.gradVia);
    grad.append('stop').attr('offset', '100%').attr('stop-color', t.gradTo);

    var sid = 'sh' + Math.random().toString(36).slice(2);
    var sh = defs.append('filter').attr('id', sid)
      .attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
    sh.append('feDropShadow').attr('dx', '0').attr('dy', '5')
      .attr('stdDeviation', '10').attr('flood-color', 'rgba(0,0,0,0.25)')
      .attr('flood-opacity', '0.5');

    var hlid = 'hl' + Math.random().toString(36).slice(2);
    var hl = defs.append('filter').attr('id', hlid)
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    hl.append('feDropShadow').attr('dx', '0').attr('dy', '0')
      .attr('stdDeviation', '8').attr('flood-color', t.glow)
      .attr('flood-opacity', '0.8');

    var lgid = 'lg' + Math.random().toString(36).slice(2);
    var lg = defs.append('linearGradient').attr('id', lgid)
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    lg.append('stop').attr('offset', '0%').attr('stop-color', t.accent)
      .attr('stop-opacity', '0.06');
    lg.append('stop').attr('offset', '100%').attr('stop-color', t.accent2)
      .attr('stop-opacity', '0.02');

    var mainG = svg.append('g');

    var maxGen = d3.max(nodes, function (d) { return d.data.gen || 0; }) || 0;

    var genG = mainG.append('g').attr('class', 'gen-markers');
    for (var gi = 0; gi <= maxGen; gi++) {
      var gn = nodes.filter(function (d) { return d.data.gen === gi; });
      if (!gn.length) continue;
      var gy = d3.mean(gn, function (d) { return d.y; });
      genG.append('text')
        .attr('x', xMin - 20).attr('y', gy + 5)
        .attr('text-anchor', 'end').attr('fill', t.genText)
        .attr('font-size', '13px').attr('font-weight', '600')
        .attr('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif')
        .attr('letter-spacing', '1').text('G' + (gi + 1));
      genG.append('line')
        .attr('x1', xMin - 12).attr('y1', gy)
        .attr('x2', xMin - 4).attr('y2', gy)
        .attr('stroke', t.genText).attr('stroke-width', 1);
    }

    var linkG = mainG.append('g').attr('class', 'links');
    var nodeG = mainG.append('g').attr('class', 'nodes');

    linkG.selectAll('.tree-link')
      .data(links).enter().append('path')
      .attr('class', function (l) {
        var c = 'tree-link';
        if (opts.selectedPath && opts.selectedPath.length) {
          var s = l.source.data.persons.some(function (p) { return opts.selectedPath.indexOf(p.id) !== -1; });
          var t2 = l.target.data.persons.some(function (p) { return opts.selectedPath.indexOf(p.id) !== -1; });
          if (s && t2) c += ' hl';
        }
        return c;
      })
      .attr('d', function (l) {
        var sx = l.source.x, sy = l.source.y + NODE_H / 2;
        var tx = l.target.x, ty = l.target.y - NODE_H / 2;
        return 'M' + sx + ',' + sy + 'C' + sx + ',' + ((sy + ty) / 2) + ' ' + tx + ',' + ((sy + ty) / 2) + ' ' + tx + ',' + ty;
      })
      .attr('fill', 'none')
      .attr('stroke', function () {
        return d3.select(this).classed('hl') ? t.linkHl : t.linkLine;
      })
      .attr('stroke-width', function () {
        return d3.select(this).classed('hl') ? 3 : 2.5;
      })
      .attr('stroke-linecap', 'round');

    var nodeSel = nodeG.selectAll('.couple-node')
      .data(nodes).enter().append('g')
      .attr('class', 'couple-node')
      .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });

    nodeSel.each(function (d) {
      var group = d3.select(this);
      var couple = d.data;
      var isHL = opts.selectedPath && opts.selectedPath.length &&
        couple.persons.some(function (p) { return opts.selectedPath.indexOf(p.id) !== -1; });
      var isRoot = !couple.parent;

      if (isRoot && couple.persons.length === 1 && couple.persons[0] &&
          !couple.persons[0].fatherId && !couple.persons[0].motherId) {
        var rt = group.append('g').attr('class', 'root-badge')
          .attr('transform', 'translate(0,' + (-NODE_H / 2 - 18) + ')');
        rt.append('rect')
          .attr('x', -30).attr('y', -10).attr('width', 60).attr('height', 20)
          .attr('rx', 10).attr('fill', t.accent).attr('opacity', 0.15);
        rt.append('text')
          .attr('x', 0).attr('y', 4).attr('text-anchor', 'middle')
          .attr('fill', t.accent).attr('font-size', '9px').attr('font-weight', '700')
          .attr('font-family', 'Inter, sans-serif')
          .attr('letter-spacing', '0.5').text('ROOT');
      }

      couple.persons.forEach(function (person, idx) {
        var xOff = couple.persons.length > 1 ? (idx === 0 ? -soff : soff) : 0;

        var pG = group.append('g')
          .attr('class', 'person-node')
          .attr('transform', 'translate(' + xOff + ',0)')
          .style('cursor', 'pointer');

        var filt = isHL ? 'url(#' + hlid + ')' : 'url(#' + sid + ')';

        pG.append('rect')
          .attr('class', 'pb')
          .attr('x', -NODE_W / 2).attr('y', -NODE_H / 2)
          .attr('width', NODE_W).attr('height', NODE_H)
          .attr('rx', 10).attr('ry', 10)
          .attr('fill', t.cardBg)
          .attr('stroke', isHL ? t.accent : t.cardBorder)
          .attr('stroke-width', isHL ? 2 : 1)
          .attr('filter', filt);

        pG.append('rect')
          .attr('x', -NODE_W / 2).attr('y', -NODE_H / 2)
          .attr('width', NODE_W).attr('height', NODE_H)
          .attr('rx', 10).attr('ry', 10)
          .attr('fill', 'url(#' + gid + ')');

        pG.append('rect')
          .attr('x', -NODE_W / 2).attr('y', NODE_H / 2 - 40)
          .attr('width', NODE_W).attr('height', 40)
          .attr('fill', 'url(#' + lgid + ')');

        var cid = 'cp' + person.id + Math.random().toString(36).slice(2);
        defs.append('clipPath').attr('id', cid)
          .append('circle').attr('cx', 0)
          .attr('cy', -NODE_H / 2 + PHOTO_R + 10)
          .attr('r', PHOTO_R);

        pG.append('image')
          .attr('preserveAspectRatio', 'xMidYMid slice')
          .attr('clip-path', 'url(#' + cid + ')')
          .attr('x', -PHOTO_R)
          .attr('y', -NODE_H / 2 + 10)
          .attr('width', PHOTO_R * 2)
          .attr('height', PHOTO_R * 2)
          .attr('href', person.photoUrl || emptyPhoto());

        pG.append('circle')
          .attr('cx', 0)
          .attr('cy', -NODE_H / 2 + PHOTO_R + 10)
          .attr('r', PHOTO_R + 1.5)
          .attr('fill', 'none')
          .attr('stroke', t.photoBorder)
          .attr('stroke-width', 2.5);

        var nm = person.name || 'Unknown';
        if (nm.length > 20) nm = nm.slice(0, 18) + '\u2026';

        pG.append('text')
          .attr('x', 0)
          .attr('y', -NODE_H / 2 + PHOTO_R * 2 + 26)
          .attr('text-anchor', 'middle')
          .attr('fill', t.text)
          .attr('font-size', '14px')
          .attr('font-weight', '700')
          .attr('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif')
          .text(nm);

        var genLabel = '';
        if (person.generation) genLabel = 'Gen ' + person.generation;
        else if (d.data.gen !== undefined) genLabel = 'Gen ' + (d.data.gen + 1);
        else genLabel = '';

        var parts = [];
        if (person.city) parts.push(person.city);
        if (genLabel) parts.push(genLabel);
        var dt = parts.join('  \u00b7  ');

        if (dt) {
          pG.append('text')
            .attr('x', 0)
            .attr('y', -NODE_H / 2 + PHOTO_R * 2 + 44)
            .attr('text-anchor', 'middle')
            .attr('fill', t.muted)
            .attr('font-size', '11px')
            .attr('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif')
            .text(dt);
        }

        if (person.occupation) {
          var occ = person.occupation;
          if (occ.length > 22) occ = occ.slice(0, 20) + '\u2026';
          pG.append('text')
            .attr('x', 0)
            .attr('y', -NODE_H / 2 + PHOTO_R * 2 + 58)
            .attr('text-anchor', 'middle')
            .attr('fill', t.muted)
            .attr('font-size', '10px')
            .attr('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif')
            .text(occ);
        }

        pG.on('click', function () {
          if (opts.onNodeClick) opts.onNodeClick(person);
        });
      });

      if (couple.persons.length > 1) {
        var lx1 = -soff + NODE_W / 2 + 4;
        var lx2 = soff - NODE_W / 2 - 4;
        var my2 = 0;

        group.append('line')
          .attr('x1', lx1).attr('y1', my2 - 3)
          .attr('x2', lx2).attr('y2', my2 - 3)
          .attr('stroke', t.spouseLine).attr('stroke-width', 1.5);

        group.append('line')
          .attr('x1', lx1).attr('y1', my2 + 3)
          .attr('x2', lx2).attr('y2', my2 + 3)
          .attr('stroke', t.spouseLine).attr('stroke-width', 1.5);

        group.append('circle')
          .attr('cx', 0).attr('cy', my2)
          .attr('r', 8)
          .attr('fill', t.cardBg)
          .attr('stroke', t.spouseLine)
          .attr('stroke-width', 1.5);

        group.append('text')
          .attr('x', 0).attr('y', my2 + 3.5)
          .attr('text-anchor', 'middle')
          .attr('fill', t.spouseLine)
          .attr('font-size', '8px')
          .attr('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif')
          .text('\u2665');
      }
    });

    nodeSel.selectAll('.person-node')
      .on('mouseenter', function () {
        d3.select(this).select('.pb')
          .transition().duration(120)
          .attr('stroke', t.accent).attr('stroke-width', 2)
          .attr('filter', 'url(#' + hlid + ')');
      })
      .on('mouseleave', function () {
        var d = d3.select(this.parentNode).datum();
        var hl = opts.selectedPath && opts.selectedPath.length &&
          d.data.persons.some(function (p) { return opts.selectedPath.indexOf(p.id) !== -1; });
        d3.select(this).select('.pb')
          .transition().duration(120)
          .attr('stroke', hl ? t.accent : t.cardBorder)
          .attr('stroke-width', hl ? 2 : 1)
          .attr('filter', hl ? 'url(#' + hlid + ')' : 'url(#' + sid + ')');
      });

    var zoom = d3.zoom()
      .scaleExtent([0.08, 8])
      .on('start', function () { svg.style('cursor', 'grabbing'); })
      .on('end', function () { svg.style('cursor', 'grab'); })
      .on('zoom', function (e) { mainG.attr('transform', e.transform); });

    svg.call(zoom);

    var s = Math.min((cw - PAD * 2) / tw, (ch - PAD * 2) / th, 2.5);
    var tx = PAD - xMin * s;
    var ty = PAD - yMin * s;

    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(s));

    return {
      fitToScreen: function () {
        var cw2 = container.clientWidth || 800;
        var ch2 = container.clientHeight || 600;
        var s2 = Math.min((cw2 - PAD * 2) / tw, (ch2 - PAD * 2) / th, 2.5);
        var tx2 = PAD - xMin * s2;
        var ty2 = PAD - yMin * s2;
        svg.transition().duration(400).call(
          zoom.transform, d3.zoomIdentity.translate(tx2, ty2).scale(s2)
        );
      }
    };
  };
})();
