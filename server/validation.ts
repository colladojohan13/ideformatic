export const services=['Web y ecommerce','Software empresarial','IA y experiencias 3D','Quiero orientación'];
export const budgets=['Por definir','Menos de US$500','US$500–1,500','US$1,500–3,000','Más de US$3,000'];
export const timings=['Por definir','Lo antes posible','En un mes','En 2–3 meses'];
export const statuses=['nuevo','contactado','propuesta','ganado','descartado'];
export function validateLead(input:unknown){
  if(!input||typeof input!=='object')return null;
  const value=input as Record<string,unknown>;
  const clean=(key:string)=>typeof value[key]==='string'?(value[key] as string).trim():'';
  const data={id:clean('id'),name:clean('name'),email:clean('email'),service:clean('service'),budget:clean('budget'),timing:clean('timing'),message:clean('message')};
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id))return null;
  if(data.name.length<2||data.name.length>100||/[\r\n\x00-\x1f]/.test(data.name))return null;
  if(data.email.length>180||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email))return null;
  if(!services.includes(data.service)||!budgets.includes(data.budget)||!timings.includes(data.timing))return null;
  if(data.message.length<15||data.message.length>4000||/\x00/.test(data.message))return null;
  if(value.privacyVersion!=='2026-10-25')return null;
  return data;
}
