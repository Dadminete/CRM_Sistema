/**
 * Script de prueba para verificar el endpoint de Caja Principal
 * Ejecutar con: node test-caja-endpoint.mjs
 */

async function testCajaPrincipal() {
  const url = 'http://172.16.0.25:3000/api/caja-principal';
  
  console.log('🔍 Probando endpoint:', url);
  console.log('⏱️  Timestamp:', new Date().toISOString());
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    const data = await response.json();
    
    console.log('✅ Respuesta recibida:');
    console.log(JSON.stringify(data, null, 2));
    console.log('─'.repeat(60));
    
    if (data.success && data.data) {
      console.log('📊 Resumen:');
      console.log(`   Balance Actual: DOP ${Number(data.data.balanceActual).toLocaleString('es-DO')}`);
      console.log(`   Gastos del Mes: DOP ${Number(data.data.gastosDelMes).toLocaleString('es-DO')}`);
      console.log(`   Estado: ${data.data.estado}`);
      console.log(`   Días con datos: ${data.data.ultimosDias?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error al consultar el endpoint:', error.message);
  }
}

// Ejecutar la prueba
testCajaPrincipal();
