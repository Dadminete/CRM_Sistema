import * as fs from 'fs';

function getTables(content) {
  const matches = [...content.matchAll(/pgTable\(\s*(["'])(.+?)\1/g)];
  return matches.map(m => m[2]).sort();
}

function getEnums(content) {
  const matches = [...content.matchAll(/pgEnum\(\s*(["'])(.+?)\1/g)];
  return matches.map(m => m[2]).sort();
}

function run() {
  const v1 = fs.readFileSync('./src/lib/db/schema.ts', 'utf8');
  let v2 = '';
  try {
    v2 = fs.readFileSync('./.drizzle_temp/schema.ts', 'utf8');
  } catch (e) {
    console.error('Remote schema not found:', e.message);
    return;
  }

  const t1 = getTables(v1);
  const t2 = getTables(v2);

  console.log('Local Tables count:', t1.length);
  console.log('Remote Tables count:', t2.length);
  console.log('Tables only in Local:', t1.filter(x => !t2.includes(x)));
  console.log('Tables only in Remote:', t2.filter(x => !t1.includes(x)));

  const e1 = getEnums(v1);
  const e2 = getEnums(v2);
  console.log('Local Enums count:', e1.length);
  console.log('Remote Enums count:', e2.length);
  console.log('Enums only in Local:', e1.filter(x => !e2.includes(x)));
  console.log('Enums only in Remote:', e2.filter(x => !e1.includes(x)));
}

run();
