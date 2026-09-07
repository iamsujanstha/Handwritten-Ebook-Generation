const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf-8');
  
  if (!code.includes('useSettingsStore')) {
    code = code.replace(/import \{.*\} from "react";|import .* from " lucide-react";|import .* from "lucide-react";/, (m) => `import { useSettingsStore } from "../store/useSettingsStore";\n${m}`);
  }

  if (!code.includes('const { geminiModel, userApiKey } = useSettingsStore();')) {
     code = code.replace(/export default function .*?\(\) \{/, (m) => `${m}\n  const { geminiModel, userApiKey } = useSettingsStore();`);
  }

  // Update fetch calls to include headers
  code = code.replace(/fetch\("(.*?)", \{\n(\s*)method/g, 'fetch("$1", {\n$2headers: {\n$2  "Content-Type": "application/json",\n$2  "x-gemini-model": geminiModel,\n$2  "x-gemini-api-key": userApiKey\n$2},\n$2method');
  
  // Note: if headers already exist, this might duplicate or miss. Let's do a more robust replace for fetch.
  fs.writeFileSync(file, code);
}

['src/pages/SingleNotebook.tsx', 'src/pages/Architect.tsx', 'src/pages/Editor.tsx'].forEach(fixFile);
