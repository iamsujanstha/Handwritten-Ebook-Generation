const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = `import { BrowserRouter, Routes, Route } from "react-router";
import SingleNotebook from "./pages/SingleNotebook";
import RenderPdf from "./pages/RenderPdf";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SingleNotebook />} />
        <Route path="/render-pdf/:id" element={<RenderPdf />} />
      </Routes>
    </BrowserRouter>
  );
}
`;
fs.writeFileSync('src/App.tsx', code);
