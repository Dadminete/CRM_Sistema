fetch('http://172.16.0.25:3000/api/admin/clean-all-duplicates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
  .then(async r => {
    const text = await r.text();
    console.log('Response status:', r.status);
    console.log('Response text:', text);
    return JSON.parse(text);
  })
  .then(d => {
    console.log('\n✅ RESULTADO:\n');
    if (d.success) {
      console.log(`Eliminados: ${d.deletedCount} movimientos`);
      console.log(`Nuevo saldo: $${d.newBalance}`);
      console.log(`Mensaje: ${d.message}`);
    } else {
      console.log('❌ Error:', d.error);
    }
  })
  .catch(e => console.error('Error:', e.message, e.stack));
