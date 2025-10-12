# BRNNO Services - Mobile Auto Detailing Marketplace

A modern React application for connecting customers with mobile auto detailing services.

## Features

- **Service Marketplace**: Browse and filter mobile auto detailing services
- **Interactive Filtering**: Filter by area, service type, and quick filters
- **Service Cards**: Beautiful cards displaying service details, ratings, and pricing
- **Responsive Design**: Mobile-first design that works on all devices
- **Modern UI**: Clean, professional interface with smooth animations

## Tech Stack

- React 18
- Tailwind CSS for styling
- Lucide React for icons
- Webpack for bundling

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- `npm start` - Start the development server
- `npm run build` - Build for production
- `npm run dev` - Start development server with auto-open

## Project Structure

```
brnnoservices/
├── public/
│   └── index.html
├── src/
│   ├── BRNNOMarketplace.js
│   ├── index.js
│   └── index.css
├── package.json
├── webpack.config.js
├── tailwind.config.js
└── README.md
```

## Features Overview

### Service Cards

- High-quality service images
- Star ratings and review counts
- Service tags and descriptions
- Starting prices
- Certified provider badges

### Filtering System

- Service area selection
- Service type filtering
- Quick filter buttons (Mobile, Certified, Same Day, Top Rated)
- Sort options (Rating, Reviews, Price, Distance)

### Responsive Design

- Mobile-first approach
- Grid layouts that adapt to screen size
- Touch-friendly interface elements
- Optimized for all device types

## Customization

The application uses Tailwind CSS for styling, making it easy to customize colors, spacing, and layout. The main color scheme uses cyan/blue tones, but can be easily modified in the `tailwind.config.js` file.
