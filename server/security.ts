import type {Env} from './index';
export const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export const escapeHtml=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const csrf=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
export const cookie=(v:string,url:string)=>`ideformatic_csrf=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${url.startsWith('https:')?'; Secure':''}`;
export function getCookie(r:Request,n:string){return r.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(n+'='))?.slice(n.length+1)||'';}
export async function digest(v:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function authenticated(r:Request,env:Env){const token=getCookie(r,'ideformatic_session');if(!/^[a-f0-9]{64}$/.test(token))return false;return !!await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first();}
export function safeAdmin(r:Request){return r.headers.get('origin')===new URL(r.url).origin&&!!r.headers.get('x-csrf-token')&&r.headers.get('x-csrf-token')===getCookie(r,'ideformatic_csrf');}
export async function rateKey(r:Request,env:Env){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LEAD_RATE_SALT),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(r.headers.get('cf-connecting-ip')||'local')))].map(n=>n.toString(16).padStart(2,'0')).join('');}
