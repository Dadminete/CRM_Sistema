#!/usr/bin/env node
/**
 * VERIFICADOR DE AUDITORÍA - Caja Principal
 * Uso: node audit-caja-principal.mjs
 * Verifica el balance actual contra el checkpoint oficial
 */

(async () => {
  console.log('\n📊 AUDITORÍA DE CAJA PRINCIPAL');
  console.log('═'.repeat(50));
  
  try {
    const cajaId = 'c5ab2edc-d32c-494d-b454-d1731c6c31df';
    
    // 1. Auditoría contra checkpoint
    console.log('\n🔍 Verificando balance contra checkpoint oficial...\n');
    const auRes = await fetch(`http://172.16.0.25:3000/api/admin/audit-checkpoint?cajaId=${cajaId}`);
    const auData = await auRes.json();
    
    if (!auData.success) {
      console.log('❌ Error:', auData.error);
      return;
    }
    
    const aud = auData.data.auditoria;
    const cp = auData.data.checkpoint;
    
    // 2. Mostrar información
    console.log(`📌 Caja: ${auData.data.cashBox.nombre}`);
    console.log(`📅 Checkpoint: ${cp.fecha}`);
    console.log();
    
    console.log('💰 BALANCE');
    console.log(`   Oficial (checkpoint): $${cp.balanceOficial}`);
    console.log(`   Actual en BD: $${aud.currentBalance}`);
    console.log(`   Esperado: $${aud.expectedBalance}`);
    console.log();
    
    console.log('📈 MOVIMIENTOS POST-CHECKPOINT');
    console.log(`   Movimientos: ${aud.movimientosPostCheckpoint}`);
    console.log(`   Ingresos: $${aud.ingresosPostCheckpoint}`);
    console.log(`   Gastos: $${aud.gastosPostCheckpoint}`);
    console.log();
    
    if (Math.abs(aud.discrepancia) < 0.01) {
      console.log('✅ RESULTADO: VÁLIDO - Sin discrepancias\n');
    } else {
      console.log(`⚠️  RESULTADO: ${aud.estado}`);
      console.log(`   Discrepancia: $${Math.abs(aud.discrepancia).toFixed(2)}\n`);
    }
    
    // 3. Movimientos recientes
    if (aud.movimientosPostCheckpoint > 0) {
      console.log('📋 Últimos movimientos post-checkpoint:');
      if (auData.data.movimientosPostCheckpoint && auData.data.movimientosPostCheckpoint.length > 0) {
        auData.data.movimientosPostCheckpoint.slice(0, 5).forEach(m => {
          console.log(`   ${m.fecha} | ${m.tipo.toUpperCase()} $${m.monto} | ${m.descripcion}`);
        });
      }
      console.log();
    }
    
    console.log('═'.repeat(50));
    console.log('✅ Auditoría completa\n');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message, '\n');
    process.exit(1);
  }
})();
