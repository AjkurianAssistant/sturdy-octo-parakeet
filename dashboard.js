// dashboard.js

// Add Day.js plugins
dayjs.extend(window.dayjs_plugin_relativeTime);

// --- State Management ---
const initialState = {
    status: 'LOADING', // LOADING, NOMINAL, ALERT, OFFLINE
    solarFlares: [],
    neoData: {
        count: 0,
        hazardousCount: 0,
        objects: []
    },
    lastUpdated: null,
    isInitialLoad: true
};

// Vanilla JS Proxy for Reactivity
const state = new Proxy(initialState, {
    set(target, property, value) {
        target[property] = value;
        renderUI(property, value);
        return true;
    }
});

// --- Chart.js Configuration ---
let neoChartInstance = null;
Chart.defaults.color = '#9CA3AF';
Chart.defaults.font.family = '"Fira Code", monospace';

function initChart() {
    const ctx = document.getElementById('neoChart').getContext('2d');
    neoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Close Approach Distance (Lunar Distances)',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#E5E7EB'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#374151'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9CA3AF',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// --- Data Fetching & Processing ---

async function fetchTelemetry() {
    try {
        console.log('Fetching telemetry...');

        // Fetch data concurrently
        const [flares, neoResponse] = await Promise.all([
            window.apiClient.getSolarFlares(),
            window.apiClient.getNearEarthObjects()
        ]);

        processSolarFlares(flares);
        processNeoData(neoResponse);

        state.lastUpdated = new Date();
        state.status = determineSystemStatus();

    } catch (error) {
        console.error('Failed to fetch telemetry:', error);

        // If we have an error and it's our first load, show offline
        if (state.isInitialLoad || error.message === 'RATE_LIMITED') {
             state.status = 'OFFLINE';
        } else {
             // If we have cached data, just show alert/offline banner but keep data visible
             state.status = 'OFFLINE_CACHED';
        }
    } finally {
        if (state.isInitialLoad) {
            state.isInitialLoad = false;
        }
    }
}

function processSolarFlares(flares) {
    if (!Array.isArray(flares)) {
        state.solarFlares = [];
        return;
    }

    // Sort by most recent first
    const sortedFlares = flares.sort((a, b) => new Date(b.beginTime) - new Date(a.beginTime));
    state.solarFlares = sortedFlares.slice(0, 5); // Keep top 5
}

function processNeoData(neoResponse) {
    const today = dayjs().format('YYYY-MM-DD');
    const todayNeos = neoResponse.near_earth_objects[today] || [];

    let hazardousCount = 0;
    const processedObjects = todayNeos.map(neo => {
        if (neo.is_potentially_hazardous_asteroid) {
            hazardousCount++;
        }

        const closeApproach = neo.close_approach_data[0];

        return {
            name: neo.name,
            isHazardous: neo.is_potentially_hazardous_asteroid,
            distanceLD: parseFloat(closeApproach.miss_distance.lunar),
            velocity: parseFloat(closeApproach.relative_velocity.kilometers_per_second).toFixed(2),
            diameterMin: neo.estimated_diameter.meters.estimated_diameter_min,
            diameterMax: neo.estimated_diameter.meters.estimated_diameter_max
        };
    });

    // Sort by closest approach
    processedObjects.sort((a, b) => a.distanceLD - b.distanceLD);

    state.neoData = {
        count: neoResponse.element_count,
        hazardousCount: hazardousCount,
        objects: processedObjects.slice(0, 10) // Keep top 10 closest
    };
}

function determineSystemStatus() {
    // Check if any recent flares are X-class (highest danger)
    const hasXClassFlare = state.solarFlares.some(flare => {
         // Check flare time is within last 24h
         const isRecent = dayjs().diff(dayjs(flare.beginTime), 'hour') < 24;
         return isRecent && flare.classType && flare.classType.startsWith('X');
    });

    // Check if any hazardous NEOs are very close (e.g., < 1 Lunar Distance)
    const hasCloseHazard = state.neoData.objects.some(neo => neo.isHazardous && neo.distanceLD < 1.0);

    if (hasXClassFlare || hasCloseHazard) {
        return 'ALERT';
    }
    return 'NOMINAL';
}

// --- UI Rendering ---

function renderUI(property, value) {
    switch (property) {
        case 'status':
            renderStatus(value);
            break;
        case 'solarFlares':
            renderSolarFlares(value);
            break;
        case 'neoData':
            renderNeoData(value);
            break;
        case 'lastUpdated':
            document.getElementById('last-updated').textContent = dayjs(value).format('HH:mm:ss [UTC]');
            break;
        case 'isInitialLoad':
            if (!value) {
                document.getElementById('loading-state').classList.add('hidden');
            }
            break;
    }
}

function renderStatus(status) {
    const statusEl = document.getElementById('system-status');
    const offlineEl = document.getElementById('offline-state');

    // Reset classes
    statusEl.className = 'text-3xl font-bold px-6 py-2 rounded border-2 uppercase mb-2';

    if (status === 'LOADING') {
        statusEl.textContent = 'CONNECTING...';
        statusEl.classList.add('border-gray-500', 'text-gray-500');
        return;
    }

    if (status === 'OFFLINE' || status === 'OFFLINE_CACHED') {
        statusEl.textContent = 'SYSTEM OFFLINE';
        statusEl.classList.add('border-yellow-400', 'glow-offline');

        if (status === 'OFFLINE') {
            offlineEl.classList.remove('hidden');
        } else {
            // Just show banner, keep data
            offlineEl.classList.add('hidden');
        }
        return;
    }

    offlineEl.classList.add('hidden');

    if (status === 'ALERT') {
        statusEl.textContent = 'HIGH ACTIVITY ALERT';
        statusEl.classList.add('border-alert', 'glow-alert');
    } else {
        statusEl.textContent = 'SYSTEM NOMINAL';
        statusEl.classList.add('border-safe', 'glow-safe');
    }
}

function renderSolarFlares(flares) {
    const classEl = document.getElementById('flare-class');
    const listEl = document.getElementById('flare-list');

    if (!flares || flares.length === 0) {
        classEl.textContent = 'NONE';
        classEl.className = 'text-huge font-extrabold glow-safe';
        listEl.innerHTML = '<li class="text-gray-500">No significant activity in the last 7 days.</li>';
        return;
    }

    // Highest flare logic (from the recent ones)
    const highestFlare = flares.reduce((max, flare) => {
        // Simple string comparison works for A, B, C, M, X since char codes are ordered alphabetically
        // but X is higher than M. Actually, A < B < C < M < X. So string comparison mostly works except for numeric part.
        // Let's just find the one with the highest class prefix (X > M > C > B > A)
        const levels = { 'X': 5, 'M': 4, 'C': 3, 'B': 2, 'A': 1 };
        const getLevel = (f) => levels[f.classType.charAt(0)] || 0;

        if (getLevel(flare) > getLevel(max)) return flare;
        // If same letter, check number
        if (getLevel(flare) === getLevel(max)) {
            const numF = parseFloat(flare.classType.substring(1)) || 0;
            const numM = parseFloat(max.classType.substring(1)) || 0;
            return numF > numM ? flare : max;
        }
        return max;
    }, flares[0]);

    classEl.textContent = highestFlare.classType;

    // Color coding based on flare class
    const flareType = highestFlare.classType.charAt(0);
    if (flareType === 'X' || flareType === 'M') {
        classEl.className = 'text-huge font-extrabold glow-alert';
    } else {
        classEl.className = 'text-huge font-extrabold glow-safe';
    }

    // Render list
    listEl.innerHTML = '';
    flares.forEach(flare => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-gray-800 p-3 rounded';

        const fType = flare.classType.charAt(0);
        const colorClass = (fType === 'X' || fType === 'M') ? 'text-neon-red' : 'text-matrix-green';

        const timeAgo = dayjs(flare.beginTime).fromNow();

        li.innerHTML = `
            <span class="${colorClass} font-bold text-3xl">${flare.classType}</span>
            <div class="text-right">
                <span class="block text-gray-300">${dayjs(flare.beginTime).format('MMM D, HH:mm')}</span>
                <span class="block text-sm text-gray-500">${timeAgo}</span>
            </div>
        `;
        listEl.appendChild(li);
    });
}

