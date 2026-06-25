# 🌳 Gupta Family Tree

A beautiful, free, interactive family tree for the **Gupta family** — 27 members across 3 generations, hosted on **GitHub Pages**, live data from **Google Sheets**.

**Live demo:** `https://ivarunbansal.github.io/FamilyTree`

---

## ✨ Features

- 📊 **Live Google Sheets data** — edit the sheet, the site updates automatically
- 📸 **Photos via Google Drive** — paste a shareable link, no uploads needed
- 🔐 **Admin / viewer roles** — password-protected editing (no server needed)
- 🌲 **Interactive D3 tree** — zoom, pan, click to open profiles
- 🔍 **Search & filter** — by name, generation, surname
- 💑 **Relationship finder** — shows the path between any two members
- 📅 **Timeline** — births, marriages, deaths
- 🖼 **Photo gallery** — lightbox viewer
- 🖨 **Export** — PNG download, print view
- 📱 **Mobile responsive**
- 🌙 **Dark mode toggle**
- ⚡ **100% free** — no backend, no database, no paid service

---

## 🚀 Quick setup (5 minutes)

### Step 1 — Fork / clone this repo

```bash
git clone https://github.com/ivarunbansal/FamilyTree.git
cd FamilyTree
```

### Step 2 — Create your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) → create a new sheet
2. Add these exact column headers in row 1:

```
ID | Name | Gender | FatherID | MotherID | SpouseID | PhotoURL | DOB | DOD | MarriageDate | Occupation | Education | City | Bio | Email | Phone | Generation
```

3. Your family data is already in `data/sample-data.csv` — use it to populate your sheet
4. **Publish to web:**
   - File → Share → Publish to web
   - Select **Sheet 1** and **Comma-separated values (.csv)**
   - Click **Publish** → copy the URL

### Step 3 — Configure `config.js`

Open `config.js` and fill in:

```js
window.FT_CONFIG = {
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/YOUR_ID/pub?output=csv",
  ADMIN_PASSWORD: "your_secret_password",
  FAMILY_NAME: "The Bansal Family",
  SITE_TITLE: "Bansal Family Tree",
  TAGLINE: "Our roots, our story — across generations",
  // ...
};
```

### Step 4 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Push to `main` — the site deploys automatically

Your site will be live at `https://YOUR-USERNAME.github.io/FamilyTree`

---

## 📸 Adding photos

### Option A — Google Drive (recommended, free)
1. Upload the photo to Google Drive
2. Right-click → **Share** → **Anyone with the link can view** → copy link
3. Paste the link in the `PhotoURL` column of your sheet

The app automatically converts `drive.google.com/file/d/FILE_ID/view` links to displayable thumbnails.

### Option B — Imgur (free)
1. Go to [imgur.com](https://imgur.com) → upload
2. Right-click the image → Copy image address
3. Paste in `PhotoURL`

### Option C — Any public image URL
Just paste any direct image URL (ending in `.jpg`, `.png`, etc.)

---

## 🔐 Admin vs. Viewer roles

| Feature | Viewer | Admin |
|---------|--------|-------|
| View tree | ✅ | ✅ |
| Search & filter | ✅ | ✅ |
| View profiles | ✅ | ✅ |
| Add member | ❌ | ✅ |
| Edit member | ❌ | ✅ |
| Delete member | ❌ | ✅ |

**To become admin:** Click "Admin" in the top bar → enter the password from `config.js`.

When you add/edit a member, the app generates a CSV row. Copy it and paste it into your Google Sheet. The site syncs automatically — no redeploy needed.

---

## 📋 Sheet column reference

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `ID` | ✅ | Unique number for each person | `1` |
| `Name` | ✅ | Full name | `Rajesh Kumar Bansal` |
| `Gender` | | Male / Female / Other | `Male` |
| `FatherID` | | ID of father | `1` |
| `MotherID` | | ID of mother | `2` |
| `SpouseID` | | ID of spouse | `5` |
| `PhotoURL` | | Google Drive or image URL | see above |
| `DOB` | | Date of birth | `15 Mar 1955` |
| `DOD` | | Date of death (blank = living) | `10 Jan 2020` |
| `MarriageDate` | | Marriage date | `20 Nov 1982` |
| `Occupation` | | Job title | `Engineer` |
| `Education` | | Highest degree | `B.Tech IIT` |
| `City` | | Current city | `Delhi` |
| `Bio` | | Short biography | Free text |
| `Email` | | Email address | |
| `Phone` | | Phone number | |
| `Generation` | | Generation number (1 = oldest) | `2` |

---

## 🛠 Local development

Just open `index.html` in a browser. For the Google Sheet to work locally, run a simple server:

```bash
# Python 3
python -m http.server 8080
# then open http://localhost:8080
```

---

## 🔄 Updating data

1. Edit your Google Sheet directly
2. Click **↻ Sync** in the app toolbar — data refreshes instantly
3. No redeployment needed for data changes

Only code changes (HTML/CSS/JS) require a git push to redeploy.

---

## 📁 File structure

```
FamilyTree/
├── index.html              # Main app
├── config.js               # ← YOU EDIT THIS
├── css/
│   └── styles.css          # Styles
├── js/
│   ├── app.js              # Application logic
│   └── tree-d3.js          # D3 tree renderer
├── data/
│   └── sample-data.csv     # Sample sheet format
├── .github/
│   └── workflows/
│       └── deploy.yml      # Auto-deploy to GitHub Pages
├── .nojekyll               # Tells GitHub Pages not to use Jekyll
└── README.md
```

---

## 🐛 Troubleshooting

**Tree not loading?**
- Check that your sheet is published to the web as CSV
- Make sure the URL in `config.js` ends with `?output=csv`
- Open browser console (F12) for error details

**Photos not showing?**
- Google Drive: make sure the file is shared as "Anyone with the link"
- The photo link must be a direct file link, not a folder link

**GitHub Pages shows 404?**
- Go to Settings → Pages → Source = GitHub Actions
- Make sure the workflow ran successfully under the Actions tab

---

## 📄 License

MIT — free for personal and family use.
