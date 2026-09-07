import { BrowserRouter, Routes, Route } from "react-router";
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
