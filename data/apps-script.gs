/**
 * Google Apps Script — Family Tree Sheet Write API
 *
 * DEPLOYMENT:
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this whole file
 * 4. Set SHEET_ID and ADMIN_USER / ADMIN_PASS below
 * 5. Deploy → New deployment → Web app → Execute as "me", Access "Anyone"
 * 6. Copy the web app URL into config.js as writeApiUrl
 *
 * SECURITY: Basic auth over HTTPS. The password is sent in the POST body
 * (not as a browser header), so it's protected by HTTPS encryption.
 */

var SHEET_ID   = "";  // ← paste your sheet ID (from the URL between /d/ and /edit)
var ADMIN_USER = "admin";
var ADMIN_PASS = "admin";

// Expected column headers (must match the sheet's first row exactly)
var HEADERS = [
  "ID", "Name", "Gender", "FatherID", "MotherID", "SpouseID",
  "PhotoURL", "DOB", "MarriageDate", "Occupation", "Education",
  "City", "Bio", "Email", "Phone", "Generation"
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // --- Auth check ---
    if (data._user !== ADMIN_USER || data._pass !== ADMIN_PASS) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 403);
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    var row = HEADERS.map(function (h) { return data[h] || ""; });
    sheet.appendRow(row);

    return jsonResponse({ success: true, id: data.ID });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "Family Tree write API is running. Use POST to add rows."
  );
}

function jsonResponse(obj, status) {
  var out = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  if (status) {
    // Apps Script doesn't support custom HTTP status natively,
    // but we include the code in the JSON response.
    obj._status = status;
  }
  return out;
}
