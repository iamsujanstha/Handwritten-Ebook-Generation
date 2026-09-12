const fs = require('fs');
async function test() {
  const pdf = require('pdf-parse');
  // I need a sample PDF or I'll just see what PDFParse class looks like
  console.log(pdf.PDFParse.toString());
}
test();
