import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('test-results',{recursive:true});
await build({entryPoints:['server/index.ts'],outfile:'test-results/worker.mjs',bundle:true,format:'esm',platform:'browser'});
const mf=new Miniflare({modules:true,scriptPath:'test-results/worker.mjs',compatibilityDate:'2026-05-22',d1Databases:['DB'],bindings:{PUBLIC_ORIGIN:'https://colladojohan13.github.io',API_ORIGIN:'https://api.example.test',LEAD_RATE_SALT:'local-test-only-salt',LEAD_ADMIN_EMAIL:'owner@example.com',LEAD_FROM_EMAIL:'owner@example.com',RESEND_API_KEY:'local-test-only'}});
const db=await mf.getD1Database('DB');await db.exec((await fs.readFile('server/schema.sql','utf8')).replaceAll('--> statement-breakpoint','').replaceAll('\n',' '));
const call=(p,opts={})=>mf.dispatchFetch('https://api.example.test'+p,opts);
const lead={id:crypto.randomUUID(),name:'Prueba migración',email:'qa@example.com',service:'Web y ecommerce',budget:'Por definir',timing:'Por definir',message:'Prueba de formulario de migración con datos ficticios.',privacyVersion:'2026-10-25'};
const send=(v,origin='https://colladojohan13.github.io')=>call('/api/leads',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(v)});
try{
assert.equal((await call('/admin')).status,403);
assert.equal((await call('/api/admin/leads',{method:'POST',body:'{}'})).status,403);
assert.equal((await send(lead,'https://evil.example')).status,403);
const pre=await call('/api/leads',{method:'OPTIONS',headers:{origin:'https://colladojohan13.github.io'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),'https://colladojohan13.github.io');
assert.equal((await send({...lead,message:'corto'})).status,400);
assert.equal((await send(lead)).status,201);assert.equal((await send(lead)).status,200);
assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM leads').first()).n,1);
for(let i=0;i<4;i++)assert.equal((await send({...lead,id:crypto.randomUUID()})).status,201);
assert.equal((await send({...lead,id:crypto.randomUUID()})).status,429);
const digest=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const session='a'.repeat(64);await db.prepare('INSERT INTO sessions VALUES(?,?)').bind(await digest(session),Date.now()+60000).run();
const admin=await call('/admin',{headers:{cookie:'ideformatic_session='+session}});assert.equal(admin.status,200);assert.match(await admin.text(),/Prueba migración/);
const csrfCookie=admin.headers.get('set-cookie').split(';')[0],csrfToken=csrfCookie.split('=')[1];
let res=await call('/api/admin/leads',{method:'POST',headers:{origin:'https://api.example.test',cookie:'ideformatic_session='+session},body:JSON.stringify({id:lead.id,status:'ganado'})});assert.equal(res.status,403);
res=await call('/api/admin/leads',{method:'POST',headers:{origin:'https://api.example.test',cookie:'ideformatic_session='+session+'; '+csrfCookie,'x-csrf-token':csrfToken},body:JSON.stringify({id:lead.id,status:'contactado'})});assert.equal(res.status,200);
assert.equal((await db.prepare('SELECT status FROM leads WHERE id=?').bind(lead.id).first()).status,'contactado');
console.log('PASS: CORS, validation, persistence, idempotency, rate limits, private panel, session and CSRF-protected updates.');
}finally{await mf.dispose()}

