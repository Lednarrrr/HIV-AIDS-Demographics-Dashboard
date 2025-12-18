async function fetchAndRenderCSV() {
    const statusEl = document.getElementById('status');
    const container = document.getElementById('table-container');

    try {
        // 1. Fetch from your Python Route instead of the file directly
        const res = await fetch('datasets/data.csv');
        
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        
        // 2. Parse as JSON (JavaScript Object) instead of Text
        const data = await res.json(); 
        renderBarChart(data);
        renderLineChart(data); // NEW: Yearly Trend Line Chart
        renderSexRatioChart(data);
        renderRiskChart(data);
        renderTransmissionChart(data);
        renderAgeGroupChart(data);

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

function parseCsvToObjects(csvText) {
    const lines = csvText.split(/\r?\n/); // Split rows
    const headers = lines[0].split(',').map(h => h.trim()); // Get headers
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        // Simple split by comma (works for your data since it has no commas inside values)
        const currentLine = line.split(',');

        if (currentLine.length === headers.length) {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = currentLine[index].trim();
            });
            result.push(obj);
        }
    }
    return result;
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

function renderBarChart(rawData) {
    // --- STEP 1: AGGREGATE (Count Rows per Region) ---
    const accumulator = {};

    rawData.forEach(row => {
        // 1. Get the Region Name
        // Check your console logs if "Region" needs to be lowercase "region"
        const region = row.Region || row.region; 

        // 2. The Logic Change:
        // instead of reading a 'TotalCases' column, we just assume this row = 1 case.
        const cases = 1; 

        if (accumulator[region]) {
            accumulator[region] += cases; // Add 1 to the existing count
        } else {
            accumulator[region] = cases;  // Start the count at 1
        }
    });

    // --- STEP 2: CONVERT BACK TO ARRAY ---
    // Now 'accumulator' is an object like { "NCR": 5000, "Region IV-A": 3000 }
    // We need to turn it back into a list so we can sort it.
    let aggregatedData = Object.keys(accumulator).map(regionName => {
        return {
            Region: regionName,
            TotalCases: accumulator[regionName]
        };
    });

    // --- STEP 3: SORT (High to Low) ---
    aggregatedData.sort((a, b) => b.TotalCases - a.TotalCases);

    // --- STEP 4: PREPARE FOR CHART.JS ---
    const labels = aggregatedData.map(item => item.Region);
    const values = aggregatedData.map(item => item.TotalCases);

    // --- STEP 5: DRAW ---
    const ctx = document.getElementById('myChart').getContext('2d');
    
    if (window.myBarChart) window.myBarChart.destroy();

    window.myBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Cases by Region',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            // This ensures the axis starts at 0 so the bars are accurate
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// --- NEW FUNCTION: Renders the Line Graph per Year ---
function renderLineChart(rawData) {
    const yearCounts = {};

    rawData.forEach(row => {
        // row.Diagnosis_Date format is "YYYY-MM-DD"
        // We take the first 4 characters to get the Year
        const dateStr = row.Diagnosis_Date || row.diagnosis_date;
        if (dateStr) {
            const year = dateStr.substring(0, 4);
            
            if (yearCounts[year]) {
                yearCounts[year]++;
            } else {
                yearCounts[year] = 1;
            }
        }
    });

    // Sort years (2010, 2011, ... 2024)
    const years = Object.keys(yearCounts).sort();
    const counts = years.map(year => yearCounts[year]);

    // Draw the Line Chart
    // Make sure you have <canvas id="lineChart"></canvas> in your HTML
    const ctx = document.getElementById('lineChart').getContext('2d');

    if (window.myLineChart) window.myLineChart.destroy();

    window.myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Cases per Year (The Rise)',
                data: counts,
                borderColor: '#FF6384', // Red/Pink line
                backgroundColor: 'rgba(255, 99, 132, 0.2)', // Light fill under line
                tension: 0.4, // Makes the line slightly curved (smooth)
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Annual HIV Case Trend (2010-2024)'
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderSexRatioChart(rawData) {
    let maleCount = 0;
    let femaleCount = 0;

    // 1. Count the Data
    rawData.forEach(row => {
        const sex = row.Sex || row.sex;
        if (sex === 'Male') maleCount++;
        else if (sex === 'Female') femaleCount++;
    });

    const total = maleCount + femaleCount;

    // 2. Calculate Percentages
    const malePercent = ((maleCount / total) * 100).toFixed(1) + '%';
    const femalePercent = ((femaleCount / total) * 100).toFixed(1) + '%';

    // 3. Create Custom Labels for the Legend
    const maleLabel = `Male: ${maleCount} (${malePercent})`;
    const femaleLabel = `Female: ${femaleCount} (${femalePercent})`;

    const ctx = document.getElementById('sexRatioChart').getContext('2d');

    // 4. Destroy previous instance to prevent "flickering" or errors
    if (window.mySexChartInstance) {
        window.mySexChartInstance.destroy();
    }

    // 5. Render Chart
    window.mySexChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            // USE THE CUSTOM LABELS HERE
            labels: [maleLabel, femaleLabel], 
            datasets: [{
                data: [maleCount, femaleCount],
                backgroundColor: [
                    '#36A2EB', // Blue for Male
                    '#FF6384'  // Pink for Female
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            //maintainAspectRatio: false, // Prevents it from getting too huge
            plugins: {
                title: {
                    display: true,
                    text: 'Sex Distribution (Total: ' + total + ')',
                    font: { size: 16 }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 14, weight: 'bold' },
                        padding: 20
                    }
                },
                // We keep the tooltip just in case they still hover
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label; 
                        }
                    }
                }
            }
        }
    });
}

