const fs = require('fs');

const files = [
  'src/pages/Preview.tsx',
  'src/pages/RenderPdf.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Patch h1
  content = content.replace(
    /h1: \(\{node, \.\.\.props\}: any\) => <h1 className=\{theme\.classes\.heading1\} style=\{\{ pageBreakAfter: 'avoid', breakAfter: 'avoid' \}\} \{\.\.\.props\} \/>,/,
    `h1: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h1 className={theme.classes.heading1} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid', color: isDesc ? "#8b5cf6" : undefined }} {...props} />;
    },`
  );

  // Patch h2
  content = content.replace(
    /h2: \(\{node, \.\.\.props\}: any\) => <h2 className=\{theme\.classes\.heading2\} style=\{\{ pageBreakAfter: 'avoid', breakAfter: 'avoid' \}\} \{\.\.\.props\} \/>,/,
    `h2: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h2 className={theme.classes.heading2} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid', color: isDesc ? "#8b5cf6" : undefined }} {...props} />;
    },`
  );

  // Patch h3
  content = content.replace(
    /h3: \(\{node, \.\.\.props\}: any\) => <h3 className=\{theme\.classes\.heading3\} style=\{\{ pageBreakAfter: 'avoid', breakAfter: 'avoid' \}\} \{\.\.\.props\} \/>,/,
    `h3: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h3 className={theme.classes.heading3} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid', color: isDesc ? "#8b5cf6" : undefined }} {...props} />;
    },`
  );
  
  fs.writeFileSync(file, content);
}
