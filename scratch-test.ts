import { GET } from './src/app/api/banco/dashboard/route';
GET().then(r => r.json()).then(console.log).catch(console.error);
