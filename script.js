async function fetchAndRenderCSV() {
	const statusEl = document.getElementById('status');
	const errorEl = document.getElementById('error');
	try {
		const res = await fetch('datasets/data.csv');
		if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
		const text = await res.text();
		const { headers, rows } = parseCSV(text);

		renderSummaryCards(rows);

		const table = buildTable(headers, rows);
		const container = document.getElementById('table-container');
		container.innerHTML = '';
		container.appendChild(table);
		statusEl.textContent = `Loaded ${rows.length} rows`;

		// simple client-side search
		const search = document.getElementById('search');
		search.addEventListener('input', () => {
			const q = search.value.trim().toLowerCase();
			filterTable(table, q);
		});
	} catch (err) {
		console.error(err);
		statusEl.textContent = 'Failed to load data';
		errorEl.textContent = err.message || String(err);
	}
}

function parseCSV(csvText) {
	const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
	const headers = lines.shift().split(',');
	const rows = lines.map(l => {
		const cols = l.split(',');
		const obj = {};
		headers.forEach((h, i) => (obj[h] = cols[i]));
		return obj;
	});
	return { headers, rows };
}

function buildTable(headers, rows) {
	const table = document.createElement('table');
	table.className = 'data-table';
	const thead = document.createElement('thead');
	const headRow = document.createElement('tr');
	headers.forEach(h => {
		const th = document.createElement('th');
		th.textContent = h;
		headRow.appendChild(th);
	});
	thead.appendChild(headRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (const r of rows) {
		const tr = document.createElement('tr');
		headers.forEach(h => {
			const td = document.createElement('td');
			td.textContent = r[h] || '';
			tr.appendChild(td);
		});
		tbody.appendChild(tr);
	}
	table.appendChild(tbody);
	return table;
}

function renderSummaryCards(rows) {
	const cards = document.getElementById('cards');
	cards.innerHTML = '';
	const total = rows.length;

	const bySex = rows.reduce((acc, r) => {
		const k = (r.Sex || 'Unknown');
		acc[k] = (acc[k] || 0) + 1;
		return acc;
	}, {});

	const byRegion = rows.reduce((acc, r) => {
		const k = (r.Region || 'Unknown');
		acc[k] = (acc[k] || 0) + 1;
		return acc;
	}, {});

	const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];

	const cardData = [
		{ title: 'Total Cases', value: total },
		{ title: 'Male', value: bySex['Male'] || 0 },
		{ title: 'Female', value: bySex['Female'] || 0 },
		{ title: 'Top Region', value: topRegion ? `${topRegion[0]} (${topRegion[1]})` : '—' }
	];

	for (const c of cardData) {
		const el = document.createElement('div');
		el.className = 'card';
		el.innerHTML = `<div class="card-title">${c.title}</div><div class="card-value">${c.value}</div>`;
		cards.appendChild(el);
	}
}

function filterTable(table, q) {
	const rows = table.tBodies[0].rows;
	for (const row of rows) {
		const text = row.textContent.toLowerCase();
		row.style.display = q === '' || text.includes(q) ? '' : 'none';
	}
}

document.addEventListener('DOMContentLoaded', fetchAndRenderCSV);
