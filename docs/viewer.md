# Viewer Architecture

The `viewer/` directory contains the frontend application used to display internship offers. It is a lightweight, static web application built with vanilla HTML, CSS, and ES6 JavaScript. No bundlers or build steps (like Webpack or Vite) are required, as it relies entirely on native browser ES modules.

## File Structure

The JavaScript codebase is split into focused, single-responsibility modules under `viewer/js/`:

- **`main.js`**: The application entry point. It orchestrates the initial data fetching and initializes the UI.
- **`state.js`**: Manages the application state, including the currently selected filters, sorting preferences, and the core filtering logic (`filterData`). It also stores the configurations for the different types of offers (e.g., Curricular vs. Extracurricular).
- **`ui.js`**: Handles all DOM interactions, event listeners, and UI rendering. It is responsible for dynamically updating the grid layout (`fillGridGaps`), expanding/collapsing cards, and rendering the filtered results.
- **`components.js`**: Contains pure functions that take a data object and return the HTML string representation of a card. This keeps HTML templating isolated from the UI logic.
- **`parsers.js`**: Contains normalization functions that format the raw JSON data downloaded by the scraper into a consistent structure for the UI to consume.
- **`bookmarks.js`**: Manages the "favorite" functionality by syncing the user's bookmarked offers with the browser's `localStorage`.
- **`utils.js`**: A collection of standalone utility functions, such as HTML escaping (`esc`) and custom string comparators for sorting (`collator`).

## Key Features

- **No Build Step**: Leveraging `<script type="module">` in `index.html` allows for a clean, modular architecture directly in the browser, making the codebase highly accessible and easy to maintain.
- **Client-Side Filtering & Search**: All filtering (by sector, location, etc.) and keyword searching happens instantly on the client side without needing a backend API.
- **Responsive Layouts**: The UI seamlessly transitions between list and grid views, adjusting dynamically to the available screen space. Card heights and truncations are calculated dynamically to avoid visual bugs and minimize overflow.
- **Local Persistence**: User preferences, such as the selected layout mode and bookmarked offers, are securely saved in `localStorage`.
