const https = require('https');

https.get('https://docs.google.com/spreadsheets/d/1M5ATWnwBN_PjErZvZFKTCYv6wC1Kv7LipsBuOYNxSaI/export?format=csv', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const rows = data.trim().split(/\r?\n/).map(line => line.split(','));
    const valid = rows.slice(1).filter(r => r[10] && r[10].trim()).slice(0, 10);
    console.log('TOKENS VÁLIDOS:');
    valid.forEach((r, i) => {
      console.log(`${i + 1}. ${r[0]}: TOKEN=${r[10]} ACTIVO=${r[11]}`);
    });
  });
}).on('error', err => {
  console.error(err);
  process.exit(1);
});
