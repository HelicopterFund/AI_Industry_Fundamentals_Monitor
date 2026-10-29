(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const AXIS_UNITS = {
    "L1.1.1": { left: "亿美元" },
    "L1.1.2": { left: "亿美元", right: "比率（%）" },
    "L1.1.3": { left: "亿美元", right: "同比增速（%）" },
    "L1.1.3-OCF": { left: "亿美元", right: "同比增速（%）" },
    "L1.2.1": { left: "亿美元等值" },
    "L1.2.2-A": { left: "十亿美元等值" },
    "L1.3.2": { left: "bp" },
    "L1.3.3": { left: "%" },
    "L1.3.4": { left: "%" },
    "L2.1.1": { left: "亿美元/月" },
    "L2.1.2": { left: "MW", right: "%" },
    "L2.1.3": { left: "GW" },
    "L2.1.4": { left: "亿美元" },
    "L2.2.1": { left: "美元/千克" },
    "L2.2.2-D": { left: "点", right: "美元" },
    "L2.2.2-N": { left: "美元" },
    "L2.2.3": { left: "美元/小时/ GPU" },
    "L2.2.4": { left: "美元/百万Tokens" },
    "L2.2.5": { left: "美元/百万token" },
    "L2.3.1": { left: "亿美元" },
    "L2.3.2": { left: "同比增速（%）" },
    "L2.3.3": { left: "亿新台币", right: "同比增速（%）" },
    "L2.3.4": { left: "亿美元", right: "同比增速（%）" },
    "L3.1.1": { left: "%" },
    "L3.1.2": { left: "%" },
    "L3.1.3": { left: "%" },
    "L3.2.1": { left: "%" },
    "L3.2.2": { left: "指数（2022-11=100）" },
    "L3.3.1": { left: "百分点", right: "%" },
    "L3.4.1": { left: "十亿美元/月" },
    "L3.4.2": { left: "亿美元", right: "同比增速（%）" },
    "L3.4.3": { left: "亿美元", right: "同比增速（%）" },
    "L3.4.4": { left: "亿日元", right: "同比增速（%）" },
    "L3.4.5": { left: "同比增速（%）" },
    "L3.5.1": { left: "十亿美元", right: "占名义GDP（%）" },
    "L3.5.2": { left: "十亿美元", right: "占GDP（%）" },
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function formatValue(value, format = "number") {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    if (format === "percent") return `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}%`;
    if (format === "one_decimal") return Number(value).toFixed(1);
    if (format === "two_decimal") return Number(value).toFixed(2);
    if (format === "four_decimal") return Number(value).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    if (format === "number2") return Number(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    if (format === "integer" || format === "number" || format === "log") return numberFormatter.format(value);
    return String(value);
  }

  function axisUnitLabel(indicator, axisName) {
    const configured = AXIS_UNITS[indicator.code]?.[axisName];
    if (configured) return configured;
    const series = (indicator.series || []).find((item) => (item.axis || "left") === axisName);
    const match = series?.name?.match(/[（(]([^）)]+)[）)]/);
    if (match) return match[1].replace(/，?(左轴|右轴)/g, "").trim();
    if (indicator.axes[axisName]?.format === "percent") return "百分比（%）";
    return "";
  }

  function makeSvgElement(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function tickValues(axis) {
    if (axis.ticks) return axis.ticks;
    const values = [];
    for (let value = axis.min; value <= axis.max + axis.tick / 100; value += axis.tick) values.push(Number(value.toFixed(8)));
    return values;
  }

  function scaleValue(value, axis) {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    if (axis.scale === "log" && value <= 0) return null;
    const min = axis.scale === "log" ? Math.log10(axis.min) : axis.min;
    const max = axis.scale === "log" ? Math.log10(axis.max) : axis.max;
    const current = axis.scale === "log" ? Math.log10(value) : value;
    return (current - min) / (max - min);
  }

  function linePath(values, indices, xAt, yAt, step = false) {
    let path = "";
    let previousIndex = null;
    let previousY = null;
    indices.forEach((index) => {
      const value = values[index];
      const y = yAt(value);
      if (y === null) return;
      if (previousIndex === null) {
        path += `M${xAt(index).toFixed(2)},${y.toFixed(2)} `;
      } else if (step) {
        path += `L${xAt(index).toFixed(2)},${previousY.toFixed(2)} L${xAt(index).toFixed(2)},${y.toFixed(2)} `;
      } else {
        path += `L${xAt(index).toFixed(2)},${y.toFixed(2)} `;
      }
      previousIndex = index;
      previousY = y;
    });
    return path.trim();
  }

  function lastVisibleIndex(values, indices) {
    for (let i = indices.length - 1; i >= 0; i -= 1) if (values[indices[i]] !== null && values[indices[i]] !== undefined) return indices[i];
    return null;
  }

  function layoutLegend(series, width) {
    const maxWidth = Math.max(240, width - 28);
    const rows = [[]];
    let rowWidth = 0;
    series.forEach((item) => {
      const itemWidth = Math.max(96, item.name.length * 9 + 46);
      if (rowWidth && rowWidth + itemWidth > maxWidth) {
        rows.push([]);
        rowWidth = 0;
      }
      rows[rows.length - 1].push({ series: item, width: itemWidth });
      rowWidth += itemWidth;
    });
    return { rows, height: rows.length * 20 + 15 };
  }

  function renderInto(container, indicator, options = {}) {
    if (indicator.chart_type === "table") {
      container.classList.add("table-chart-shell");
      container.innerHTML = makeDataTable(indicator);
      return;
    }
    if (indicator.chart_type === "svg_table") {
      container.classList.add("svg-table-shell");
      container.replaceChildren(makeSvgTable(indicator));
      return;
    }
    const total = indicator.x_values.length;
    const start = Math.max(0, Math.min(options.start ?? 0, Math.max(0, total - 1)));
    const end = Math.max(start, Math.min(options.end ?? Math.max(0, total - 1), Math.max(0, total - 1)));
    const indices = Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
    const width = options.width || 960;
    const baseHeight = options.height || 330;
    const height = baseHeight + (indices.length > 12 ? 55 : 0);
    const hasRight = Boolean(indicator.axes.right);
    const legend = layoutLegend(indicator.series, width);
    const margin = { top: legend.height, right: hasRight ? 86 : 25, bottom: indices.length > 12 ? 82 : 64, left: 66 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const axisMap = { left: indicator.axes.left, right: indicator.axes.right || indicator.axes.left };
    const categoryWidth = plotWidth / Math.max(1, indices.length);
    const xAt = (index) => indices.length === 1 ? margin.left + plotWidth / 2 : margin.left + ((index - start) / (end - start)) * plotWidth;
    const xBarAt = (index) => margin.left + ((index - start) + 0.5) * categoryWidth;
    const yAt = (value, axisName = "left") => {
      const normalized = scaleValue(value, axisMap[axisName]);
      return normalized === null ? null : margin.top + plotHeight - normalized * plotHeight;
    };

    const svg = makeSvgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": indicator.title, "data-chart-svg": "true" });
    const root = makeSvgElement("g", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
    svg.appendChild(root);
    const clipId = `chart-plot-clip-${Math.random().toString(36).slice(2)}`;
    const defs = makeSvgElement("defs");
    const clip = makeSvgElement("clipPath", { id: clipId });
    clip.appendChild(makeSvgElement("rect", { x: margin.left, y: margin.top, width: plotWidth, height: plotHeight }));
    defs.appendChild(clip);
    svg.appendChild(defs);
    const plotRoot = makeSvgElement("g", { "clip-path": `url(#${clipId})` });
    svg.appendChild(plotRoot);

    const leftAxis = axisMap.left;
    tickValues(leftAxis).forEach((tick) => {
      const y = yAt(tick, "left");
      root.appendChild(makeSvgElement("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: "#e8edf2", "stroke-width": "1" }));
      const label = makeSvgElement("text", { x: margin.left - 9, y: y + 4, "text-anchor": "end", fill: "#677383", "font-size": "11" });
      label.textContent = formatValue(tick, leftAxis.format);
      root.appendChild(label);
    });
    if (hasRight) {
      tickValues(axisMap.right).forEach((tick) => {
        const y = yAt(tick, "right");
        const label = makeSvgElement("text", { x: width - margin.right + 9, y: y + 4, "text-anchor": "start", fill: "#677383", "font-size": "11" });
        label.textContent = formatValue(tick, axisMap.right.format);
        root.appendChild(label);
      });
    }
    root.appendChild(makeSvgElement("line", { x1: margin.left, y1: margin.top + plotHeight, x2: width - margin.right, y2: margin.top + plotHeight, stroke: "#172235", "stroke-width": "1" }));
    root.appendChild(makeSvgElement("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + plotHeight, stroke: "#172235", "stroke-width": "1" }));
    if (hasRight) root.appendChild(makeSvgElement("line", { x1: width - margin.right, y1: margin.top, x2: width - margin.right, y2: margin.top + plotHeight, stroke: "#172235", "stroke-width": "1" }));
    const leftUnit = axisUnitLabel(indicator, "left");
    if (leftUnit) {
      const label = makeSvgElement("text", { x: 16, y: margin.top + plotHeight / 2, "text-anchor": "middle", fill: "#677383", "font-size": "10", transform: `rotate(-90 16 ${margin.top + plotHeight / 2})` });
      label.textContent = leftUnit;
      root.appendChild(label);
    }
    if (hasRight) {
      const rightUnit = axisUnitLabel(indicator, "right");
      if (rightUnit) {
        const label = makeSvgElement("text", { x: width - 18, y: margin.top + plotHeight / 2, "text-anchor": "middle", fill: "#677383", "font-size": "10", transform: `rotate(90 ${width - 18} ${margin.top + plotHeight / 2})` });
        label.textContent = rightUnit;
        root.appendChild(label);
      }
    }

    const labelStep = Math.max(1, Math.ceil(indices.length / (options.modal ? 12 : 10)));
    const labelLocals = indices.map((_, localIndex) => localIndex).filter((localIndex) => localIndex % labelStep === 0 || localIndex === indices.length - 1);
    const minLabelGap = indices.length > 12 ? Math.max(2, Math.ceil(labelStep * 0.65)) : 1;
    if (labelLocals.length > 1 && labelLocals[labelLocals.length - 1] - labelLocals[labelLocals.length - 2] < minLabelGap) labelLocals.splice(labelLocals.length - 2, 1);
    labelLocals.forEach((localIndex) => {
      const index = indices[localIndex];
      const label = makeSvgElement("text", { x: xAt(index), y: margin.top + plotHeight + 23, "text-anchor": "middle", fill: "#677383", "font-size": "10" });
      label.textContent = indicator.x_values[index];
      if (indices.length > 12) {
        label.setAttribute("text-anchor", "end");
        label.setAttribute("transform", `rotate(-55 ${xAt(index)} ${margin.top + plotHeight + 23})`);
      }
      root.appendChild(label);
    });

    legend.rows.forEach((row, rowIndex) => {
      const totalWidth = row.reduce((sum, item) => sum + item.width, 0);
      let legendX = Math.max(14, (width - totalWidth) / 2);
      const legendY = 18 + rowIndex * 20;
      row.forEach(({ series, width: itemWidth }) => {
        const line = makeSvgElement("line", { x1: legendX, y1: legendY - 4, x2: legendX + 18, y2: legendY - 4, stroke: series.color, "stroke-width": "3" });
        root.appendChild(line);
        const label = makeSvgElement("text", { x: legendX + 24, y: legendY, fill: "#677383", "font-size": "10" });
        label.textContent = series.name;
        root.appendChild(label);
        legendX += itemWidth;
      });
    });

    const barSeries = indicator.series.filter((series) => series.type === "bar");
    const lineSeries = indicator.series.filter((series) => series.type !== "bar");
    const stackedBars = indicator.chart_type === "stacked_bar" || barSeries.some((series) => series.stack);
    if (barSeries.length) {
      const groupWidth = categoryWidth * 0.72;
      const barWidth = stackedBars ? groupWidth : groupWidth / barSeries.length;
      indices.forEach((index) => {
        let stackValue = 0;
        barSeries.forEach((series, seriesIndex) => {
          const value = series.values[index];
          if (value === null || value === undefined) return;
          const base = stackedBars ? stackValue : 0;
          const valueY = yAt(base + value, series.axis);
          const baseY = yAt(base, series.axis);
          const yTop = Math.min(valueY, baseY);
          const yBottom = Math.max(valueY, baseY);
          const x = stackedBars ? xBarAt(index) - groupWidth / 2 : xBarAt(index) - groupWidth / 2 + seriesIndex * barWidth;
          const rect = makeSvgElement("rect", { x, y: yTop, width: Math.max(1, barWidth - 2), height: Math.max(0, yBottom - yTop), fill: series.last_color && index === indices[indices.length - 1] ? series.last_color : series.color });
          plotRoot.appendChild(rect);
          if (series.show_labels && stackedBars) {
            const text = makeSvgElement("text", { x: x + barWidth / 2 - 1, y: yTop + (yBottom - yTop) / 2 + 4, "text-anchor": "middle", fill: "#fff", "font-size": "11", "font-weight": "700" });
            text.textContent = formatValue(value, series.format);
            plotRoot.appendChild(text);
          }
          stackValue = stackedBars ? stackValue + value : stackValue;
          if (series.show_labels && !stackedBars) {
            const text = makeSvgElement("text", { x: x + barWidth / 2 - 1, y: yTop - 7, "text-anchor": "middle", fill: "#4d5662", "font-size": "11" });
            text.textContent = formatValue(value, series.format);
            plotRoot.appendChild(text);
          }
        });
      });
    }
    lineSeries.forEach((series) => {
      const path = makeSvgElement("path", { d: linePath(series.values, indices, xAt, (value) => yAt(value, series.axis), series.step), stroke: series.color, "stroke-width": String(series.width || 2.2), fill: "none", ...(series.dash ? { "stroke-dasharray": "5 4" } : {}) });
      plotRoot.appendChild(path);
      if (series.show_points) indices.forEach((index) => {
        const value = series.values[index];
        const y = yAt(value, series.axis);
        if (y === null) return;
        plotRoot.appendChild(makeSvgElement("circle", { cx: xAt(index), cy: y, r: "3", fill: series.color, stroke: "#fff", "stroke-width": "1" }));
      });
      if (series.show_end_label) {
        const last = lastVisibleIndex(series.values, indices);
        if (last !== null) {
          const value = series.values[last];
          const nearRight = xAt(last) > width - margin.right - 45;
          const label = makeSvgElement("text", { x: nearRight ? xAt(last) - 7 : xAt(last) + 7, y: Math.max(margin.top + 12, Math.min(margin.top + plotHeight - 4, yAt(value, series.axis) + 4)), "text-anchor": nearRight ? "end" : "start", fill: series.color, "font-size": "11", "font-weight": "700" });
          label.textContent = formatValue(value, series.format);
          root.appendChild(label);
        }
      }
    });

    const overlay = makeSvgElement("rect", { x: margin.left, y: margin.top, width: plotWidth, height: plotHeight, fill: "transparent", "data-chart-overlay": "true" });
    svg.appendChild(overlay);
    container.replaceChildren(svg);
    const tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.hidden = true;
    container.appendChild(tooltip);
    overlay.addEventListener("mousemove", (event) => {
      const box = svg.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - box.left - (margin.left / width) * box.width) / (plotWidth / width * box.width)));
      const localIndex = Math.round(ratio * Math.max(0, indices.length - 1));
      const index = indices[localIndex];
      const rows = indicator.series.map((series) => {
        const value = series.values[index];
        return value === null || value === undefined ? "" : `<div class="chart-tooltip-row"><span><i class="chart-tooltip-swatch" style="background:${series.color}"></i>${escapeHtml(series.name)}</span><span>${escapeHtml(formatValue(value, series.format))}</span></div>`;
      }).filter(Boolean).join("");
      tooltip.innerHTML = `<strong>${escapeHtml(indicator.x_values[index])}</strong>${rows}`;
      const host = container.getBoundingClientRect();
      tooltip.style.left = `${Math.min(Math.max(8, event.clientX - host.left + 12), Math.max(8, host.width - 230))}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - host.top - 20)}px`;
      tooltip.hidden = false;
    });
    overlay.addEventListener("mouseleave", () => { tooltip.hidden = true; });
  }

  function makeDataTable(indicator) {
    const head = indicator.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
    const wealthTable = indicator.code === "L3.3.2";
    const body = indicator.rows.map((row) => `<tr>${indicator.headers.map((header, index) => {
      const raw = row[header] ?? "";
      const rankTop = wealthTable && (index === 5 || index === 9) && Number.parseFloat(String(raw)) <= 5;
      const classes = [];
      if (wealthTable && index === 0) classes.push("wealth-name");
      if (wealthTable && index === 1) classes.push("wealth-date");
      if (wealthTable && (index === 5 || index === 9)) classes.push("wealth-rank", rankTop ? "rank-top" : "");
      return `<td class="${classes.filter(Boolean).join(" ")}">${escapeHtml(raw)}</td>`;
    }).join("")}</tr>`).join("");
    return `<div class="data-table-wrap"><table class="data-table${wealthTable ? " wealth-table" : ""}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function svgTableLines(value, maxChars) {
    const text = String(value ?? "");
    if (!text) return [""];
    const lines = [];
    for (let offset = 0; offset < text.length; offset += maxChars) lines.push(text.slice(offset, offset + maxChars));
    return lines;
  }

  function makeSvgTable(indicator) {
    const headers = indicator.headers || [];
    const rows = indicator.rows || [];
    const width = 1000;
    const widths = indicator.code === "L1.2.2-B"
      ? [150, 230, 185, 185, 120]
      : indicator.code === "L1.2.4"
        ? [110, 150, 150, 130, 460]
        : indicator.code === "L1.2.5"
          ? [105, 120, 120, 150, 120, 150, 235]
          : [125, 175, 175, 175, 175, 175];
    const usableWidths = widths.length === headers.length ? widths : headers.map(() => width / Math.max(1, headers.length));
    const xPositions = [0];
    usableWidths.forEach((item) => xPositions.push(xPositions[xPositions.length - 1] + item));
    const headerLines = headers.map((header, index) => svgTableLines(header, Math.max(6, Math.floor(usableWidths[index] / 12))));
    const headerHeight = Math.max(...headerLines.map((lines) => lines.length), 1) * 19 + 17;
    const rowLines = rows.map((row) => headers.map((header, index) => svgTableLines(row[header] ?? "", Math.max(8, Math.floor(usableWidths[index] / 11)))));
    const rowHeights = rowLines.map((cells) => Math.max(...cells.map((lines) => lines.length), 1) * 18 + 14);
    const height = headerHeight + rowHeights.reduce((sum, item) => sum + item, 0);
    const svg = makeSvgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": indicator.title, "data-svg-table": "true" });
    const totalColumn = (header) => /累计公司债|租赁负债合计|承诺敞口合计/.test(header);
    const emphasisColumn = (header) => totalColumn(header)
      || (indicator.code === "L1.2.4" && /Q2的VIE敞口/.test(header))
      || (indicator.code === "L1.2.5" && /表内融资合计|含VIE的融资敞口/.test(header));
    const deltaColumn = (header) => /Δ|增加额/.test(header);
    const addCell = (x, y, cellWidth, cellHeight, value, options = {}) => {
      const group = makeSvgElement("g");
      const title = makeSvgElement("title");
      title.textContent = String(value ?? "");
      group.appendChild(title);
      group.appendChild(makeSvgElement("rect", { x, y, width: cellWidth, height: cellHeight, fill: options.fill || "#fff", stroke: "#fff", "stroke-width": "1" }));
      const lines = options.lines || svgTableLines(value, Math.max(6, Math.floor(cellWidth / 11)));
      const lineHeight = 18;
      const startY = y + (cellHeight - lines.length * lineHeight) / 2 + 13;
      lines.forEach((line, index) => {
        const text = makeSvgElement("text", { x: x + cellWidth / 2, y: startY + index * lineHeight, "text-anchor": "middle", fill: options.color || "#344154", "font-size": options.fontSize || "13", "font-weight": options.weight || "400" });
        text.textContent = line;
        group.appendChild(text);
      });
      svg.appendChild(group);
    };
    headers.forEach((header, index) => addCell(xPositions[index], 0, usableWidths[index], headerHeight, header, { fill: "#2e619d", color: "#fff", weight: "700", lines: headerLines[index], fontSize: "13" }));
    let y = headerHeight;
    rows.forEach((row, rowIndex) => {
      const rowHeight = rowHeights[rowIndex];
      headers.forEach((header, index) => {
        const isTotal = emphasisColumn(header);
        const isDelta = deltaColumn(header);
        const isName = index === 0;
        const fill = isTotal ? "#f8d9dd" : isDelta ? "#eaf0fa" : rowIndex % 2 ? "#f8fbff" : "#fff";
        const color = isTotal ? "#c00000" : isDelta || isName ? "#174d8f" : "#344154";
        const fontSize = indicator.code === "L1.2.4" && index === 4 ? "11" : indicator.code === "L1.2.5" && index === 6 ? "11" : "12";
        addCell(xPositions[index], y, usableWidths[index], rowHeight, row[header] ?? "", { fill, color, weight: isTotal || isName ? "700" : "400", fontSize });
      });
      y += rowHeight;
    });
    return svg;
  }

  function mountCard(card, indicator) {
    const shell = card.querySelector("[data-chart-id]");
    if (shell && indicator.has_data) renderInto(shell, indicator);
    const details = card.querySelector("[data-table-indicator]");
    if (details) details.addEventListener("toggle", () => {
      if (details.open && !details.querySelector(".data-table")) details.querySelector(".data-table-slot").innerHTML = makeDataTable(indicator);
    });
  }

  function openModal(indicator) {
    const modal = document.querySelector("[data-chart-modal]");
    if (!modal) return;
    const previousScroll = window.scrollY;
    modal.innerHTML = `<div class="modal-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(indicator.title)}"><div class="modal-header"><div><h2>${escapeHtml(indicator.title)}</h2><p>${escapeHtml(indicator.source_file)} · ${escapeHtml(indicator.frequency)}</p></div><button class="modal-close" type="button" aria-label="关闭">×</button></div><div class="modal-chart"><div class="chart-shell"></div></div><div class="modal-source"><strong>数据来源：</strong>${escapeHtml(indicator.source_note || "TXT 与参考截图未提供来源说明。")}</div><div class="modal-commentary">${escapeHtml(indicator.missing_value_policy || "缺失值按原始 TXT 保留。")}</div><div class="modal-footer"><div class="modal-slider" hidden><span>时间范围：<b data-slider-label></b></span><input type="range" min="0" max="0" value="0" step="1" aria-label="时间范围起点"></div></div><details class="data-preview modal-data"><summary>查看可复制数据</summary><div class="modal-data-slot"></div></details></div>`;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const shell = modal.querySelector(".chart-shell");
    const end = Math.max(0, indicator.x_values.length - 1);
    const slider = modal.querySelector(".modal-slider");
    const range = modal.querySelector("input[type=range]");
    const label = modal.querySelector("[data-slider-label]");
    const redraw = (start) => {
      renderInto(shell, indicator, { start, end, modal: true, height: 430 });
      label.textContent = `${indicator.x_values[start] || "起点"} — ${indicator.x_values[end] || "终点"}`;
    };
    redraw(0);
    if (indicator.time_slider && end > 0) {
      slider.hidden = false;
      range.max = String(end);
      range.value = "0";
      range.addEventListener("input", () => redraw(Number(range.value)));
    }
    modal.querySelector(".modal-data").addEventListener("toggle", (event) => {
      if (event.target.open) event.target.querySelector(".modal-data-slot").innerHTML = makeDataTable(indicator);
    });
    const close = () => {
      modal.removeEventListener("click", backdropClose);
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modal.replaceChildren();
      document.body.classList.remove("modal-open");
      window.scrollTo(0, previousScroll);
    };
    modal.querySelector(".modal-close").addEventListener("click", close);
    const backdropClose = (event) => { if (event.target === modal) close(); };
    modal.addEventListener("click", backdropClose);
    modal._close = close;
    modal._close = close;
  }

  window.AICharts = {
    renderPlaceholder(element) { element.dataset.chartReady = "true"; },
    renderInto,
    mountCard,
    openModal,
    makeDataTable,
    formatValue,
  };
})();
