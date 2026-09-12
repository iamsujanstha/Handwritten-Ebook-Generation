const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Patch deviceScaleFactor in generatePdfJob
content = content.replace(
  /deviceScaleFactor: 2 \}/g,
  'deviceScaleFactor: 1.0 }'
);

// Patch generatePdfJob ghostscript compression
content = content.replace(
  /await browser\.close\(\);\n\s*const job = pdfExportJobs\.get\(exportId\);/g,
  `await browser.close();
    
    // Ghostscript extreme compression pass
    const gsOutputPath = pdfPath.replace('.pdf', '_gs.pdf');
    try {
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);
      await execAsync(\`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dColorImageResolution=150 -dGrayImageResolution=150 -dMonoImageResolution=150 -dColorImageDownsampleType=/Bicubic -dNOPAUSE -dQUIET -dBATCH -sOutputFile=\${gsOutputPath} \${pdfPath}\`);
      const fsSync = require("fs");
      fsSync.renameSync(gsOutputPath, pdfPath);
      console.log("Ghostscript compression successful for generatePdfJob");
    } catch (e) {
      console.error("Ghostscript compression failed for generatePdfJob, using original", e);
    }
    
    const job = pdfExportJobs.get(exportId);`
);

fs.writeFileSync('server.ts', content);
