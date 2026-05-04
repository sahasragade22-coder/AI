const sampleRows = [
  { Month: 'Jan', Region: 'North', Product: 'Laptop', Revenue: 42000, Cost: 28500, Units: 105, Satisfaction: 87 },
  { Month: 'Feb', Region: 'South', Product: 'Tablet', Revenue: 31500, Cost: 21000, Units: 126, Satisfaction: 81 },
  { Month: 'Mar', Region: 'East', Product: 'Phone', Revenue: 52800, Cost: 33200, Units: 240, Satisfaction: 89 },
  { Month: 'Apr', Region: 'West', Product: 'Monitor', Revenue: 24800, Cost: 15100, Units: 62, Satisfaction: 78 },
  { Month: 'May', Region: 'North', Product: 'Phone', Revenue: 61200, Cost: 39000, Units: 278, Satisfaction: 91 },
  { Month: 'Jun', Region: 'South', Product: 'Laptop', Revenue: 45500, Cost: 30100, Units: 97, Satisfaction: 84 },
  { Month: 'Jul', Region: 'East', Product: 'Tablet', Revenue: 38400, Cost: 24400, Units: 152, Satisfaction: 86 },
  { Month: 'Aug', Region: 'West', Product: 'Phone', Revenue: 70200, Cost: 43800, Units: 315, Satisfaction: 93 },
  { Month: 'Sep', Region: 'North', Product: 'Monitor', Revenue: 29200, Cost: 17800, Units: 73, Satisfaction: 80 },
  { Month: 'Oct', Region: 'South', Product: 'Phone', Revenue: 66400, Cost: 41200, Units: 296, Satisfaction: 88 },
  { Month: 'Nov', Region: 'East', Product: 'Laptop', Revenue: 49200, Cost: 32200, Units: 111, Satisfaction: 85 },
  { Month: 'Dec', Region: 'West', Product: 'Tablet', Revenue: 35200, Cost: 22800, Units: 141, Satisfaction: 82 }
];

let rows = [...sampleRows];
let filteredRows = [...rows];
let headers = Object.keys(rows[0]);
let sortState = { key: null, direction: 1 };

const els = {
  csvFile: document.querySelector('#csvFile'),
  sampleBtn: document.querySelector('#sampleBtn'),
  exportBtn: document.querySelector('#exportBtn'),
  searchInput: document.querySelector('#searchInput'),
  groupColumn: document.querySelector('#groupColumn'),
  metricColumn: document.querySelector('#metricColumn'),
  chartType: document.querySelector('#chartType'),
  darkMode: document.querySelector('#darkMode'),
  datasetName: document.querySelector('#datasetName'),
  statusText: document.querySelector('#statusText'),
  kpiGrid: document.querySelector('#kpiGrid'),
  chart: document.querySelector('#mainChart'),
  chartCaption: document.querySelector('#chartCaption'),
  insightsList: document.querySelector('#insightsList'),
  correlationMatrix: document.querySelector('#correlationMatrix'),
  outlierList: document.querySelector('#outlierList'),
  dataTable: document.querySelector('#dataTable'),
  rowCount: document.querySelector('#rowCount')
};

const currency = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const parsedHeaders = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    return parsedHeaders.reduce((record, header, index) => {
      const raw = values[index] ?? '';
      const numeric = Number(raw.replace(/,/g, ''));
      record[header.trim()] = raw.trim() !== '' && Number.isFinite(numeric) ? numeric : raw.trim();
      return record;
    }, {});
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let quoted = false;

  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function numericColumns(data = rows) {
  return headers.filter(header => data.some(row => typeof row[header] === 'number' && Number.isFinite(row[header])));
}

function categoricalColumns() {
  const numeric = new Set(numericColumns());
  return headers.filter(header => !numeric.has(header));
}

function refreshControls() {
  const categories = categoricalColumns();
  const numerics = numericColumns();
  fillSelect(els.groupColumn, categories.length ? categories : headers);
  fillSelect(els.metricColumn, numerics);
}

function fillSelect(select, options) {
  select.innerHTML = options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();
  filteredRows = rows.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(query)));

  if (sortState.key) {
    filteredRows.sort((a, b) => compareValues(a[sortState.key], b[sortState.key]) * sortState.direction);
  }

  render();
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function render() {
  renderKpis();
  renderChart();
  renderInsights();
  renderCorrelation();
  renderOutliers();
  renderTable();
  els.rowCount.textContent = `${filteredRows.length} of ${rows.length} rows`;
}

