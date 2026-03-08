# Network Intelligence — Claude Code Handoff

## What this is
A single-page React app that analyses a user's LinkedIn data export entirely in the browser. No backend, no database, no auth. Users upload their LinkedIn zip or Connections.csv and get an instant visual report.

## Repo
https://github.com/robbrowton/network-intelligence.git

## Stack
- React 18 + Vite
- JSZip (npm package) for reading zip files in the browser
- Pure CSS-in-JS (no Tailwind, no component library)
- Google Fonts: Playfair Display + Space Mono

## Your tasks

### 1. Install dependencies and verify it runs
```bash
npm install
npm run dev
```
Open http://localhost:5173 and confirm the upload screen loads correctly.

### 2. Install JSZip
JSZip is used to parse the LinkedIn zip export in the browser:
```bash
npm install jszip
```
It is already imported in src/App.jsx as `import JSZip from "jszip"` — just needs to be in package.json dependencies.

### 3. Push all files to GitHub
```bash
git init  # only if needed
git remote add origin https://github.com/robbrowton/network-intelligence.git
git add .
git commit -m "Initial commit — LinkedIn network analyser"
git push -u origin main
```

### 4. Deploy to Vercel
- Go to vercel.com
- Click "Add New Project"
- Import from GitHub: robbrowton/network-intelligence
- Framework: Vite (auto-detected)
- No environment variables needed
- Deploy

### 5. Verify the deployed app
Test with a real LinkedIn export zip. The app should:
- Accept .zip or .csv upload via drag-drop or click
- Show an animated "Analysing..." screen for ~2 seconds
- Display a results screen with: score hex, 4 stat cards, insights, industry radial chart, seniority bars, timeline chart, company bars
- Show extra tabs if messages.csv or Ad_Targeting.csv are present in the zip
- End with a "Connect on LinkedIn" CTA linking to https://www.linkedin.com/in/robertbrowton

## File structure
```
network-intelligence/
├── index.html          # Entry point
├── vite.config.js      # Vite config
├── vercel.json         # Vercel deployment config
├── package.json        # Dependencies
├── .gitignore
├── public/
│   └── favicon.svg     # Hexagonal N logo
└── src/
    ├── main.jsx        # React root
    └── App.jsx         # Entire app (single file)
```

## Key design decisions
- **All analysis runs client-side** — nothing is sent to a server
- **Single file app** — App.jsx contains everything: styles, data logic, all components
- **No external UI library** — all styles are inline or injected via a global CSS string
- **JSZip handles zip parsing** — finds Connections.csv, messages.csv, Ad_Targeting.csv, inferences.csv automatically

## If something breaks
- If the radial chart looks wrong: check the SVG path calculations in `RadialSegments`
- If CSV parsing fails: check the `parseCSV` function's header detection regex
- If zip parsing fails: check the `processZip` function's file pattern matching
- The app gracefully handles missing files — only shows tabs for data that exists in the upload

## Do not change
- The LinkedIn CTA URL: `https://www.linkedin.com/in/robertbrowton`
- The privacy statement: "Runs entirely in your browser — nothing stored or transmitted"
- The overall dark gold aesthetic
