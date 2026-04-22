(async () => {
  try {
    // 1. Ajustar balance a $11,800
    console.log('1️⃣  Ajustando balance a $11,800...\n');
    const adjRes = await fetch('http://172.16.0.25:3000/api/cajas/actualize-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cajaId: 'c5ab2edc-d32c-494d-b454-d1731c6c31df',
        nuevoSaldo: 11800
      })
    });
    const adjData = await adjRes.json();
    console.log('✅ Balance ajustado:');
    console.log(`   Anterior: $${adjData.data.saldoAnterior}`);
    console.log(`   Nuevo: $${adjData.data.saldoNuevo}`);
    console.log(`   Cambio: $${adjData.data.diferencia}\n`);

    // 2. Establecer checkpoint
    console.log('2️⃣  Estableciendo checkpoint oficial...\n');
    const cpRes = await fetch('http://172.16.0.25:3000/api/admin/set-checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cajaId: 'c5ab2edc-d32c-494d-b454-d1731c6c31df',
        montoOficial: 11800,
        descripcion: 'CHECKPOINT OFICIAL - 2026-03-02',
        notas: 'Establecido como punto de referencia oficial. Balance verificado: $11,800.00'
      })
    });
    const cpData = await cpRes.json();
    console.log('✅ Checkpoint establecido:');
    console.log(JSON.stringify(cpData.checkpoint, null, 2));
    console.log();

    // 3. Auditar
    console.log('3️⃣  Verificando auditoría...\n');
    const auRes = await fetch('http://172.16.0.25:3000/api/admin/audit-checkpoint?cajaId=c5ab2edc-d32c-494d-b454-d1731c6c31df');
    const auData = await auRes.json();
    const aud = auData.data.auditoria;
    console.log('✅ Estado de auditoría:');
    console.log(`   Caja: ${auData.data.cashBox.nombre}`);
    console.log(`   Balance actual: $${aud.currentBalance}`);
    console.log(`   Balance esperado: $${aud.expectedBalance}`);
    console.log(`   Discrepancia: $${aud.discrepancia}`);
    console.log(`   Resultado: ${aud.estado}`);
    console.log();
    console.log('✅ SETUP COMPLETO. El checkpoint está establecido como referencia oficial.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
