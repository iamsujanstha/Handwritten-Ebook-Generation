const fs = require('fs');
let code = fs.readFileSync('src/pages/SourceLibrary.tsx', 'utf-8');

code = code.replace(/xhr\.open\("POST", "\/api\/extract-pdf"\);\s*xhr\.upload\.onprogress = \(event\) => \{\s*if \(event\.lengthComputable\) \{\s*const progress = Math\.round\(\(event\.loaded \/ event\.total\) \* 100\);\s*updateSource\(id, addedSource\.id, \{ uploadProgress: progress \}\);\s*if \(progress >= 100\) \{\s*updateSource\(id, addedSource\.id, \{ extractionStatus: "Extracting" \}\);\s*\}\s*\}\s*\};\s*xhr\.onload = \(\) => \{/g, 
`xhr.open("POST", "/api/extract-pdf");
          xhr.withCredentials = true;
          
          let simulatedProgress = 0;
          const progressInterval = setInterval(() => {
            simulatedProgress += (90 - simulatedProgress) * 0.1;
            updateSource(id, addedSource.id, { uploadProgress: Math.round(simulatedProgress) });
          }, 500);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const actualProgress = Math.round((event.loaded / event.total) * 100);
              if (actualProgress > simulatedProgress) {
                 simulatedProgress = actualProgress;
                 updateSource(id, addedSource.id, { uploadProgress: simulatedProgress });
                 if (simulatedProgress >= 100) {
                    updateSource(id, addedSource.id, { extractionStatus: "Extracting" });
                 }
              }
            }
          };
          
          xhr.onload = () => {
            clearInterval(progressInterval);
            updateSource(id, addedSource.id, { uploadProgress: 100, extractionStatus: "Extracting" });
            
            const contentType = xhr.getResponseHeader("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                const preview = xhr.responseText.substring(0, 100);
                if (preview.includes("<!doctype html>")) {
                    reject(new Error("Your session expired or the server is restarting. Please reload the page to continue."));
                } else {
                    reject(new Error(\`Server returned non-JSON response. Status: \$\{xhr.status\}, Type: \$\{contentType\}, Body: \$\{preview\}\`));
                }
                return;
            }`);

code = code.replace(/xhr\.onerror = \(\) => reject\(new Error\("Network Error"\)\);/g, 'xhr.onerror = () => { clearInterval(progressInterval); reject(new Error("Network Error")); };');

fs.writeFileSync('src/pages/SourceLibrary.tsx', code);
