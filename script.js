async function fetchAndRenderCSV() {
    const statusEl = document.getElementById('status');
    const container = document.getElementById('table-container');

    try {
        // 1. Fetch from your Python Route instead of the file directly
        const res = await fetch('/api/data'); 
        
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        
        // 2. Parse as JSON (JavaScript Object) instead of Text
        const data = await res.json(); 

        if (data.error) throw new Error(data.error);

        // 3. Build table from JSON data
        const table = buildTableFromJSON(data); 
        
        container.innerHTML = '';
        container.appendChild(table);
        statusEl.textContent = `Loaded ${data.length} rows`;

        // Search logic remains mostly the same
        const search = document.getElementById('search');
        search.addEventListener('input', () => {
            filterTable(table, search.value.trim().toLowerCase());
        });

    } catch (err) {
        console.error(err);
        statusEl.textContent = 'Failed to load data';
        document.getElementById('error').textContent = err.message;
    }
}

// NEW: This function is much simpler than parsing CSV text strings!
function buildTableFromJSON(data) {
    const table = document.createElement('table');
    table.className = 'data-table';
    
    if (data.length === 0) return table;

    // A. Create Headers from the keys of the first object
    const headers = Object.keys(data[0]);
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h; // Make sure headers match CSV columns
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // B. Create Body
    const tbody = document.createElement('tbody');
    data.forEach(rowObj => {
        const tr = document.createElement('tr');
        headers.forEach(key => {
            const td = document.createElement('td');
            td.textContent = rowObj[key];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    return table;
}

// Keep your existing filterTable function, it works fine!
function filterTable(table, q) {
    const rows = table.tBodies[0].rows;
    for (const row of rows) {
        const text = row.textContent.toLowerCase();
        row.style.display = q === '' || text.includes(q) ? '' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', fetchAndRenderCSV);