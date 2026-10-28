const menu=document.querySelector('.menu'),navigation=document.querySelector('#navigation');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open)});navigation.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');navigation.classList.remove('open')}));
const form=document.querySelector('#inquiry'),status=document.querySelector('#form-status');let submissionId=crypto.randomUUID();let sending=false;let lastPlanPrompt='';document.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>{form.elements.service.value=a.dataset.service;if(a.dataset.plan){form.elements.budget.value=a.dataset.budget;const hint=document.querySelector('#selected-plan');hint.hidden=false;hint.textContent=`Paquete seleccionado: ${a.dataset.plan}, desde ${a.dataset.price}. El alcance final se confirma en la propuesta.`;const prompt=`Me interesa el paquete ${a.dataset.plan}, desde ${a.dataset.price}. Mi proyecto: `;if(!form.elements.message.value||form.elements.message.value===lastPlanPrompt)form.elements.message.value=prompt;lastPlanPrompt=prompt;}else{document.querySelector('#selected-plan').hidden=true;}}));
form.addEventListener('submit',async event=>{event.preventDefault();if(sending||!form.reportValidity())return;const button=form.querySelector('button[type="submit"]');const data=Object.fromEntries(new FormData(form));sending=true;button.disabled=true;button.textContent='Enviando consulta…';status.textContent='Estamos guardando tu solicitud.';try{const response=await fetch(window.IDEFORMATIC_API+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,id:submissionId,privacyVersion:'2026-10-25'})});const result=await response.json();if(!response.ok)throw Error(result.error||'No pudimos confirmar la recepción.');status.textContent='Consulta recibida. Gracias por compartir tu proyecto; te contactaremos al correo indicado.';form.reset();submissionId=crypto.randomUUID();}catch(error){status.textContent=error.message||'No pudimos confirmar la recepción. Reintenta o escríbenos a colladojohan269@gmail.com.';}finally{sending=false;button.disabled=false;button.textContent='Enviar mi consulta ↗';}});document.querySelector('#year').textContent=String(new Date().getFullYear());

// Goal-based exploration keeps every package visible and preserves real prices.
const recommendationCopy=[
 'Web Inicio: lo esencial para presentar tu negocio con enlaces de contacto, desde US$99.',
 'Web Esencial: una presentación más completa, con formulario para recibir consultas.',
 'Tienda Emprende: catálogo, carrito y pedidos para empezar a vender online.',
 'Gestión Inicial: una base para organizar ventas, inventario y clientes.'
];
const goalButtons=[...document.querySelectorAll('[data-recommend]')];
goalButtons.forEach(button=>button.addEventListener('click',()=>{
 const index=Number(button.dataset.recommend);
 goalButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
 document.querySelectorAll('.price-plan').forEach((card,i)=>card.classList.toggle('is-suggested',i===index));
 document.querySelector('#plan-guidance').textContent=recommendationCopy[index];
 document.querySelector('.guide-jump').href=`#plan-${index}`;
 const guide=document.querySelector('.plan-guide');guide.classList.remove('is-updating');requestAnimationFrame(()=>guide.classList.add('is-updating'));
}));
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let scrollFrame=0;
function updateReading(){scrollFrame=0;const max=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--reading',max>0?String(scrollY/max):'0')}
addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateReading)},{passive:true});addEventListener('resize',updateReading);updateReading();
if('IntersectionObserver' in window){const pricingObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){if(!motionPreference.matches)entry.target.classList.add('plan-enter');pricingObserver.unobserve(entry.target)}},{threshold:.08});pricingObserver.observe(document.querySelector('.pricing-grid'))}
document.querySelectorAll('.price-plan').forEach(card=>card.addEventListener('pointermove',event=>{if(motionPreference.matches||event.pointerType==='touch')return;const rect=card.getBoundingClientRect();card.style.setProperty('--pointer-x',`${event.clientX-rect.left}px`);card.style.setProperty('--pointer-y',`${event.clientY-rect.top}px`)}));
const art=document.querySelector('.hero-art');art.addEventListener('pointermove',event=>{if(motionPreference.matches||event.pointerType==='touch')return;const rect=art.getBoundingClientRect();art.style.setProperty('--art-x',`${(event.clientX-rect.left-rect.width/2)*.035}px`);art.style.setProperty('--art-y',`${(event.clientY-rect.top-rect.height/2)*.035}px`)});art.addEventListener('pointerleave',()=>{art.style.setProperty('--art-x','0px');art.style.setProperty('--art-y','0px')});
