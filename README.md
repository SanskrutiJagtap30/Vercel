# QuarantineCare - frontend prototype (Vercel-ready)

Plain HTML, CSS and JavaScript. No build step, no npm, no server. Data is stored in the browser (localStorage), pre-filled with 74 demo patients.

Files: `index.html`, `style.css`, `app.js`

## Run locally
Double-click `index.html`, or run `python -m http.server 8000` in this folder and open http://localhost:8000.

## Deploy on Vercel
1. Create a GitHub repo (e.g. `quarantinecare-web`) and upload `index.html`, `style.css`, `app.js` (and this README) at the top level.
2. Go to vercel.com and sign in with GitHub.
3. Add New -> Project -> Import `quarantinecare-web`.
4. Framework Preset: **Other**. Leave Build Command, Output Directory and Install Command empty.
5. Click Deploy. You get a link like https://quarantinecare-web.vercel.app

## Demo
Sign in as Nurse, Doctor or Admin (no password). "Demo tools" in the sidebar: Advance to next day, Reset demo data.
Rules (3 fever-free days, one reading per day, doctor visit only after temperature, admin discharges only after doctor approval, 74-room cap, mortality vs 15%) are in the app logic.
