const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

const regex = /const iframe = document\.createElement\('iframe'\);[\s\S]*?if \(exportBtn\) exportBtn\.innerText = originalText;\s*\}/m;

const newCode = `      const res = await fetch("/api/export-raw-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml, title: title || "Notebook" })
      });
      
      if (!res.ok) {
        throw new Error("Failed to initialize export job");
      }
      
      const { exportId } = await res.json();
      
      const eventSource = new EventSource(\`/api/export-status/\${exportId}\`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === "failed") {
          alert("Export failed: " + (data.error || data.progress));
          if (exportBtn) exportBtn.innerText = originalText;
          eventSource.close();
        } else if (data.status === "completed") {
          if (exportBtn) exportBtn.innerText = "PDF ready!";
          eventSource.close();
          window.open(\`/api/download-pdf/\${exportId}\`, '_blank');
          setTimeout(() => { if (exportBtn) exportBtn.innerText = originalText; }, 3000);
        } else {
          if (exportBtn) exportBtn.innerText = data.progress;
        }
      };
      
      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        alert("Connection to export server lost");
        if (exportBtn) exportBtn.innerText = originalText;
        eventSource.close();
      };

    } catch (err: any) {
      console.error(err);
      alert("Error generating PDF: " + err.message);
      if (exportBtn) exportBtn.innerText = originalText;
    }`;

code = code.replace(regex, newCode);

// Also we need to REMOVE the `notebook-container` overrides inside fullHtml to keep the exact preview style!
// The user wants it to look exactly like the preview!
const styleOverrideRegex = /\/\* Remove shadow for PDF export, enforce precise letter size scaling \*\/[\s\S]*?box-sizing: border-box;/m;
code = code.replace(styleOverrideRegex, `/* Keep exact preview styling */\n        width: 100%;\n        max-width: 100%;`);

fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
