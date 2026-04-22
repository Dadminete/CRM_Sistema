async function run() {
  try {
    const res = await fetch("http://172.16.0.25:3000/api/cajas/sesiones/history?limit=50");
    const data = await res.json();
    let hasIncome = 0;
    
    for (const session of data.data) {
      if (session.totalIngresos > 0 || session.totalGastos > 0) {
        hasIncome++;
        console.log(`Session ${session.cajaNombre} from ${session.fechaApertura} to ${session.fechaCierre} has Ingresos: ${session.totalIngresos}, Gastos: ${session.totalGastos}`);
      }
    }
    console.log(`\nTotal sessions: ${data.data.length}. Sessions with movements: ${hasIncome}`);
  } catch (err) {
    console.error(err);
  }
}
run();
