/**
 * Test script for Blue Dart Webhook
 * Run with: node test-webhook.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.BLUEDART_CLIENT_ID || 'stagingID';
const LICENSE_KEY = process.env.BLUEDART_LICENSE_KEY || process.env.BLUEDART_TOKEN || 'your-test-token';

// Read sample payload
const samplePayload = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'sample_payload.json'), 'utf8')
);

const postData = JSON.stringify(samplePayload);

const options = {
  hostname: 'localhost',
  port: PORT,
  path: '/api/bluedart/status',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'client-id': CLIENT_ID,
    'License Key': LICENSE_KEY
  }
};

console.log('🧪 Testing Blue Dart Webhook...');
console.log(`📍 URL: http://${options.hostname}:${options.port}${options.path}`);
console.log(`🔑 Client ID: ${CLIENT_ID}`);
console.log('');

const req = http.request(options, (res) => {
  let data = '';

  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Response:');
      console.log(JSON.stringify(response, null, 2));
      
      if (res.statusCode === 200) {
        console.log('\n🎉 Webhook test successful!');
      } else {
        console.log('\n❌ Webhook test failed!');
        process.exit(1);
      }
    } catch (e) {
      console.log('📄 Raw Response:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Problem with request: ${e.message}`);
  console.error('💡 Make sure the server is running on port', PORT);
  process.exit(1);
});

req.write(postData);
req.end();

