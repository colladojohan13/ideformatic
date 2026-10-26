import type {Env} from './index';
export async function mail(env:Env,subject:string,text:string,replyTo?:string,id?:string){
 if(!env.RESEND_API_KEY)throw Error('Correo pendiente de configuración');
 const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json',...(id?{'Idempotency-Key':id}:{})},body:JSON.stringify({from:env.LEAD_FROM_EMAIL,to:[env.LEAD_ADMIN_EMAIL],subject,text,...(replyTo?{reply_to:replyTo}:{})}),signal:AbortSignal.timeout(10000)});
 if(!result.ok)throw Error('No se pudo enviar el correo');
}
export async function notifyLead(id:string,env:Env){const lead=await env.DB.prepare('SELECT * FROM leads WHERE id=?').bind(id).first<Record<string,any>>();if(!lead||lead.notification_status==='enviado')return;
 const now=Date.now();const claim=await env.DB.prepare("UPDATE leads SET notification_status='enviando',notified_at=? WHERE id=? AND (notification_status IN ('pendiente','fallido') OR (notification_status='enviando' AND notified_at<?))").bind(now,id,now-120000).run();if(!claim.meta.changes)return;
 try{await mail(env,`Nueva consulta de Ideformatic: ${lead.service}`,`Nombre: ${lead.name}\nCorreo: ${lead.email}\nServicio: ${lead.service}\nInversión: ${lead.budget}\nInicio: ${lead.timing}\n\n${lead.message}\n\nPanel privado: ${env.API_ORIGIN}/admin`,lead.email,'ideformatic-lead-'+id);await env.DB.prepare("UPDATE leads SET notification_status='enviado',notified_at=? WHERE id=?").bind(Date.now(),id).run();}catch{await env.DB.prepare("UPDATE leads SET notification_status='fallido',notified_at=NULL WHERE id=?").bind(id).run();}
}
