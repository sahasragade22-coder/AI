const demoCsv = `Date,Region,Product,Sales,Profit,Units,Channel
2026-01-04,North,Laptop,18400,4120,23,Online
2026-01-06,South,Tablet,9200,1880,31,Retail
2026-01-09,West,Monitor,12600,3150,42,Partner
2026-01-12,East,Laptop,21100,5020,29,Online
2026-01-15,North,Phone,15800,3476,54,Retail
2026-01-18,South,Monitor,10300,2163,34,Online
2026-01-21,West,Laptop,24800,6200,31,Partner
2026-01-25,East,Tablet,11800,2478,39,Retail
2026-02-02,North,Monitor,14300,3432,48,Online
2026-02-06,South,Phone,17200,3612,61,Partner
2026-02-11,West,Tablet,13500,2835,45,Retail
2026-02-16,East,Phone,19600,4704,66,Online
2026-02-20,North,Laptop,22900,5725,28,Partner
2026-02-25,South,Laptop,20100,4422,26,Retail
2026-03-01,West,Phone,18700,4301,59,Online
2026-03-05,East,Monitor,15100,3624,51,Partner
2026-03-12,North,Tablet,12300,2583,41,Retail
2026-03-18,South,Monitor,13700,3014,44,Online
2026-03-24,West,Laptop,26300,6575,33,Partner
2026-03-30,East,Phone,21400,5136,72,Retail`;

const state = {
  rows: [],
  columns: [],
  types: {},
  filteredRows: []
};

const els = {
  csvInput: document.querySelector('#csvInput'),
  loadDemo: document.querySelector('#loadDemo'),
  chartType: document.querySelector('#chartType'),
  xField: document.querySelector('#xField'),
  yField: document.querySelector('#yField'),
  aggregation: document.querySelector('#aggregation'),
  filterField: document.querySelector('#filterField'),
  filterValue: document.querySelector('#filterValue'),
  clearFilter: document.querySelector('#clearFilter'),
  resetReport: document.querySelector('#resetReport'),
  downloadData: document.querySelector('#downloadData'),
  kpiGrid: document.querySelector('#kpiGrid'),
  fieldList: document.querySelector('#fieldList'),
  dataTable: document.querySelector('#dataTable'),
  chartCanvas: document.querySelector('#chartCanvas'),
  chartTitle: document.querySelector('#chartTitle'),
  rowCount: document.querySelector('#rowCount'),
  previewMeta: document.querySelector('#previewMeta')
};

