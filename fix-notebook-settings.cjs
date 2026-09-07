const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

if (!code.includes('import SettingsModal')) {
  code = code.replace(/import \{.*\} from "lucide-react";/, (m) => `import { Settings } from "lucide-react";\n${m}`);
  code = code.replace(/export default function SingleNotebook\(\) \{/, `import SettingsModal from "../components/SettingsModal";\n\nexport default function SingleNotebook() {`);
}

if (!code.includes('isSettingsOpen')) {
  code = code.replace(/const \[isExtractingBulk, setIsExtractingBulk\] = useState\(false\);/, (m) => `${m}\n  const [isSettingsOpen, setIsSettingsOpen] = useState(false);`);
}

if (!code.includes('<SettingsModal onClose={() => setIsSettingsOpen(false)} />')) {
  code = code.replace(/(<div className="notebook-container[^>]*>)/, `$1\n      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}`);
}

if (!code.includes('onClick={() => setIsSettingsOpen(true)}')) {
  code = code.replace(/<div className="book-tag">/, `<button onClick={() => setIsSettingsOpen(true)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><Settings className="w-5 h-5" /></button>\n      <div className="book-tag">`);
}

// Add handling for QUOTA_EXCEEDED
code = code.replace(/throw new Error\("Server returned non-JSON response\. Please try again\."\);/g, `throw new Error("Server returned non-JSON response. Please try again.");`);

code = code.replace(/if \(error instanceof Error\) \{\n\s*alert\(error.message\);\n\s*\}/g, (m) => `if (error instanceof Error) {
        if (error.message.includes("QUOTA_EXCEEDED") || error.message.includes("Quota exceeded")) {
           alert("AI Quota Exceeded! Please click the Settings gear icon in the top right to change the AI model or provide your own API key.");
        } else {
           alert(error.message);
        }
      }`);

fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
