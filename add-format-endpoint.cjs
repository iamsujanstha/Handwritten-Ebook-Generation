const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const newEndpoint = `
// Direct Format API
app.post("/api/format-direct", async (req, res) => {
  const { chapterTitle, sectionTitle, rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: "No raw text provided" });

  const prompt = \`You are an expert technical author and UX designer. Format the following raw notes/text into a highly polished, aesthetic Notebook design for the section "\${sectionTitle}" in the chapter "\${chapterTitle}".

IMPORTANT STYLING REQUIREMENTS (You MUST use these raw HTML structures where applicable, blending them with standard Markdown):

1. For important notes, insights, or warnings: <div class="hand-card"><span class="card-label purple">Note</span><p>content here...</p></div>
2. For simple conceptual explanations: <div class="callout-simple"><div class="callout-title">Concept</div><p>content...</p></div>
3. For statistics or metrics grids: <div class="stat-grid"><div class="stat-card"><div class="stat-val">X</div><div class="stat-label">Label</div></div>...</div>
4. For text highlights: <span class="highlight">yellow</span> or <span class="highlight-cyan">cyan</span>
5. For Interview Q&A (if applicable): <div class="interview-section"><div class="interview-title">Interview Question</div><div class="interview-q">Q: question?</div><div class="interview-a">A: answer...</div></div>
6. For ASCII diagrams: <div class="diagram-box">ascii diagram here...</div><div class="diagram-caption">Caption here</div>

Transform the raw notes into this beautiful format. Do not include the main section title at the top, just the content itself. 
Expand on the notes if they are too brief, ensuring professional flow and grammar.

RAW NOTES:
\${rawText}\`;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt
    });
    res.json({ content: response.text });
  } catch (error: any) {
    console.error("Error in format-direct:", error);
    res.status(500).json({ error: error.message });
  }
});
`;

if (!content.includes('/api/format-direct')) {
  content = content.replace('// PDF Generation Endpoints', newEndpoint + '\n// PDF Generation Endpoints');
  fs.writeFileSync('server.ts', content);
}
