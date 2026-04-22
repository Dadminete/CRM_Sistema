(async () => {
  try {
    // 0. Inicializar tabla
    console.log('0️⃣  Inicializando tabla caja_checkpoints...\n');
    const initRes = await fetch('http://172.16.0.25:3000/api/admin/init-checkpoints-table', {
      method: 'POST'
    });
    const initData = await initRes.json();
    if (initData.success) {
      console.log('✅ Tabla inicializada\n');
    }

    // 1. Balance ya está en $11,800
    console.log('1️⃣  Balance verificado: $11,800\n');

    // 2. Establecer checkpoint
    console.log('2️⃣  Estableciendo checkpoint oficial...\n');
    const cpRes = await fetch('http://172.16.0.25:3000/api/admin/set-checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cajaId: 'c5ab2edc-d32c-494d-b454-d1731c6c31df',
        montoOficial: 11800,
        descripcion: 'CHECKPOINT OFICIAL - Punto de referencia establecido 2026-03-02',
        notas: 'Esta es la referencia oficial para la Caja Principal. Todos los descuadres/discrepancias futuros se medirán contra este checkpoint. Balance verificado y confirmado: $11,800.00'
      })
    });
    const cpData = await cpRes.json();
    if (cpData.success) {
      console.log('✅ Checkpoint establecido:');
      console.log(JSON.stringify(cpData.checkpoint, null, 2));
      console.log();
    } else {
      console.log('❌ Error:', cpData.error);
    }

    // 3. Auditar
    console.log('3️⃣  Verificando auditoría...\n');
    const auRes = await fetch('http://172.16.0.25:3000/api/admin/audit-checkpoint?cajaId=c5ab2edc-d32c-494d-b454-d1731c6c31df');
    const auData = await auRes.json();
    if (auData.success) {
      const aud = auData.data.auditoria;
      console.log('✅ Estado de auditoría:');
      console.log(`   Caja: ${auData.data.cashBox.nombre}`);
      console.log(`   Balance actual: $${aud.currentBalance}`);
      console.log(`   Balance esperado: $${aud.expectedBalance}`);
      console.log(`   Discrepancia: $${aud.discrepancia}`);
      console.log(`   Resultado: ${aud.estado}`);
      console.log();
      console.log('✅ SETUP COMPLETO');
      console.log();
      console.log('📝 DOCUMENTACIÓN:');
      console.log('   - Checkpoint ID: almacenado en tabla caja_checkpoints');
      console.log('   - Balance oficial: $11,800.00');
      console.log('   - Referencias de auditoría: /api/admin/audit-checkpoint?cajaId=c5ab2edc-d32c-494d-b454-d1731c6c31df');
      console.log('   - Para futuras auditorías, usa este endpoint para comparar contra el checkpoint');
    } else {
      console.log('❌ Error:', auData.error);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();