import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMembers } from '../hooks/useMembers';
import { SearchBar } from '../components/SearchBar';
import { buildCouples, assignGenerations, shortestPath } from '../utils/helpers';
import type { FamilyMember, TreeCouple } from '../types';

const NODE_W = 200;
const NODE_H = 130;
const SPOUSE_GAP = 28;
const COUPLE_W = NODE_W * 2 + SPOUSE_GAP;
const GEN_GAP = 200;
const PHOTO_R = 24;
const PAD = 100;

export function Tree() {
  const { members, loading, stats } = useMembers();
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [personA, setPersonA] = useState('');
  const [personB, setPersonB] = useState('');
  const [relationshipResult, setRelationshipResult] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current || members.length === 0) return;

    const container = containerRef.current;
    const svg = svgRef.current;

    const couples = buildCouples(members);
    assignGenerations(couples);

    const roots = couples.filter((c) => !c.parent);
    const root: TreeCouple =
      roots.length === 1
        ? roots[0]
        : { id: '__virt__', persons: [], children: roots, virt: true, parent: null, gen: 0 };

    const byIdMap = new Map(members.map((m) => [m.id, m]));

    const hRoot = d3hierarchy(root, (d: TreeCouple) => d.children);
    d3tree().nodeSize([COUPLE_W + 50, GEN_GAP])(hRoot);

    const nodes = hRoot.descendants().filter((d: { data: TreeCouple }) => !d.data.virt);
    const links = hRoot.links().filter(
      (l: { source: { data: TreeCouple } }) => !l.source.data.virt
    );

    if (nodes.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const t = {
      cardBg: isDark ? '#0f172a' : '#ffffff',
      cardBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      accent: '#9f7aea',
      text: isDark ? '#f1f5f9' : '#0f172a',
      muted: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
      photoBorder: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.12)',
      linkLine: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      linkHl: '#9f7aea',
      spouseLine: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)',
      glow: 'rgba(159,122,234,0.35)',
      genText: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)',
    };

    const soff = NODE_W / 2 + SPOUSE_GAP / 2;

    const xMin = d3min(nodes, (d: { x: number }) => d.x - COUPLE_W / 2);
    const xMax = d3max(nodes, (d: { x: number }) => d.x + COUPLE_W / 2);
    const yMin = d3min(nodes, (d: { y: number }) => d.y - NODE_H / 2);
    const yMax = d3max(nodes, (d: { y: number }) => d.y + NODE_H / 2);
    const tw = xMax - xMin + PAD * 2;
    const th = yMax - yMin + PAD * 2;
    const cw = container.clientWidth || 800;
    const ch = container.clientHeight || 600;

    svg.setAttribute('width', String(cw));
    svg.setAttribute('height', String(ch));
    svg.style.display = 'block';
    svg.style.cursor = 'grab';

    const ns = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const defs = document.createElementNS(ns, 'defs');
    svg.appendChild(defs);

    const gid = 'g' + Math.random().toString(36).slice(2);
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.id = gid;
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%');
    grad.setAttribute('y2', '100%');
    const s1 = document.createElementNS(ns, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', t.cardBg);
    const s2 = document.createElementNS(ns, 'stop');
    s2.setAttribute('offset', '60%');
    s2.setAttribute('stop-color', isDark ? 'rgba(79,70,229,0.18)' : 'rgba(159,122,234,0.06)');
    const s3 = document.createElementNS(ns, 'stop');
    s3.setAttribute('offset', '100%');
    s3.setAttribute('stop-color', isDark ? 'rgba(20,184,166,0.10)' : 'rgba(45,212,191,0.04)');
    grad.append(s1, s2, s3);
    defs.appendChild(grad);

    const filterId = 'sh' + Math.random().toString(36).slice(2);
    const filterEl = document.createElementNS(ns, 'filter');
    filterEl.id = filterId;
    filterEl.setAttribute('x', '-30%');
    filterEl.setAttribute('y', '-30%');
    filterEl.setAttribute('width', '160%');
    filterEl.setAttribute('height', '160%');
    const fe = document.createElementNS(ns, 'feDropShadow');
    fe.setAttribute('dx', '0');
    fe.setAttribute('dy', '5');
    fe.setAttribute('stdDeviation', '10');
    fe.setAttribute('flood-color', 'rgba(0,0,0,0.25)');
    fe.setAttribute('flood-opacity', '0.5');
    filterEl.appendChild(fe);
    defs.appendChild(filterEl);

    const hlId = 'hl' + Math.random().toString(36).slice(2);
    const hlFilter = document.createElementNS(ns, 'filter');
    hlFilter.id = hlId;
    hlFilter.setAttribute('x', '-50%');
    hlFilter.setAttribute('y', '-50%');
    hlFilter.setAttribute('width', '200%');
    hlFilter.setAttribute('height', '200%');
    const hlFe = document.createElementNS(ns, 'feDropShadow');
    hlFe.setAttribute('dx', '0');
    hlFe.setAttribute('dy', '0');
    hlFe.setAttribute('stdDeviation', '8');
    hlFe.setAttribute('flood-color', t.glow);
    hlFe.setAttribute('flood-opacity', '0.8');
    hlFilter.appendChild(hlFe);
    defs.appendChild(hlFilter);

    const mainG = document.createElementNS(ns, 'g');
    svg.appendChild(mainG);

    const maxGen = nodes.reduce(
      (max: number, d: { data: TreeCouple }) => Math.max(max, d.data.gen || 0),
      0
    );

    const genG = document.createElementNS(ns, 'g');
    genG.setAttribute('class', 'gen-markers');
    mainG.appendChild(genG);

    for (let gi = 0; gi <= maxGen; gi++) {
      const gn = nodes.filter((d: { data: TreeCouple }) => d.data.gen === gi);
      if (!gn.length) continue;
      const gy = gn.reduce((s: number, d: { y: number }) => s + d.y, 0) / gn.length;
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', String(xMin - 20));
      label.setAttribute('y', String(gy + 5));
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', t.genText);
      label.setAttribute('font-size', '13px');
      label.setAttribute('font-weight', '600');
      label.setAttribute('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
      label.textContent = 'G' + (gi + 1);
      genG.appendChild(label);

      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(xMin - 12));
      line.setAttribute('y1', String(gy));
      line.setAttribute('x2', String(xMin - 4));
      line.setAttribute('y2', String(gy));
      line.setAttribute('stroke', t.genText);
      line.setAttribute('stroke-width', '1');
      genG.appendChild(line);
    }

    const linkG = document.createElementNS(ns, 'g');
    linkG.setAttribute('class', 'links');
    mainG.appendChild(linkG);

    links.forEach((l: { source: { x: number; y: number; data: TreeCouple }; target: { x: number; y: number; data: TreeCouple } }) => {
      const path = document.createElementNS(ns, 'path');
      const sx = l.source.x,
        sy = l.source.y + NODE_H / 2;
      const tx = l.target.x,
        ty = l.target.y - NODE_H / 2;
      const d = `M${sx},${sy}C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', t.linkLine);
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-linecap', 'round');
      linkG.appendChild(path);
    });

    const nodeG = document.createElementNS(ns, 'g');
    nodeG.setAttribute('class', 'nodes');
    mainG.appendChild(nodeG);

    nodes.forEach((d: { x: number; y: number; data: TreeCouple }) => {
      const couple = d.data;
      const group = document.createElementNS(ns, 'g');
      group.setAttribute('transform', `translate(${d.x},${d.y})`);
      nodeG.appendChild(group);

      couple.persons.forEach((person: FamilyMember, idx: number) => {
        const xOff = couple.persons.length > 1 ? (idx === 0 ? -soff : soff) : 0;
        const pG = document.createElementNS(ns, 'g');
        pG.setAttribute('transform', `translate(${xOff},0)`);
        pG.style.cursor = 'pointer';
        group.appendChild(pG);

        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', String(-NODE_W / 2));
        rect.setAttribute('y', String(-NODE_H / 2));
        rect.setAttribute('width', String(NODE_W));
        rect.setAttribute('height', String(NODE_H));
        rect.setAttribute('rx', '10');
        rect.setAttribute('ry', '10');
        rect.setAttribute('fill', t.cardBg);
        rect.setAttribute('stroke', t.cardBorder);
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('filter', `url(#${filterId})`);
        pG.appendChild(rect);

        const gradRect = document.createElementNS(ns, 'rect');
        gradRect.setAttribute('x', String(-NODE_W / 2));
        gradRect.setAttribute('y', String(-NODE_H / 2));
        gradRect.setAttribute('width', String(NODE_W));
        gradRect.setAttribute('height', String(NODE_H));
        gradRect.setAttribute('rx', '10');
        gradRect.setAttribute('ry', '10');
        gradRect.setAttribute('fill', `url(#${gid})`);
        pG.appendChild(gradRect);

        const cid = 'cp' + person.id + Math.random().toString(36).slice(2);
        const clip = document.createElementNS(ns, 'clipPath');
        clip.id = cid;
        const cc = document.createElementNS(ns, 'circle');
        cc.setAttribute('cx', '0');
        cc.setAttribute('cy', String(-NODE_H / 2 + PHOTO_R + 10));
        cc.setAttribute('r', String(PHOTO_R));
        clip.appendChild(cc);
        defs.appendChild(clip);

        const img = document.createElementNS(ns, 'image');
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        img.setAttribute('clip-path', `url(#${cid})`);
        img.setAttribute('x', String(-PHOTO_R));
        img.setAttribute('y', String(-NODE_H / 2 + 10));
        img.setAttribute('width', String(PHOTO_R * 2));
        img.setAttribute('height', String(PHOTO_R * 2));
        img.setAttribute('href', person.photo || '');
        img.setAttribute('crossorigin', 'anonymous');
        pG.appendChild(img);

        const cir = document.createElementNS(ns, 'circle');
        cir.setAttribute('cx', '0');
        cir.setAttribute('cy', String(-NODE_H / 2 + PHOTO_R + 10));
        cir.setAttribute('r', String(PHOTO_R + 1.5));
        cir.setAttribute('fill', 'none');
        cir.setAttribute('stroke', t.photoBorder);
        cir.setAttribute('stroke-width', '2.5');
        pG.appendChild(cir);

        const nm = (person.firstName + ' ' + person.lastName).trim() || 'Unknown';
        const nameText = document.createElementNS(ns, 'text');
        nameText.setAttribute('x', '0');
        nameText.setAttribute('y', String(-NODE_H / 2 + PHOTO_R * 2 + 26));
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('fill', t.text);
        nameText.setAttribute('font-size', '14px');
        nameText.setAttribute('font-weight', '700');
        nameText.setAttribute('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
        nameText.textContent = nm.length > 20 ? nm.slice(0, 18) + '\u2026' : nm;
        pG.appendChild(nameText);

        const parts: string[] = [];
        if (person.birthDate) parts.push(person.birthDate);
        if (parts.length > 0) {
          const dt = parts.join('  \u00b7  ');
          const dtText = document.createElementNS(ns, 'text');
          dtText.setAttribute('x', '0');
          dtText.setAttribute('y', String(-NODE_H / 2 + PHOTO_R * 2 + 44));
          dtText.setAttribute('text-anchor', 'middle');
          dtText.setAttribute('fill', t.muted);
          dtText.setAttribute('font-size', '11px');
          dtText.setAttribute('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
          dtText.textContent = dt;
          pG.appendChild(dtText);
        }

        if (person.occupation) {
          let occ = person.occupation;
          if (occ.length > 22) occ = occ.slice(0, 20) + '\u2026';
          const occText = document.createElementNS(ns, 'text');
          occText.setAttribute('x', '0');
          occText.setAttribute('y', String(-NODE_H / 2 + PHOTO_R * 2 + 58));
          occText.setAttribute('text-anchor', 'middle');
          occText.setAttribute('fill', t.muted);
          occText.setAttribute('font-size', '10px');
          occText.setAttribute('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
          occText.textContent = occ;
          pG.appendChild(occText);
        }

        pG.addEventListener('click', () => {
          navigate(`/profile/${person.id}`);
        });
      });

      if (couple.persons.length > 1) {
        const lx1 = -soff + NODE_W / 2 + 4;
        const lx2 = soff - NODE_W / 2 - 4;
        const my2 = 0;

        const sLine1 = document.createElementNS(ns, 'line');
        sLine1.setAttribute('x1', String(lx1));
        sLine1.setAttribute('y1', String(my2 - 3));
        sLine1.setAttribute('x2', String(lx2));
        sLine1.setAttribute('y2', String(my2 - 3));
        sLine1.setAttribute('stroke', t.spouseLine);
        sLine1.setAttribute('stroke-width', '1.5');
        group.appendChild(sLine1);

        const sLine2 = document.createElementNS(ns, 'line');
        sLine2.setAttribute('x1', String(lx1));
        sLine2.setAttribute('y1', String(my2 + 3));
        sLine2.setAttribute('x2', String(lx2));
        sLine2.setAttribute('y2', String(my2 + 3));
        sLine2.setAttribute('stroke', t.spouseLine);
        sLine2.setAttribute('stroke-width', '1.5');
        group.appendChild(sLine2);

        const heartCircle = document.createElementNS(ns, 'circle');
        heartCircle.setAttribute('cx', '0');
        heartCircle.setAttribute('cy', String(my2));
        heartCircle.setAttribute('r', '8');
        heartCircle.setAttribute('fill', t.cardBg);
        heartCircle.setAttribute('stroke', t.spouseLine);
        heartCircle.setAttribute('stroke-width', '1.5');
        group.appendChild(heartCircle);

        const heart = document.createElementNS(ns, 'text');
        heart.setAttribute('x', '0');
        heart.setAttribute('y', String(my2 + 3.5));
        heart.setAttribute('text-anchor', 'middle');
        heart.setAttribute('fill', t.spouseLine);
        heart.setAttribute('font-size', '8px');
        heart.setAttribute('font-family', 'Inter, ui-sans-serif, system-ui, sans-serif');
        heart.textContent = '\u2665';
        group.appendChild(heart);
      }
    });

    const s = Math.min(((cw - PAD * 2) / tw), ((ch - PAD * 2) / th), 2.5);
    const tx = PAD - xMin * s;
    const ty = PAD - yMin * s;

    mainG.setAttribute('transform', `translate(${tx},${ty}) scale(${s})`);
  }, [members, selectedPath, navigate]);

  useEffect(() => {
    if (!loading) renderTree();
  }, [loading, renderTree]);

  useEffect(() => {
    const handleResize = () => renderTree();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderTree]);

  const handleFindRelationship = () => {
    if (!personA || !personB || personA === personB) {
      setRelationshipResult('Choose two different family members.');
      return;
    }
    const path = shortestPath(personA, personB, members);
    if (path.length === 0) {
      setRelationshipResult('No direct relationship path found.');
      return;
    }
    setSelectedPath(path);
    setRelationshipResult(
      path
        .map((id) => {
          const m = members.find((x) => x.id === id);
          return m ? `${m.firstName} ${m.lastName}` : id;
        })
        .join(' \u2192 ')
    );
    renderTree();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading family tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">{stats.totalMembers}</div>
          <div className="text-xs text-gray-400 mt-0.5">Members</div>
        </div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">{stats.totalGenerations}</div>
          <div className="text-xs text-gray-400 mt-0.5">Generations</div>
        </div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">{stats.totalCities}</div>
          <div className="text-xs text-gray-400 mt-0.5">Cities</div>
        </div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="text-2xl font-bold text-white">{stats.totalSurnames}</div>
          <div className="text-xs text-gray-400 mt-0.5">Surnames</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-72 space-y-4">
          <div className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm space-y-3">
            <SearchBar />

            <div className="border-t border-white/10 pt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">From</label>
                <select
                  value={personA}
                  onChange={(e) => setPersonA(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">To</label>
                <select
                  value={personB}
                  onChange={(e) => setPersonB(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleFindRelationship}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-teal-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Show Relationship Path
              </button>
              {relationshipResult && (
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{relationshipResult}</p>
              )}
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 min-h-[600px] rounded-lg border border-white/10 bg-black/20 overflow-hidden relative"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
          }}
        >
          {members.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              No family members to display.
            </div>
          ) : (
            <svg ref={svgRef} className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  );
}

function d3hierarchy(data: TreeCouple, childrenAccessor: (d: TreeCouple) => TreeCouple[]) {
  const root = { data, children: childrenAccessor(data), depth: 0, x: 0, y: 0 };
  function walk(node: typeof root, depth: number) {
    node.depth = depth;
    if (node.children) {
      node.children = node.children.map((child) => {
        const childNode = { data: child, children: childrenAccessor(child), depth: depth + 1, x: 0, y: 0 };
        return childNode;
      });
      node.children.forEach((child) => walk(child, depth + 1));
    }
    return node;
  }
  return walk(root, 0);
}

function d3tree() {
  function layout(node: ReturnType<typeof d3hierarchy>) {
    const nodes: typeof node[] = [];
    function flatten(n: typeof node) {
      nodes.push(n);
      if (n.children) n.children.forEach(flatten);
    }
    flatten(node);

    const nodeSize = [COUPLE_W + 50, GEN_GAP];
    const depths = new Map<number, typeof node[]>();
    nodes.forEach((n) => {
      if (!depths.has(n.depth)) depths.set(n.depth, []);
      depths.get(n.depth)!.push(n);
    });

    depths.forEach((depthNodes) => {
      depthNodes.sort((a, b) => {
        if (!a.children && !b.children) return 0;
        if (!a.children) return 1;
        if (!b.children) return -1;
        return 0;
      });
      depthNodes.forEach((n, i) => {
        n.y = n.depth * nodeSize[1];
        if (depthNodes.length === 1) {
          n.x = 0;
        } else {
          const offset = i - (depthNodes.length - 1) / 2;
          n.x = offset * nodeSize[0];
        }
      });
    });

    return node;
  }
  return layout;
}

type D3MinMax<T> = (arr: T[], fn: (d: T) => number) => number;
const d3min: D3MinMax<{ x: number }> = (arr, fn) => Math.min(...arr.map(fn));
const d3max: D3MinMax<{ x: number }> = (arr, fn) => Math.max(...arr.map(fn));
