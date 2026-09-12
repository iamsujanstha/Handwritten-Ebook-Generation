const fs = require('fs');

const files = [
  'src/pages/Editor.tsx',
  'src/pages/Preview.tsx',
  'src/pages/RenderPdf.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import rehypeHighlight from "rehype-highlight";')) {
    content = content.replace(
      'import rehypeRaw from "rehype-raw";',
      'import rehypeRaw from "rehype-raw";\nimport rehypeHighlight from "rehype-highlight";'
    );
  }
  
  content = content.replace(/rehypePlugins=\{\[rehypeRaw\]\}/g, 'rehypePlugins={[rehypeRaw, rehypeHighlight]}');
  
  // Now add heading component interceptor to `components={{`
  const headingComponent = `
    h1: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h1 {...props} style={isDesc ? { color: "#8b5cf6" } : {}}>{props.children}</h1>;
    },
    h2: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h2 {...props} style={isDesc ? { color: "#8b5cf6" } : {}}>{props.children}</h2>;
    },
    h3: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h3 {...props} style={isDesc ? { color: "#8b5cf6" } : {}}>{props.children}</h3>;
    },
  `;
  
  content = content.replace(/components=\{\{/, 'components={{' + headingComponent);

  fs.writeFileSync(file, content);
}