function renderNeoData(data) {
    document.getElementById('neo-count').textContent = data.count;

    const hazardEl = document.getElementById('neo-hazard-count');
    hazardEl.textContent = data.hazardousCount;
    if (data.hazardousCount > 0) {
        hazardEl.className = 'text-4xl font-bold mt-2 glow-alert';
    } else {
        hazardEl.className = 'text-4xl font-bold mt-2 glow-safe';
    }

    updateChart(data.objects);
}

function updateChart(objects) {
    if (!neoChartInstance) return;

    const labels = objects.map(obj => obj.name.replace(/[()]/g, '').trim());
    const data = objects.map(obj => obj.distanceLD);

    // Color coding: Red if hazardous, Green if safe
    const bgColors = objects.map(obj => obj.isHazardous ? 'rgba(255, 49, 49, 0.6)' : 'rgba(0, 255, 65, 0.6)');
    const borderColors = objects.map(obj => obj.isHazardous ? '#FF3131' : '#00FF41');

    neoChartInstance.data.labels = labels;
    neoChartInstance.data.datasets[0].data = data;
    neoChartInstance.data.datasets[0].backgroundColor = bgColors;
    neoChartInstance.data.datasets[0].borderColor = borderColors;

    neoChartInstance.update();
}

// --- Clock ---
function updateClock() {
    const clockEl = document.getElementById('current-time');
    // Using Day.js for formatting
    clockEl.textContent = dayjs().format('YYYY-MM-DD HH:mm:ss [UTC]');
}

// --- Initialization ---

function init() {
    initChart();

    // Start clock
    updateClock();
    setInterval(updateClock, 1000);

    // Initial fetch
    fetchTelemetry();

    // 5-minute polling interval (300,000 ms)
    setInterval(fetchTelemetry, 300 * 1000);
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', init);