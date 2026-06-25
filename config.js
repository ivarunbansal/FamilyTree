/* =====================================================================
   FAMILY TREE — CONFIGURATION
   Sheet: https://docs.google.com/spreadsheets/d/1YpCkLsT6G1qGwdTuyiUpnRoSHKMJMXhGfr6oyshsBm8
   =====================================================================

   HOW TO UPDATE DATA:
   Just edit your Google Sheet — click "↻ Sync" in the app to refresh.

   HOW TO ADD MORE COLUMNS (DOB, Photos, City etc.):
   1. Add column headers to your sheet (e.g. "DOB", "PhotoURL", "City")
   2. Add the matching key below in COLUMNS
   3. Hit Sync — new data appears instantly, no redeployment needed.

   HOW TO GET A FASTER/MORE RELIABLE URL:
   Sheet → File → Share → Publish to web → CSV → copy URL
   Paste it as SHEET_CSV_URL below (replace the placeholder).
   ===================================================================== */

window.FT_CONFIG = {

  /* ── PRIMARY: Published CSV URL (fastest, most reliable)
     Do: File → Share → Publish to web → Sheet1 → CSV → paste here    */
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzO1CG5KMxu0a5bwVxvb4Al8uMgWUtgSp9nLydawEpxlD-mQ17XsCKaTmuZJTCLkOjCtRw96aVzl3t/pub?output=csv",

  /* ── FALLBACK: gviz works because your sheet is publicly viewable.
     The app uses this automatically until you set SHEET_CSV_URL above. */
  SHEET_GVIZ_URL: "https://docs.google.com/spreadsheets/d/1YpCkLsT6G1qGwdTuyiUpnRoSHKMJMXhGfr6oyshsBm8/gviz/tq?tqx=out:csv&sheet=Sheet1",

  /* ── ADMIN PASSWORD — change this to something private ────────────  */
  ADMIN_PASSWORD: "gupta2024",

  /* ── BRANDING ──────────────────────────────────────────────────────  */
  FAMILY_NAME: "The Gupta Family",
  SITE_TITLE:  "Gupta Family Tree",
  TAGLINE:     "Three generations, one family — rooted in love",

  /* ── SHEET COLUMN HEADERS (must match your sheet exactly) ──────────
     Your current sheet has 7 columns. Add more anytime — just add the
     column to your sheet AND the matching line below.                  */
  COLUMNS: {
    id:           "ID",
    name:         "Name",
    gender:       "Gender",
    fatherId:     "FatherID",
    motherId:     "MotherID",
    spouseId:     "SpouseID",
    generation:   "Generation",

    /* ── OPTIONAL COLUMNS — add these to your sheet when ready ──────
    photoUrl:     "PhotoURL",
    dob:          "DOB",
    dod:          "DOD",
    marriageDate: "MarriageDate",
    occupation:   "Occupation",
    education:    "Education",
    city:         "City",
    bio:          "Bio",
    email:        "Email",
    phone:        "Phone",
    ──────────────────────────────────────────────────────────────── */
  }
};
