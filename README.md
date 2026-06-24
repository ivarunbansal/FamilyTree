# Premium Family Tree

Static GitHub Pages family tree powered by a public Google Sheet.

## Deploy

1. Copy this folder to a GitHub repository.
2. In GitHub, enable Pages for the branch and folder that contains `index.html`.
3. Publish your Google Sheet to the web or expose it through SheetDB.
4. Paste the sheet URL into `config.js`.

## Supported Sheet URLs

- Public Google Sheets share URL
- Google Visualization API URL
- Google CSV export URL
- SheetDB API endpoint

## Sheet Columns

Use these headers:

`ID, Name, Gender, FatherID, MotherID, SpouseID, PhotoURL, DOB, MarriageDate, Occupation, Education, City, Bio, Email, Phone, Generation`

Data is fetched at runtime in the browser. Editing the Google Sheet updates the website without redeploying.
