(async () => {
  try {
    console.log('🔧 AJUSTANDO MOVIMIENTOS CONTABLES\n');
    
    const cajaId = 'c5ab2edc-d32c-494d-b454-d1731c6c31df';
    const montoAjuste = 3190;
    
    // 1. Estado antes del ajuste
    console.log('📊 Estado ANTES del ajuste:\n');
    const antes = await fetch('http://172.16.0.25:3000/api/admin/audit-caja')
      .then(r => r.json());
    const cajaAntes = antes.data.find(x => x.cajaNombre === 'Caja Principal');
    console.log(`   Balance BD: $${cajaAntes.dbBalance}`);
    console.log(`   Calculado: $${cajaAntes.calculatedBalance}`);
    console.log(`   Diferencia: $${cajaAntes.difference}\n`);
    
    // 2. Crear ajuste contable
    console.log(`➕ Creando ajuste contable de -$${montoAjuste}...\n`);
    const ajusteRes = await fetch('http://172.16.0.25:3000/api/admin/create-adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cajaId: cajaId,
        monto: montoAjuste,
        usuarioId: 'df4b1335-5ff6-4703-8dcd-3e2f74fb0822', // Usuario del sistema
        descripcion: `Ajuste contable por corrección de descuadre histórico. Balance oficial: $11,800. Se registra gasto de $${montoAjuste} para cuadrar movimientos contables con balance real verificado. (Checkpoint 2026-03-02)`,
      })
    });
    const ajusteData = await ajusteRes.json();
    
    if (ajusteData.success) {
      console.log('✅ Ajuste creado:');
      console.log(`   ID: ${ajusteData.data.ajusteId}`);
      console.log(`   Monto: -$${ajusteData.data.monto}`);
      console.log();
    } else {
      console.log('❌ Error:', ajusteData.error);
      return;
    }
    
    // 3. Verificar resultado
    console.log('📊 Estado DESPUÉS del ajuste:\n');
    const despues = await fetch('http://172.16.0.25:3000/api/admin/audit-caja')
      .then(r => r.json());
    const cajaDespues = despues.data.find(x => x.cajaNombre === 'Caja Principal');
    console.log(`   Balance BD: $${cajaDespues.dbBalance}`);
    console.log(`   Calculado: $${cajaDespues.calculatedBalance}`);
    console.log(`   Diferencia: $${cajaDespues.difference}\n`);
    
    if (Math.abs(cajaDespues.difference) < 0.01) {
      console.log('✅ ¡PERFECTO! Balance cuadrado.\n');
      console.log('📋 Resumen:');
      console.log(`   - Balance en BD: $${cajaDespues.dbBalance}`);
      console.log(`   - Suma de movimientos: $${cajaDespues.calculatedBalance}`);
      console.log(`   - Todo está sincronizado ✅\n`);
    } else {
      console.log(`⚠️  Aún hay diferencia de $${cajaDespues.difference}\n`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