function renderRiskChart(rawData) {
    // 1. Initialize Counts
    const counts = {
        'MSM': 0,
        'Heterosexual': 0,
        'Bisexual': 0,
        'Unknown': 0
    };

    // 2. Count the Data
    rawData.forEach(row => {
        // Handle different casing just in case
        const risk = row.Risk_Category || row.risk_category;
        
        if (risk === 'MSM') counts['MSM']++;
        else if (risk === 'Heterosexual') counts['Heterosexual']++;
        else if (risk === 'Bisexual') counts['Bisexual']++;
        else counts['Unknown']++; // Catches empty or "Unknown"
    });

    // 3. Prepare Chart Data
    const ctx = document.getElementById('riskChart').getContext('2d');

    if (window.myRiskChartInstance) {
        window.myRiskChartInstance.destroy();
    }

    window.myRiskChartInstance = new Chart(ctx, {
        type: 'pie', // You requested a Pie Chart
        data: {
            labels: ['MSM', 'Heterosexual', 'Bisexual', 'Unknown'],
            datasets: [{
                data: [
                    counts['MSM'], 
                    counts['Heterosexual'], 
                    counts['Bisexual'], 
                    counts['Unknown']
                ],
                backgroundColor: [
                    '#FF6384', // Red (MSM - High Risk)
                    '#36A2EB', // Blue (Heterosexual)
                    '#FFCE56', // Yellow (Bisexual)
                    '#C9CBCF'  // Grey (Unknown)
                ],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            // maintainAspectRatio: false, // Set to false ONLY if you have the CSS wrapper
            plugins: {
                title: {
                    display: true,
                    text: 'Distribution by Risk Category',
                    font: { size: 16 }
                },
                legend: {
                    position: 'right', // Pie charts often look better with legend on the side
                    labels: {
                        generateLabels: function(chart) {
                            // Helper to show numbers in the legend
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map(function(label, i) {
                                    const value = data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1) + "%";
                                    const fill = data.datasets[0].backgroundColor[i];
                                    
                                    return {
                                        text: `${label}: ${value} (${percentage})`,
                                        fillStyle: fill,
                                        hidden: isNaN(data.datasets[0].data[i]) || chart.getDatasetMeta(0).data[i].hidden,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                }
            }
        }
    });
}

function renderTransmissionChart(rawData) {
    const counts = {
        'Sexual Contact': 0,
        'Sharing of Infected Needles': 0,
        'Mother-to-Child': 0
    };

    rawData.forEach(row => {
        // Handle potential casing/naming issues
        const mode = row.Mode_of_Transmission || row.mode_of_transmission;
        
        if (counts[mode] !== undefined) {
            counts[mode]++;
        } else {
            // Optional: Log unknown modes to console for debugging
            // console.log("Unknown mode:", mode);
        }
    });

    const ctx = document.getElementById('transmissionChart').getContext('2d');

    if (window.myTransmissionChart) window.myTransmissionChart.destroy();

    window.myTransmissionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sexual Contact', 'Sharing of Infected Needles', 'Mother-to-Child'],
            datasets: [{
                label: 'Mode of Transmission',
                data: [
                    counts['Sexual Contact'], 
                    counts['Sharing of Infected Needles'], 
                    counts['Mother-to-Child']
                ],
                backgroundColor: [
                    '#9966FF', // Purple
                    '#FF9F40', // Orange
                    '#4BC0C0'  // Teal
                ],
                borderColor: [
                    '#9966FF',
                    '#FF9F40',
                    '#4BC0C0'
                ],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // <--- THIS MAKES IT HORIZONTAL
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                title: {
                    display: true,
                    text: 'Mode of Transmission',
                    font: { size: 16 }
                },
                legend: {
                    display: false // Hide legend since labels are on the Y-axis
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderAgeGroupChart(rawData) {
    const counts = {};

    rawData.forEach(row => {
        const group = row.Age_Group || row.age_group;
        if (group) {
            counts[group] = (counts[group] || 0) + 1;
        }
    });

    // Custom sort order for Age Groups
    const order = ['<15', '15-24', '25-34', '35-49', '50+'];
    
    // Sort the data according to the 'order' array
    const sortedLabels = order.filter(label => counts[label] !== undefined);
    const sortedData = sortedLabels.map(label => counts[label]);

    const ctx = document.getElementById('ageGroupChart').getContext('2d');

    if (window.myAgeGroupChart) window.myAgeGroupChart.destroy();

    window.myAgeGroupChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'Cases by Age Group',
                data: sortedData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',  // Red for <15
                    'rgba(54, 162, 235, 0.6)',  // Blue for 15-24 (Youth)
                    'rgba(255, 206, 86, 0.6)',  // Yellow for 25-34 (Young Adult)
                    'rgba(75, 192, 192, 0.6)',  // Green for 35-49
                    'rgba(153, 102, 255, 0.6)'  // Purple for 50+
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Ensure you use the CSS wrapper!
            plugins: {
                title: {
                    display: true,
                    text: 'Age Group Distribution',
                    font: { size: 16 }
                },
                legend: {
                    display: false // No need for legend since labels are on X-axis
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Cases'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Age Group'
                    }
                }
            }
        }
    });
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