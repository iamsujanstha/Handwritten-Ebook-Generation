const http = require('http');

const data = JSON.stringify({
  chapterTitle: "Test",
  sectionTitle: "Notes",
  rawText: "This is a test of the format direct endpoint."
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/format-direct',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-gemini-model': 'gemini-3.5-flash',
    'x-gemini-api-key': process.env.GEMINI_API_KEY || ''
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body.substring(0, 500)));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
