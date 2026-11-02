(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const WIDTH = 1420;
  const COLORS = { header: "#2e619d", line: "#dbe4ee", ink: "#172235", muted: "#667384", blue: "#2e619d", red: "#c00000", yellow: "#d59b20", pale: "#f7faff", paleBlue: "#eaf0fa" };

  function el(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function text(parent, value, x, y, attrs = {}) {
    const node = el("text", { x, y, fill: COLORS.ink, "font-family": "Microsoft YaHei, 微软雅黑, sans-serif", "font-size": 12, ...attrs });
    node.textContent = String(value ?? "");
    parent.appendChild(node);
    return node;
  }

  function lines(value, maxChars) {
    const raw = String(value ?? "");
    if (!raw) return [""];
    const result = [];
    for (let i = 0; i < raw.length; i += maxChars) result.push(raw.slice(i, i + maxChars));
    return result;
  }

  function cell(parent, x, y, width, height, value, opts = {}) {
    parent.appendChild(el("rect", { x, y, width, height, fill: opts.fill || "#fff", stroke: COLORS.line, "stroke-width": 1 }));
    const wrapped = lines(value, opts.maxChars || Math.max(5, Math.floor(width / 12)));
    const lineHeight = opts.lineHeight || 16;
    const start = y + (height - wrapped.length * lineHeight) / 2 + 12;
    wrapped.forEach((line, index) => text(parent, line, opts.anchor === "start" ? x + 10 : x + width / 2, start + index * lineHeight, { "text-anchor": opts.anchor || "middle", fill: opts.color || COLORS.ink, "font-size": opts.fontSize || 12, "font-weight": opts.weight || 400 }));
  }

  function parseSpark(markup) {
    if (!markup) return null;
    const holder = document.createElement("div");
    holder.innerHTML = markup;
    const line = holder.querySelector("polyline");
    if (!line) return null;
    return { points: line.getAttribute("points") || "", color: line.getAttribute("stroke") || COLORS.blue };
  }

  function spark(parent, markup, x, y, width, height) {
    const parsed = parseSpark(markup);
    if (!parsed || !parsed.points) return;
    const points = parsed.points.trim().split(/\s+/).map((pair) => pair.split(",").map(Number)).filter((pair) => pair.length === 2 && pair.every(Number.isFinite));
    if (points.length < 2) return;
    const mapped = points.map(([px, py]) => `${(x + px / 88 * width).toFixed(1)},${(y + py / 20 * height).toFixed(1)}`).join(" ");
    parent.appendChild(el("polyline", { points: mapped, fill: "none", stroke: parsed.color, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  }

  function direction(parent, value, x, y) {
    const type = value === "up" ? "up" : value === "down" ? "down" : "flat";
    const color = type === "up" ? COLORS.red : type === "down" ? COLORS.yellow : COLORS.blue;
    const glyph = type === "up" ? "↑" : type === "down" ? "↓" : "→";
    parent.appendChild(el("circle", { cx: x, cy: y - 5, r: 13, fill: type === "up" ? "#f8d9dd" : type === "down" ? "#fff1cf" : COLORS.paleBlue }));
    text(parent, glyph, x, y + 1, { "text-anchor": "middle", fill: color, "font-size": 18, "font-weight": 700 });
  }

  function render(container, dashboard) {
    const groups = dashboard.groups || [];
    const rows = groups.flatMap((group) => group.rows.map((row) => ({ group, row })));
    const headerHeight = 58;
    const rowHeight = 66;
    const height = headerHeight + rows.length * rowHeight;
    const svg = el("svg", { viewBox: `0 0 ${WIDTH} ${height}`, role: "img", "aria-label": dashboard.title, "data-dashboard-rendered": "true" });
    const root = el("g");
    svg.appendChild(root);
    const widths = [150, 410, 82, 125, 100, 210, 110, 233];
    const x = widths.reduce((acc, value, index) => { acc[index] = (acc[index - 1] || 0) + (index ? widths[index - 1] : 0); return acc; }, []);
    ["产业环节", "跟踪指标", "更新频率", "最新值截至日", "最新值", "近三期同比", "方向", "走势"].forEach((label, index) => cell(root, x[index], 0, widths[index], headerHeight, label, { fill: COLORS.header, color: "#fff", weight: 700, fontSize: 13, maxChars: 8 }));
    let rowIndex = 0;
    groups.forEach((group) => {
      const groupHeight = group.rows.length * rowHeight;
      cell(root, x[0], headerHeight + rowIndex * rowHeight, widths[0], groupHeight, `${group.code}\n${group.title}`, { fill: "#f2f5f8", color: COLORS.ink, weight: 700, maxChars: 10, lineHeight: 18 });
      group.rows.forEach((row) => {
        const y = headerHeight + rowIndex * rowHeight;
        const fill = rowIndex % 2 ? COLORS.pale : "#fff";
        cell(root, x[1], y, widths[1], rowHeight, `${row.code}  ${row.title}`, { fill, anchor: "start", weight: 600, maxChars: 38 });
        cell(root, x[2], y, widths[2], rowHeight, row.frequency, { fill, color: COLORS.muted, maxChars: 6 });
        cell(root, x[3], y, widths[3], rowHeight, row.latest_date, { fill, color: COLORS.muted, maxChars: 12 });
        cell(root, x[4], y, widths[4], rowHeight, row.latest, { fill, weight: 700, maxChars: 10 });
        cell(root, x[5], y, widths[5], rowHeight, `T  ${row.t}    T-1  ${row.t1}    T-2  ${row.t2}`, { fill: COLORS.pale, color: COLORS.muted, maxChars: 31, fontSize: 11 });
        direction(root, row.first_direction, x[6] + 34, y + 28);
        direction(root, row.second_direction, x[6] + 76, y + 28);
        root.appendChild(el("rect", { x: x[7], y, width: widths[7], height: rowHeight, fill, stroke: COLORS.line, "stroke-width": 1 }));
        spark(root, row.spark, x[7] + 8, y + 13, 100, 18);
        spark(root, row.spark_yoy, x[7] + 120, y + 13, 100, 18);
        rowIndex += 1;
      });
    });
    container.replaceChildren(svg);
  }

  function boot() {
    const target = document.querySelector("[data-dashboard-svg]");
    const data = document.querySelector("#page-data");
    if (!target || !data) return;
    try { render(target, JSON.parse(data.textContent).dashboard); } catch (error) { console.error("dashboard SVG render failed", error); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