function renderKpis() {
  const numerics = numericColumns(filteredRows);
  const metric = els.metricColumn.value || numerics[0];
  const values = numericValues(metric);
  const total = sum(values);
  const avg = values.length ? total / values.length : 0;
  const max = values.length ? Math.max(...values) : 0;

  const cards = [
    ['Rows', filteredRows.length],
    ['Columns', headers.length],
    [`Total ${metric || 'metric'}`, formatNumber(total)],
    [`Avg ${metric || 'metric'}`, formatNumber(avg)],
    [`Max ${metric || 'metric'}`, formatNumber(max)]
  ];

  els.kpiGrid.innerHTML = cards.map(([label, value]) => `
    <article class="kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join('');
}

function renderChart() {
  const groupKey = els.groupColumn.value || headers[0];
  const metricKey = els.metricColumn.value || numericColumns()[0];
  const groups = groupData(groupKey, metricKey);
  const labels = Object.keys(groups).slice(0, 12);
  const values = labels.map(label => groups[label]);

  els.chartCaption.textContent = `${metricKey || 'Count'} by ${groupKey}`;
  drawChart(labels, values, els.chartType.value);
}

function groupData(groupKey, metricKey) {
  return filteredRows.reduce((acc, row) => {
    const label = row[groupKey] || 'Blank';
    const amount = typeof row[metricKey] === 'number' ? row[metricKey] : 1;
    acc[label] = (acc[label] || 0) + amount;
    return acc;
  }, {});
}

function drawChart(labels, values, type) {
  const ctx = els.chart.getContext('2d');
  const width = els.chart.width = els.chart.clientWidth * window.devicePixelRatio;
  const height = els.chart.height = 280 * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0, 0, width, height);

  const palette = ['#0d9488', '#dc6b36', '#4666c8', '#b45309', '#047857', '#be185d', '#2563eb', '#7c3aed'];
  const max = Math.max(...values, 1);
  const chartWidth = els.chart.clientWidth;
  const chartHeight = 250;

  ctx.font = '12px Segoe UI, Arial';
  ctx.textBaseline = 'middle';

  if (type === 'pie') {
    drawPie(ctx, labels, values, palette, chartWidth, chartHeight);
    return;
  }

  const gap = 10;
  const barWidth = Math.max(18, (chartWidth - gap * (labels.length + 1)) / Math.max(labels.length, 1));
  values.forEach((value, index) => {
    const x = gap + index * (barWidth + gap);
    const h = (value / max) * 185;
    const y = 215 - h;
    ctx.fillStyle = palette[index % palette.length];

    if (type === 'line') {
      const pointX = x + barWidth / 2;
      const pointY = y;
      if (index === 0) ctx.beginPath();
      ctx[index === 0 ? 'moveTo' : 'lineTo'](pointX, pointY);
      ctx.arc(pointX, pointY, 3, 0, Math.PI * 2);
    } else {
      ctx.fillRect(x, y, barWidth, h);
    }

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted');
    ctx.fillText(String(labels[index]).slice(0, 10), x, 238);
  });

  if (type === 'line') {
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawPie(ctx, labels, values, palette, chartWidth) {
  const total = sum(values) || 1;
  let start = -Math.PI / 2;
  const radius = 92;
  const centerX = Math.min(chartWidth / 2, 170);
  const centerY = 125;

  values.forEach((value, index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + angle);
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();
    start += angle;
  });

  labels.slice(0, 8).forEach((label, index) => {
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(centerX + 125, 38 + index * 24, 12, 12);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text');
    ctx.fillText(String(label).slice(0, 18), centerX + 144, 44 + index * 24);
  });
}

function renderInsights() {
  const metric = els.metricColumn.value || numericColumns()[0];
  const group = els.groupColumn.value || headers[0];
  const values = numericValues(metric);
  const groups = groupData(group, metric);
  const topGroup = Object.entries(groups).sort((a, b) => b[1] - a[1])[0];
  const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0;
  const missing = rows.reduce((count, row) => count + headers.filter(header => row[header] === '').length, 0);

  const insights = [
    topGroup ? `${topGroup[0]} leads ${group} with ${formatNumber(topGroup[1])} ${metric}.` : 'No grouped values are available.',
    `The selected metric average is ${formatNumber(values.length ? sum(values) / values.length : 0)}.`,
    `First-to-last movement is ${trend >= 0 ? 'up' : 'down'} ${formatNumber(Math.abs(trend))}.`,
    missing ? `${missing} blank values were found in the dataset.` : 'No blank values were detected.'
  ];

  els.insightsList.innerHTML = insights.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderCorrelation() {
  const nums = numericColumns().slice(0, 5);
  if (nums.length < 2) {
    els.correlationMatrix.textContent = 'Upload at least two numeric columns to calculate correlations.';
    return;
  }

  const head = `<tr><th></th>${nums.map(col => `<th>${escapeHtml(col)}</th>`).join('')}</tr>`;
  const body = nums.map(a => `
    <tr>
      <th>${escapeHtml(a)}</th>
      ${nums.map(b => `<td class="corr-cell">${correlation(a, b).toFixed(2)}</td>`).join('')}
    </tr>
  `).join('');
  els.correlationMatrix.innerHTML = `<table>${head}${body}</table>`;
}

function renderOutliers() {
  const metric = els.metricColumn.value || numericColumns()[0];
  const values = numericValues(metric);
  const avg = values.length ? sum(values) / values.length : 0;
  const deviation = Math.sqrt(sum(values.map(value => (value - avg) ** 2)) / Math.max(values.length, 1));
  const outliers = filteredRows
    .map((row, index) => ({ row, index, z: deviation ? Math.abs((row[metric] - avg) / deviation) : 0 }))
    .filter(item => item.z > 2)
    .slice(0, 8);

  els.outlierList.innerHTML = outliers.length
    ? outliers.map(item => `<div class="outlier-item">Row ${item.index + 1}: ${metric} = ${formatNumber(item.row[metric])} (z ${item.z.toFixed(2)})</div>`).join('')
    : '<div class="outlier-item">No strong outliers found for the selected metric.</div>';
}

function renderTable() {
  const head = `<thead><tr>${headers.map(header => `<th data-key="${escapeHtml(header)}">${escapeHtml(header)}</th>`).join('')}</tr></thead>`;
  const body = filteredRows.slice(0, 100).map(row => `
    <tr>${headers.map(header => `<td>${escapeHtml(String(row[header] ?? ''))}</td>`).join('')}</tr>
  `).join('');
  els.dataTable.innerHTML = `${head}<tbody>${body}</tbody>`;

  els.dataTable.querySelectorAll('th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      sortState = { key, direction: sortState.key === key ? sortState.direction * -1 : 1 };
      applyFilters();
    });
  });
}

function numericValues(key) {
  return filteredRows.map(row => row[key]).filter(value => typeof value === 'number' && Number.isFinite(value));
}

function correlation(a, b) {
  const pairs = filteredRows
    .map(row => [row[a], row[b]])
    .filter(([x, y]) => typeof x === 'number' && typeof y === 'number');
  const n = pairs.length;
  if (!n) return 0;

  const avgA = sum(pairs.map(pair => pair[0])) / n;
  const avgB = sum(pairs.map(pair => pair[1])) / n;
  const numerator = sum(pairs.map(([x, y]) => (x - avgA) * (y - avgB)));
  const denominator = Math.sqrt(sum(pairs.map(([x]) => (x - avgA) ** 2)) * sum(pairs.map(([, y]) => (y - avgB) ** 2)));
  return denominator ? numerator / denominator : 0;
}

function exportCSV() {
  const csv = [headers.join(',')]
    .concat(filteredRows.map(row => headers.map(header => csvEscape(row[header])).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'filtered-data.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatNumber(value) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

els.csvFile.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    rows = parseCSV(reader.result);
    headers = rows.length ? Object.keys(rows[0]) : [];
    filteredRows = [...rows];
    sortState = { key: null, direction: 1 };
    els.datasetName.textContent = file.name;
    els.statusText.textContent = `${rows.length} rows loaded`;
    refreshControls();
    applyFilters();
  };
  reader.readAsText(file);
});

els.sampleBtn.addEventListener('click', () => {
  rows = [...sampleRows];
  headers = Object.keys(rows[0]);
  filteredRows = [...rows];
  els.datasetName.textContent = 'Sample business data';
  els.statusText.textContent = 'Sample data loaded';
  refreshControls();
  applyFilters();
});

els.exportBtn.addEventListener('click', exportCSV);
els.searchInput.addEventListener('input', applyFilters);
els.groupColumn.addEventListener('change', render);
els.metricColumn.addEventListener('change', render);
els.chartType.addEventListener('change', renderChart);
els.darkMode.addEventListener('change', () => {
  document.body.classList.toggle('dark', els.darkMode.checked);
  renderChart();
});
window.addEventListener('resize', renderChart);

refreshControls();
applyFilters();
