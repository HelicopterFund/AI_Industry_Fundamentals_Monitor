(() => {
  const node = document.getElementById("quarterly-data");
  const root = document.querySelector("[data-quarterly-tracker]");
  if (!node || !root) return;
  const data = JSON.parse(node.textContent);
  const metricKeys = ["contract", "revenue", "profit"];
  const metricLabels = { contract: "\u8ba2\u5355", revenue: "\u6536\u5165", profit: "\u5229\u6da6" };
  const metricSubLabels = { contract: "\u5408\u540c\u8d1f\u503a\u540c\u6bd4\u589e\u901f\u53ca\u53d8\u5316", revenue: "\u6536\u5165\u540c\u6bd4\u589e\u901f\u53ca\u53d8\u5316", profit: "\u5f52\u6bcd\u51c0\u5229\u6da6\u540c\u6bd4\u589e\u901f\u53ca\u53d8\u5316" };
  const state = { period: data.initial_period, industry: "__overview__" };
  const periodTabs = root.querySelector("[data-period-tabs]");
  const industryTabs = root.querySelector("[data-industry-tabs]");
  const table = root.querySelector("[data-quarterly-table]");
  const status = root.querySelector("[data-quarterly-status]");

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
  const fmtPeriod = (value) => value || "--";
  const fmtRange = (left, right) => left === "--" || right === "--" ? "--" : `${left}-${right}`;
  const fmtPct = (value) => value == null || !Number.isFinite(value) ? "--" : `${(value * 100).toFixed(0)}%`;
  const fmtDelta = (value) => value == null || !Number.isFinite(value) ? "--" : `${(value * 100).toFixed(1)}`;
  const cellClass = (value) => value == null || value === 0 ? "metric-neutral" : value > 0 ? "metric-positive" : "metric-negative";
  const sign = (value) => value != null && value > 0 ? "+" : "-";
  const stage = (row, index) => {
    const values = metricKeys.map((key) => {
      const current = row[key]?.[index];
      const previous = index > 0 ? row[key]?.[index - 1] : null;
      return current != null && previous != null ? current - previous : null;
    });
    if (values.some((value) => value == null)) return ["--", "stage-empty"];
    const pattern = values.map(sign).join("");
    const plusCount = (pattern.match(/\+/g) || []).length;
    const colorClass = plusCount >= 3 ? "stage-three-plus" : plusCount === 2 ? "stage-two-plus" : plusCount === 1 ? "stage-one-plus" : "stage-no-plus";
    return [pattern, colorClass];
  };
  const spark = (values) => {
    const points = (values || []).slice(-20).map((value, index, arr) => ({ value, index, length: arr.length })).filter((item) => item.value != null && Number.isFinite(item.value));
    if (!points.length) return "<svg class='spark' viewBox='0 0 58 24' aria-label='\u65e0\u6570\u636e'></svg>";
    const low = Math.min(...points.map((point) => point.value));
    const high = Math.max(...points.map((point) => point.value));
    const span = high - low || 1;
    const xy = points.map((point) => `${(point.index / Math.max(1, point.length - 1) * 58).toFixed(1)},${(22 - (point.value - low) / span * 18).toFixed(1)}`).join(" ");
    const last = points[points.length - 1];
    const cx = last.index / Math.max(1, last.length - 1) * 58;
    const cy = 22 - (last.value - low) / span * 18;
    return `<svg class='spark' viewBox='0 0 58 24' role='img' aria-label='\u6700\u8fd120\u671f\u8d70\u52bf'><polyline points='${xy}' fill='none' stroke='#2e619d' stroke-width='1.25' stroke-linecap='round' stroke-linejoin='round'></polyline><circle cx='${cx.toFixed(1)}' cy='${cy.toFixed(1)}' r='1.7' fill='#c51b2f'></circle></svg>`;
  };
  const metricCells = (row, key, index) => {
    const values = row[key] || [];
    const current = values[index] ?? null;
    const previous = index > 0 ? values[index - 1] ?? null : null;
    const before = index > 1 ? values[index - 2] ?? null : null;
    const delta = current != null && previous != null ? current - previous : null;
    const oldDelta = previous != null && before != null ? previous - before : null;
    return `<td class='spark-cell'>${spark(values)}</td><td class='latest'>${fmtPct(current)}</td><td class='delta ${cellClass(delta)}'>${fmtDelta(delta)}</td><td class='delta ${cellClass(oldDelta)}'>${fmtDelta(oldDelta)}</td>`;
  };
  const header = (index) => {
    const current = data.periods[index];
    const previous = index > 0 ? data.periods[index - 1] : "--";
    const before = index > 1 ? data.periods[index - 2] : "--";
    const metricHeads = metricKeys.map((key) => `<th colspan='4' class='block-head'>${metricLabels[key]}</th>`).join("");
    const subHeads = metricKeys.map(() => `<th class='metric-head'>5Y\u8d70\u52bf</th><th class='metric-head'>${fmtPeriod(current)}</th><th class='metric-head'>\u0394(pct)<br>${fmtRange(fmtPeriod(current), fmtPeriod(previous))}</th><th class='metric-head'>\u0394(pct)<br>${fmtRange(fmtPeriod(previous), fmtPeriod(before))}</th>`).join("");
    return `<thead><tr><th rowspan='3' colspan='2' class='left-head'>AI\u4ea7\u4e1a\u94fe\u7ec6\u5206\u73af\u8282<br>\u4ea7\u4e1a\u5468\u671f</th>${metricHeads}<th rowspan='3' class='stage-head'>\u6210\u957f\u9636\u6bb5</th></tr><tr>${metricKeys.map((key) => `<th colspan='4' class='metric-head'>${metricSubLabels[key]}</th>`).join("")}</tr><tr>${subHeads}</tr></thead>`;
  };
  const render = () => {
    const index = data.periods.indexOf(state.period);
    const rows = state.industry === "__overview__" ? data.overview : (data.industry_rows[state.industry] || []);
    const hasPeriodData = rows.some((row) => metricKeys.some((key) => row[key]?.[index] != null));
    const displayRows = hasPeriodData ? rows : [];
    let body = "";
    const counts = {};
    displayRows.forEach((row) => { counts[row.first] = (counts[row.first] || 0) + 1; });
    const emitted = new Set();
    displayRows.forEach((row, rowIndex) => {
      const category = emitted.has(row.first) ? "" : `<td rowspan='${counts[row.first]}' class='category'>${escapeHtml(row.first)}</td>`;
      emitted.add(row.first);
      const displayName = row.name ? `${escapeHtml(row.name)}<span class='code'>${escapeHtml(row.code || "")}</span>` : escapeHtml(row.second);
      const stageValue = stage(row, index);
      const groupRule = rowIndex && displayRows[rowIndex - 1].first !== row.first ? "group-rule" : "";
      body += `<tr class='${groupRule}'>${category}<td class='subcategory'>${displayName || escapeHtml(row.second)}</td>${metricKeys.map((key) => metricCells(row, key, index)).join("")}<td class='stage ${stageValue[1]}'>${stageValue[0]}</td></tr>`;
    });
    if (!displayRows.length) body = `<tr class='empty-row'><td colspan='16'>\u6682\u65e0\u6570\u636e</td></tr>`;
    table.innerHTML = `${header(index)}<tbody>${body}</tbody>`;
    const label = state.industry === "__overview__" ? "\u4ea7\u4e1a\u94fe\u7ec6\u5206\u73af\u8282\u603b\u89c8" : state.industry;
    status.innerHTML = `<span><strong>${escapeHtml(state.period)}</strong> · ${escapeHtml(label)}</span><span>${displayRows.length ? `\u5171 ${displayRows.length} \u884c` : "\u6682\u65e0\u6570\u636e"}</span>`;
    periodTabs.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.period === state.period));
    industryTabs.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.industry === state.industry));
  };
  data.periods.forEach((period) => { const button = document.createElement("button"); button.type = "button"; button.dataset.period = period; button.textContent = period; button.addEventListener("click", () => { state.period = period; render(); }); periodTabs.appendChild(button); });
  const overviewButton = document.createElement("button"); overviewButton.type = "button"; overviewButton.dataset.industry = "__overview__"; overviewButton.textContent = "\u603b\u89c8"; overviewButton.addEventListener("click", () => { state.industry = "__overview__"; render(); }); industryTabs.appendChild(overviewButton);
  data.industries.forEach((industry) => { const button = document.createElement("button"); button.type = "button"; button.dataset.industry = industry; button.textContent = industry; button.addEventListener("click", () => { state.industry = industry; render(); }); industryTabs.appendChild(button); });
  render();
})();
