import {validateLead,statuses} from './validation';
import {authenticated,csrf,cookie,digest,rateKey,safeAdmin,noStore} from './security';
import {notifyLead,mail} from './mail';
import {adminPage} from './admin';
export interface Env{DB:D1Database;ASSETS:Fetcher;LEAD_RATE_SALT:string;RESEND_API_KEY:string;LEAD_ADMIN_EMAIL:string;LEAD_FROM_EMAIL:string;API_ORIGIN:string;PUBLIC_ORIGIN:string;}
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:noStore});
const html=(v:string,status=200)=>new Response(v,{status,headers:{...noStore,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
const page=(body:string)=>`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Panel privado — Ideformatic</title><link rel="stylesheet" href="/admin.css"><body><header>IDEFORMATIC · Panel privado</header><main>${body}</main></body></html>`;
function loginPage(message=''){return page(`<h1>Acceso a consultas</h1><p>El código se envía únicamente al correo del propietario.</p><p>${message}</p><form method="post" action="/auth/request"><button>Enviar código de acceso</button></form><form method="post" action="/auth/verify"><label>Código de 8 dígitos <input name="code" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" required autocomplete="one-time-code"></label><button>Entrar</button></form>`);}
async function body(r:Request,max=16000){const raw=await r.text();if(new TextEncoder().encode(raw).length>max)throw Error('too large');return JSON.parse(raw);}
async function handle(r:Request,env:Env,ctx:ExecutionContext):Promise<Response>{const path=new URL(r.url).pathname;
 if(path==='/health')return json({ok:true});
 if(path==='/login'&&r.method==='GET')return html(loginPage());
 if(path.startsWith('/auth/')&&r.method==='POST'){
  if(r.headers.get('origin')!==new URL(r.url).origin)return json({error:'Origen no válido.'},403);
  if(Number(r.headers.get('content-length'))>2000)return json({error:'Solicitud demasiado larga.'},413);
  const key=await rateKey(r,env),now=Date.now();
  if(path==='/auth/request'){
   await env.DB.prepare('DELETE FROM login_attempts WHERE created_at<?').bind(now-86400000).run();
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE created_at>?').bind(now-900000).first<{n:number}>();if((count?.n||0)>=3)return html(loginPage('Espera unos minutos antes de pedir otro código.'),429);
   await env.DB.prepare('INSERT INTO login_attempts(rate_key,created_at) VALUES(?,?)').bind(key,now).run();
   const random=new Uint32Array(1);crypto.getRandomValues(random);const code=String(10000000+random[0]%90000000);
   await env.DB.prepare('DELETE FROM login_codes').run();await env.DB.prepare('INSERT INTO login_codes(code_hash,expires_at,attempts) VALUES(?,?,0)').bind(await digest(env.LEAD_RATE_SALT+code),now+600000).run();
   try{await mail(env,'Tu código de acceso a Ideformatic',`Código: ${code}\nVálido durante 10 minutos. Si no solicitaste acceso, ignora este correo.`);return html(loginPage('Código enviado al propietario.'));}catch{return html(loginPage('No se pudo enviar el código. Reintenta más tarde.'),503);}
  }
  if(path==='/auth/verify'){
   const raw=await r.text();if(raw.length>2000)return json({error:'Solicitud demasiado larga.'},413);const code=new URLSearchParams(raw).get('code')||'';
   const row=await env.DB.prepare('SELECT code_hash,attempts,expires_at FROM login_codes LIMIT 1').first<{code_hash:string;attempts:number;expires_at:number}>();
   if(!row||row.expires_at<now||row.attempts>=5)return html(loginPage('Código vencido o bloqueado.'),403);
   await env.DB.prepare('UPDATE login_codes SET attempts=attempts+1').run();
   const claimed=await env.DB.prepare('DELETE FROM login_codes WHERE code_hash=? AND attempts<=5 AND expires_at>?').bind(await digest(env.LEAD_RATE_SALT+code),now).run();
   if(!/^[0-9]{8}$/.test(code)||!claimed.meta.changes)return html(loginPage('Código incorrecto.'),403);
   const token=csrf();await env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now).run();await env.DB.prepare('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)').bind(await digest(token),now+28800000).run();
   return new Response(null,{status:303,headers:{...noStore,Location:'/admin','Set-Cookie':`ideformatic_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
  }
 }
 if(path==='/admin'&&r.method==='GET')return adminPage(r,env);
 if(path==='/api/admin/leads'&&r.method==='POST'){
  if(!await authenticated(r,env)||!safeAdmin(r))return json({error:'Acceso restringido.'},403);
  const data=await body(r,1000);if(typeof data.id!=='string'||data.id.length>40)return json({error:'Consulta no válida.'},400);
  if(data.action==='notify'){await notifyLead(data.id,env);return json({ok:true,...await env.DB.prepare('SELECT notification_status FROM leads WHERE id=?').bind(data.id).first()});}
  if(!statuses.includes(data.status))return json({error:'Estado no válido.'},400);const result=await env.DB.prepare('UPDATE leads SET status=?,updated_at=? WHERE id=?').bind(data.status,Date.now(),data.id).run();return json({ok:!!result.meta.changes},result.meta.changes?200:404);
 }
 if(path==='/api/leads'&&r.method==='POST'){
  if(r.headers.get('origin')!==env.PUBLIC_ORIGIN||!r.headers.get('content-type')?.startsWith('application/json'))return json({error:'Origen no permitido.'},403);
  const input=await body(r);if(typeof input.website==='string'&&input.website.trim())return json({ok:true});const lead=validateLead(input);if(!lead)return json({error:'Revisa los campos de la solicitud.'},400);
  const key=await rateKey(r,env),now=Date.now();const existing=await env.DB.prepare('SELECT id FROM leads WHERE id=?').bind(lead.id).first();if(existing)return json({ok:true,id:lead.id});
  const result=await env.DB.prepare("INSERT OR IGNORE INTO leads(id,name,email,service,budget,timing,message,status,created_at,updated_at,rate_key,privacy_version,notification_status) SELECT ?,?,?,?,?,?,?,'nuevo',?,?,?,'2026-10-25','pendiente' WHERE (SELECT COUNT(*) FROM leads WHERE rate_key=? AND created_at>?)<5").bind(lead.id,lead.name,lead.email,lead.service,lead.budget,lead.timing,lead.message,now,now,key,key,now-900000).run();if(!result.meta.changes){const dupe=await env.DB.prepare('SELECT id FROM leads WHERE id=?').bind(lead.id).first();return dupe?json({ok:true,id:lead.id}):json({error:'Espera unos minutos antes de enviar otra consulta.'},429);}
  ctx.waitUntil(notifyLead(lead.id,env));return json({ok:true,id:lead.id},201);
 }
 if(path==='/admin.css'||path==='/admin.js')return env.ASSETS.fetch(r);
 return json({error:'No encontrado.'},404);
}
export default{async fetch(r:Request,env:Env,ctx:ExecutionContext){const origin=r.headers.get('origin'),cors=r.url.includes('/api/leads')&&origin===env.PUBLIC_ORIGIN;
 if(r.method==='OPTIONS'){return new Response(null,{status:cors?204:403,headers:cors?{'Access-Control-Allow-Origin':env.PUBLIC_ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'}:{}});}
 let response;try{response=await handle(r,env,ctx);}catch{response=json({error:'No pudimos confirmar la recepción. Reintenta o escríbenos por correo.'},503);}
 if(cors){response=new Response(response.body,response);response.headers.set('Access-Control-Allow-Origin',env.PUBLIC_ORIGIN);response.headers.set('Vary','Origin');}return response;
}};
