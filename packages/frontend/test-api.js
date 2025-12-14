const app = require('./server.js');
const http = require('http');

const server = app.listen(3000, () => {
  console.log('✓ Server started on port 3000');
  
  // Test the API
  setTimeout(() => {
    const postData = JSON.stringify({
      query: 'johndoe',
      type: 'auto'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\n✓ API Response:');
        console.log(JSON.stringify(JSON.parse(data), null, 2));
        server.close();
        process.exit(0);
      });
    });

    req.on('error', (error) => {
      console.error('✗ API Error:', error.message);
      server.close();
      process.exit(1);
    });

    req.write(postData);
    req.end();
  }, 500);
});
