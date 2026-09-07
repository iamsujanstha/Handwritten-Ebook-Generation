const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const newCode = `// PDF Generation Endpoints
app.post("/api/export-raw-html", async (req, res) => {
  const { html, title } = req.body;
  if (!html) return res.status(400).json({ error: "Missing html" });

  const exportId = uuidv4();
  pdfExportJobs.set(exportId, {
    book: { title: title || "Notebook" },
    themeId: "raw",
    status: "processing",
    progress: "Preparing document",
  });

  res.json({ exportId });

  // Start generation asynchronously
  generateRawPdfJob(exportId, html).catch(err => console.error("Raw PDF generation job failed:", err));
});

async function generateRawPdfJob(exportId, html) {
  try {
    await updateJobProgress(exportId, "Preparing document");
    
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    await updateJobProgress(exportId, "Rendering content");

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setContent(html, { waitUntil: ['load', 'networkidle0'], timeout: 60000 });

    await updateJobProgress(exportId, "Generating PDF");

    const path = require('path');
    const os = require('os');
    const pdfPath = path.join(os.tmpdir(), \`\${exportId}.pdf\`);
    
    await page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    });

    await updateJobProgress(exportId, "Finalizing PDF");
    await browser.close();

    const job = pdfExportJobs.get(exportId);
    if (job) {
      job.pdfPath = pdfPath;
      await updateJobProgress(exportId, "Download ready", "completed");
    }
  } catch (error) {
    console.error("PDF generation error:", error);
    await updateJobProgress(exportId, error.message, "failed", error.message);
  }
}

app.post("/api/export-pdf", async (req, res) => {`;

code = code.replace(`// PDF Generation Endpoints\napp.post("/api/export-pdf", async (req, res) => {`, newCode);

fs.writeFileSync('server.ts', code);
