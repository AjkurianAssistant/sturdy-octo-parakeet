# Project HELIOS - Astronomical Command Center

![HELIOS NOMINAL](https://img.shields.io/badge/HELIOS-NOMINAL-00FF41?style=for-the-badge)

[**Live Dashboard**](https://ajkurianassistant.github.io/sturdy-octo-parakeet/)

Project HELIOS is a Chromecast-optimized astronomical dashboard built to provide real-time tracking of Solar Flares and Near Earth Objects (Asteroids).

Designed for 10-foot viewing experiences, HELIOS utilizes a custom dark theme with high-legibility typography, ensuring critical astronomical data is accessible at a glance.

## 🚀 Features

*   **Real-Time Telemetry:** Integrates with NASA Open APIs:
    *   **DONKI:** Tracks Solar Flare activity over the last 7 days.
    *   **NeoWs:** Monitors Near Earth Objects passing by today.
*   **Chromecast Optimized UI:**
    *   Dark theme designed to prevent screen burn-in and reduce eye strain in low-light environments.
    *   'Glow-State' indicators: Custom matrix green (`#00FF41`) for safe levels and neon red (`#FF3131`) for critical alerts.
*   **Interactive Visualizations:** Close approach distances of NEOs rendered using Chart.js.
*   **Robust State Management:**
    *   Vanilla JS Proxy-based state management.
    *   5-minute polling interval to ensure data freshness.
*   **Graceful Degradation:** Resilient to volatile APIs with dedicated 'Loading' and 'API Offline' (rate-limited) states.

## 🛠️ Technology Stack

*   **HTML5**
*   **Tailwind CSS:** For rapid, utility-first styling.
*   **Vanilla JS (ES6+):** Leveraging Proxy for reactivity.
*   **Chart.js:** For data visualization.
*   **Day.js:** For lightweight, robust date formatting.

## ⚙️ Getting Started

Because HELIOS is a static client-side application, running it is simple:

1.  Clone the repository:
    ```bash
    git clone https://github.com/AjkurianAssistant/sturdy-octo-parakeet.git
    ```
2.  Open `index.html` in your preferred modern web browser.

*Note: The application uses a `DEMO_KEY` for NASA APIs, which is subject to strict rate limits. For consistent usage, replace it with your own API key in `api-client.js`.*

## 📡 API Integration Details

HELIOS treats external APIs as volatile. It implements defensive programming strategies:
*   **Rate Limit Handling:** Detects HTTP 429 and transitions to a localized offline state, maintaining previously cached data visually if available.
*   **Concurrent Fetching:** Uses `Promise.all` to grab DONKI and NeoWs data simultaneously to minimize time-to-glass.
