import https from 'https';

https.get('https://docs.google.com/spreadsheets/d/1M5ATWnwBN_PjErZvZFKTCYv6wC1Kv7LipsBuOYNxSaI/export?format=csv', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const rows = data.trim().split(/\r?\n/).map(line => line.split(','));
    const valid = rows.slice(1).filter(r => r[10] && r[10].trim()).slice(0, 10);
    console.log('TOKENS VÁLIDOS:\n');
    valid.forEach((r, i) => {
      console.log(`${i + 1}. Nombre: ${r[0]}`);
      console.log(`   Token: ${r[10]}`);
      console.log(`   Activo: ${r[11]}\n`);
    });
  });
}).on('error', err => {
  console.error(err);
  process.exit(1);
});
