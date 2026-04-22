import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function test() {
  const result = await db.execute(sql
      SELECT 
        b.nombre,
        cb.numero_cuenta,
        cc.saldo_actual,
        cc.nombre as contable_nombre
      FROM cuentas_bancarias cb
      INNER JOIN banks b ON b.id = cb.bank_id
      INNER JOIN cuentas_contables cc ON cc.id = cb.cuenta_contable_id
  );
  console.log(result.rows);
  
  const mov = await db.execute(sql
    SELECT cuenta_bancaria_id, sum(case when tipo='ingreso' then monto else -monto end) as calc_balance 
    FROM movimientos_contables 
    GROUP BY cuenta_bancaria_id
  );
  console.log(mov.rows);
}
test().catch(console.error).finally(() => process.exit(0));
