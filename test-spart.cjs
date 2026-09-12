const chromium = require("@sparticuz/chromium");
(async () => {
  try {
    const path = await chromium.executablePath();
    console.log("Path:", path);
  } catch (e) {
    console.error("Error:", e);
  }
})();