const palette = ['#d95836', '#0f766e', '#243b53', '#e3a008', '#7c3f2c', '#2f855a', '#b7791f', '#2b6cb0'];
const moneyFields = ['sales', 'revenue', 'profit', 'amount', 'price', 'cost'];

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`);
  return rows.slice(1).map(values => headers.reduce((record, header, index) => {
    record[header] = values[index] ?? '';
    return record;
  }, {}));
}

function inferTypes(rows, columns) {
  return columns.reduce((types, column) => {
    const sample = rows.map(row => row[column]).filter(value => value !== '').slice(0, 20);
    const numericCount = sample.filter(value => Number.isFinite(Number(value))).length;
    types[column] = sample.length && numericCount / sample.length > 0.75 ? 'number' : 'text';
    return types;
  }, {});
}

function loadRows(rows) {
  state.rows = rows;
  state.columns = Object.keys(rows[0] || {});
  state.types = inferTypes(rows, state.columns);
  state.filteredRows = [...rows];
  hydrateControls();
  renderAll();
}

function hydrateControls() {
  const numericFields = state.columns.filter(column => state.types[column] === 'number');
  const textFields = state.columns.filter(column => state.types[column] !== 'number');
  const defaultX = textFields[0] || state.columns[0] || '';
  const defaultY = numericFields[0] || state.columns[0] || '';

  fillSelect(els.xField, state.columns, defaultX);
  fillSelect(els.yField, state.columns, defaultY);
  fillSelect(els.filterField, ['All fields', ...state.columns], 'All fields');
  els.filterValue.value = '';
}

function fillSelect(select, options, selected) {
  select.innerHTML = options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
  select.value = selected;
}

function applyFilter() {
  const needle = els.filterValue.value.toLowerCase().trim();
  const field = els.filterField.value;

  if (!needle) {
    state.filteredRows = [...state.rows];
    return;
  }

  state.filteredRows = state.rows.filter(row => {
    const values = field === 'All fields' ? Object.values(row) : [row[field]];
    return values.some(value => String(value).toLowerCase().includes(needle));
  });
}

function aggregateRows() {
  const x = els.xField.value;
  const y = els.yField.value;
  const method = els.aggregation.value;
  const groups = new Map();

  state.filteredRows.forEach(row => {
    const key = row[x] || 'Blank';
    const value = Number(row[y]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(Number.isFinite(value) ? value : 0);
  });

  return [...groups.entries()].map(([label, values]) => {
    let value = values.reduce((sum, item) => sum + item, 0);
    if (method === 'avg') value = value / values.length;
    if (method === 'count') value = values.length;
    if (method === 'min') value = Math.min(...values);
    if (method === 'max') value = Math.max(...values);
    return { label, value };
  }).sort((a, b) => b.value - a.value).slice(0, 14);
}

function renderAll() {
  applyFilter();
  renderKpis();
  renderFields();
  renderTable();
  renderChart();
  els.rowCount.textContent = `${state.filteredRows.length} rows`;
}

function renderKpis() {
  const numericFields = state.columns.filter(column => state.types[column] === 'number');
  const primaryMetric = els.yField.value || numericFields[0];
  const total = sumField(state.filteredRows, primaryMetric);
  const avg = state.filteredRows.length ? total / state.filteredRows.length : 0;
  const uniqueX = new Set(state.filteredRows.map(row => row[els.xField.value])).size;

  const cards = [
    ['Rows', state.filteredRows.length.toLocaleString(), 'Filtered records'],
    [`Total ${primaryMetric || 'Value'}`, formatMetric(total, primaryMetric), 'Aggregated measure'],
    [`Avg ${primaryMetric || 'Value'}`, formatMetric(avg, primaryMetric), 'Per row average'],
    ['Segments', uniqueX.toLocaleString(), `Unique ${els.xField.value || 'categories'}`]
  ];

  els.kpiGrid.innerHTML = cards.map(([label, value, hint]) => `
    <article class="kpi-card">
      <p class="eyebrow">${escapeHtml(hint)}</p>
      <div>${escapeHtml(label)}</div>
      <div class="kpi-value">${escapeHtml(value)}</div>
    </article>
  `).join('');
}

function renderFields() {
  els.fieldList.innerHTML = state.columns.map(column => `
    <div class="field-chip">
      <span>${escapeHtml(column)}</span>
      <span class="field-type">${state.types[column]}</span>
    </div>
  `).join('');
}

function renderTable() {
  const previewRows = state.filteredRows.slice(0, 50);
  els.previewMeta.textContent = `${previewRows.length} of ${state.filteredRows.length}`;

  if (!state.columns.length) {
    els.dataTable.innerHTML = '';
    return;
  }

  els.dataTable.innerHTML = `
    <thead><tr>${state.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
    <tbody>
      ${previewRows.map(row => `<tr>${state.columns.map(column => `<td>${escapeHtml(row[column])}</td>`).join('')}</tr>`).join('')}
    </tbody>
  `;
}

function renderChart() {
  const canvas = els.chartCanvas;
  const ctx = canvas.getContext('2d');
  const data = aggregateRows();
  const chartType = els.chartType.value;
  const x = els.xField.value;
  const y = els.yField.value;

  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  els.chartTitle.textContent = `${titleCase(els.aggregation.value)} ${y} by ${x}`;

  if (!data.length) {
    drawEmpty(ctx, width, height);
    return;
  }

  if (chartType === 'bar') drawBar(ctx, data, width, height);
  if (chartType === 'line') drawLine(ctx, data, width, height);
  if (chartType === 'pie') drawDonut(ctx, data, width, height);
  if (chartType === 'scatter') drawScatter(ctx, data, width, height);
}

function drawAxes(ctx, width, height, max) {
  const left = 62;
  const bottom = height - 58;
  ctx.strokeStyle = '#b9ad99';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, 28);
  ctx.lineTo(left, bottom);
  ctx.lineTo(width - 24, bottom);
  ctx.stroke();

  ctx.fillStyle = '#687382';
  ctx.font = '12px Trebuchet MS';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i += 1) {
    const value = max * (i / 4);
    const y = bottom - (bottom - 34) * (i / 4);
    ctx.fillText(compactNumber(value), left - 8, y + 4);
    ctx.strokeStyle = 'rgba(31, 41, 51, 0.07)';
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
}

function drawBar(ctx, data, width, height) {
  const max = Math.max(...data.map(item => item.value), 1);
  const left = 62;
  const bottom = height - 58;
  const plotWidth = width - left - 32;
  const plotHeight = bottom - 34;
  const barWidth = Math.max(16, plotWidth / data.length - 12);
  drawAxes(ctx, width, height, max);

  data.forEach((item, index) => {
    const x = left + 12 + index * (plotWidth / data.length);
    const barHeight = (item.value / max) * plotHeight;
    const y = bottom - barHeight;
    roundedRect(ctx, x, y, barWidth, barHeight, 10, palette[index % palette.length]);
    ctx.fillStyle = '#243b53';
    ctx.font = '12px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(x + barWidth / 2, bottom + 16);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(truncate(item.label, 12), 0, 0);
    ctx.restore();
  });
}

function drawLine(ctx, data, width, height) {
  const max = Math.max(...data.map(item => item.value), 1);
  const left = 62;
  const bottom = height - 58;
  const plotWidth = width - left - 38;
  const plotHeight = bottom - 34;
  drawAxes(ctx, width, height, max);

  const points = data.map((item, index) => ({
    x: left + index * (plotWidth / Math.max(data.length - 1, 1)),
    y: bottom - (item.value / max) * plotHeight,
    label: item.label
  }));

  ctx.strokeStyle = '#d95836';
  ctx.lineWidth = 4;
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.fillStyle = palette[index % palette.length];
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#243b53';
    ctx.font = '12px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText(truncate(point.label, 10), point.x, bottom + 20);
  });
}

function drawDonut(ctx, data, width, height) {
  const total = data.reduce((sum, item) => sum + Math.max(item.value, 0), 0) || 1;
  const radius = Math.min(width, height) * 0.29;
  const cx = width * 0.36;
  const cy = height * 0.51;
  let start = -Math.PI / 2;

  data.forEach((item, index) => {
    const angle = (Math.max(item.value, 0) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();
    start += angle;
  });

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#243b53';
  ctx.font = 'bold 26px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(compactNumber(total), cx, cy + 8);

  ctx.textAlign = 'left';
  ctx.font = '13px Trebuchet MS';
  data.slice(0, 9).forEach((item, index) => {
    const y = 70 + index * 34;
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(width * 0.66, y - 11, 18, 18);
    ctx.fillStyle = '#243b53';
    ctx.fillText(`${truncate(item.label, 18)} - ${compactNumber(item.value)}`, width * 0.66 + 28, y + 3);
  });
}

function drawScatter(ctx, data, width, height) {
  const max = Math.max(...data.map(item => item.value), 1);
  const left = 62;
  const bottom = height - 58;
  const plotWidth = width - left - 42;
  const plotHeight = bottom - 34;
  drawAxes(ctx, width, height, max);

  data.forEach((item, index) => {
    const x = left + 20 + ((index + 0.5) / data.length) * plotWidth;
    const y = bottom - (item.value / max) * plotHeight;
    const size = 8 + (item.value / max) * 20;
    ctx.fillStyle = palette[index % palette.length];
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#243b53';
    ctx.font = '12px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText(truncate(item.label, 10), x, bottom + 20);
  });
}

function drawEmpty(ctx, width, height) {
  ctx.fillStyle = '#687382';
  ctx.font = '18px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('No data matches the current filter.', width / 2, height / 2);
}

function roundedRect(ctx, x, y, width, height, radius, color) {
  const safeRadius = Math.min(radius, width / 2, Math.abs(height) / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.fill();
}

function exportFilteredCsv() {
  if (!state.filteredRows.length) return;
  const csv = [
    state.columns.join(','),
    ...state.filteredRows.map(row => state.columns.map(column => csvCell(row[column])).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'insightforge-filtered-data.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sumField(rows, field) {
  return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}

function formatMetric(value, field = '') {
  const isMoney = moneyFields.some(name => field.toLowerCase().includes(name));
  const formatted = compactNumber(value);
  return isMoney ? `$${formatted}` : formatted;
}

function compactNumber(value) {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

function truncate(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

els.loadDemo.addEventListener('click', () => loadRows(parseCsv(demoCsv)));
els.csvInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadRows(parseCsv(reader.result));
  reader.readAsText(file);
});

[els.chartType, els.xField, els.yField, els.aggregation, els.filterField].forEach(control => {
  control.addEventListener('change', renderAll);
});
els.filterValue.addEventListener('input', renderAll);
els.clearFilter.addEventListener('click', () => {
  els.filterValue.value = '';
  els.filterField.value = 'All fields';
  renderAll();
});
els.resetReport.addEventListener('click', () => loadRows(parseCsv(demoCsv)));
els.downloadData.addEventListener('click', exportFilteredCsv);
window.addEventListener('resize', renderChart);

loadRows(parseCsv(demoCsv));
