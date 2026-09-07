const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/xhr\.upload\.onprogress = \(e\) => \{\s*if \(e\.lengthComputable\) \{\s*onProgress\(Math\.round\(\(e\.loaded \/ e\.total\) \* 100\)\);\s*\}\s*\};/g, 
`let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += (90 - simulatedProgress) * 0.1; // asymptotic to 90%
        onProgress(Math.round(simulatedProgress));
      }, 500);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const actualProgress = Math.round((e.loaded / e.total) * 100);
          if (actualProgress > simulatedProgress) {
             simulatedProgress = actualProgress;
             onProgress(simulatedProgress);
          }
        }
      };`);

code = code.replace(/xhr\.onload = \(\) => \{/g, `xhr.onload = () => {
        clearInterval(progressInterval);
        onProgress(100);`);

code = code.replace(/xhr\.onerror = \(\) => reject/g, `xhr.onerror = () => { clearInterval(progressInterval); reject`);

fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
