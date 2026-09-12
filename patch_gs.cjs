const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes('child_process')) {
  content = content.replace(
    'import fsSync from "fs";',
    'import fsSync from "fs";\nimport { exec } from "child_process";\nimport util from "util";\nconst execAsync = util.promisify(exec);'
  );
}

// Modify renderHtmlToCompressedPdf
content = content.replace(
  /await fs\.writeFile\(outputPath, finalBuffer\);\s*return outputPath;/,
  `await fs.writeFile(outputPath, finalBuffer);
    
    // Ghostscript extreme compression pass
    const gsOutputPath = outputPath.replace('.pdf', '_gs.pdf');
    try {
      await execAsync(\`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dColorImageResolution=150 -dGrayImageResolution=150 -dMonoImageResolution=150 -dColorImageDownsampleType=/Bicubic -dNOPAUSE -dQUIET -dBATCH -sOutputFile=\${gsOutputPath} \${outputPath}\`);
      await fs.rename(gsOutputPath, outputPath);
      console.log("Ghostscript compression successful");
    } catch (e) {
      console.error("Ghostscript compression failed, using original", e);
    }
    
    return outputPath;`
);

// Scale factor from 1.5 to 1.0 (vector stays crisp, raster elements use less pixel volume)
content = content.replace(
  /deviceScaleFactor:\s*1\.5/,
  'deviceScaleFactor: 1.0'
);

fs.writeFileSync('server.ts', content);
