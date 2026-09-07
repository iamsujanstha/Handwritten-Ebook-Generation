const http = require('http');

const data = JSON.stringify({
  title: "Test Book",
  description: "A test book",
  options: "Standard professional organization",
  sources: [{ id: "1", name: "Source 1", content: "This is some test content. ".repeat(100) }]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/architect-stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
