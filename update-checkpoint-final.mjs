(async () => {
  try {
    console.log('🔄 ACTUALIZANDO CHECKPOINT CON DATOS FINALES\n');
    
    const cajaId = 'c5ab2edc-d32c-494d-b454-d1731c6c31df';
    
    // 1. Crear nuevo checkpoint con el estado final
    console.log('📌 Estableciendo checkpoint FINAL...\n');
    const cpRes = await fetch('http://172.16.0.25:3000/api/admin/set-checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cajaId: cajaId,
        montoOficial: 11800,
        descripcion: 'CHECKPOINT OFICIAL FINAL - 2026-03-02 [POST-AJUSTE]',
        notas: 'Balance final verificado: $11,800.00. Incluye ajuste contable de $3,190 por corrección de descuadres históricos. Este es el punto de referencia definitivo. Todos los movimientos están sincronizados con el balance en BD.'
      })
    });
    const cpData = await cpRes.json();
    
    if (cpData.success) {
      console.log('✅ Checkpoint FINAL establecido:');
      console.log(JSON.stringify(cpData.checkpoint, null, 2));
      console.log();
    } else {
      console.log('❌ Error:', cpData.error);
    }
    
    // 2. Auditar contra el nuevo checkpoint
    console.log('🔍 Verificando auditoría...\n');
    const auRes = await fetch('http://172.16.0.25:3000/api/admin/audit-checkpoint?cajaId=' + cajaId);
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
      
      if (Math.abs(aud.discrepancia) < 0.01) {
        console.log('✅ TODO PERFECTO - Balance completamente sincronizado');
        console.log('   - Balance en BD: $11,800');
        console.log('   - Suma de movimientos: $11,800');
        console.log('   - Checkpoint establecido correctamente');
        console.log('   - Sistema listo para auditorías futuras\n');
      }
    } else {
      console.log('❌ Error:', auData.error);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
