const http = require('http');
for(let i=0; i<10; i++) {
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/extract-pdf?t=' + Date.now(),
    method: 'POST'
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);
      if (res.headers['content-type'] && res.headers['content-type'].includes('text/html')) {
        console.log("HTML received!");
      }
    });
  });
  req.on('error', console.error);
  req.end();
}
