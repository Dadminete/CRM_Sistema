/**
 * Script para crear la tabla sesiones_usuario
 * Ejecutar con: node migrations/run-create-sesiones-usuario.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:20050209@localhost:5432/management_studio_db_v6';
  
  console.log('🔍 Usando conexión a base de datos...');
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');

    // Verificar si la tabla ya existe
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sesiones_usuario'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('ℹ️  La tabla sesiones_usuario ya existe. Saltando creación.');
      return;
    }

    console.log('📝 Leyendo archivo de migración...');
    const sqlFile = join(__dirname, 'create_sesiones_usuario_table.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    console.log('🚀 Ejecutando migración...');
    await client.query(sql);

    console.log('✅ Tabla sesiones_usuario creada exitosamente');
    console.log('✅ Índices creados correctamente');

    // Verificar la creación
    const verify = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sesiones_usuario' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Columnas de la tabla sesiones_usuario:');
    verify.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

runMigration();
