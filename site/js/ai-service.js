import { supabase } from '/js/supabase-client.js';
import { renderAuthState, escapeHtml } from '/js/community.js';
const labels={submitted:'等待评估',assessing:'技术评估中',awaiting_information:'等待补充资料',quoted:'已提供报价',accepted:'已确认承接',working:'处理中',testing:'测试验收中',awaiting_payment:'等待人工核实到账',delivered:'已交付',declined:'暂不承接'};
let currentUser=null; let requestId=crypto.randomUUID();
const form=document.getElementById('requestForm'), msg=document.getElementById('requestMsg');
async function loadOrders(){
 const list=document.getElementById('orderList');if(!currentUser){list.textContent='登录后查看你的需求。';return;}
 list.textContent='正在读取…';
 const {data,error}=await supabase.from('technical_requests').select('id,title,service,created_at,technical_progress(*)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(30);
 if(error){list.textContent='暂时无法读取进度，请刷新重试。';return;}
 list.innerHTML=data.length?data.map(r=>{const p=Array.isArray(r.technical_progress)?r.technical_progress[0]:r.technical_progress;return `<article class="post-item"><h3>${escapeHtml(r.title)}</h3><span class="status-pill">${escapeHtml(labels[p?.status]||'等待评估')}</span><p class="post-meta">${escapeHtml(r.id)} · ${escapeHtml(new Date(r.created_at).toLocaleString())}</p><p class="order-details">${escapeHtml(p?.customer_note||'已登记，等待评估。')}</p>${p?.quote!=null?`<p>报价：${escapeHtml(p.quote)} ${escapeHtml(p.quote_currency)} · 请联系负责人确认范围与承接</p>`:''}</article>`;}).join(''):'还没有需求。可以先提交一个具体问题。';
}
async function refreshAuth(){
 try{await renderAuthState('authState');const {data,error}=await supabase.auth.getUser(); currentUser=error?null:data.user;
 document.getElementById('loginGate').hidden=!!currentUser;form.hidden=!currentUser;await loadOrders();}
 catch{document.getElementById('authState').textContent='登录连接暂不可用';msg.textContent='请稍后刷新重试。';}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const btn=document.getElementById('submitRequest');btn.disabled=true;msg.textContent='正在提交…';msg.className='msg';
 try{const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('登录已过期，请重新登录。');const f=new FormData(form);
 const payload={title:f.get('title').trim(),service:f.get('service'),environment:f.get('environment').trim(),description:f.get('description').trim(),acceptance:f.get('acceptance').trim(),budget:f.get('budget')===''?null:Number(f.get('budget')),currency:f.get('currency'),authorization_confirmed:f.has('authorization'),privacy_consent:f.has('consent'),client_request_id:requestId};
 const result=await supabase.from('technical_requests').insert(payload).select('id').single();if(result.error){if(result.error.code==='23505'){msg.textContent='该需求已经提交，请在下方刷新查看。';await loadOrders();return;}throw result.error;}
 msg.textContent='需求已入库，编号：'+result.data.id+'。等待技术评估，尚未收费或承接。';msg.className='msg ok';form.reset();requestId=crypto.randomUUID();await loadOrders();
 }catch(err){msg.textContent='提交未成功：'+(err.message||'请稍后重试')+'。内容仍保留在表单中。';msg.className='msg err';}finally{btn.disabled=false;}
});
document.getElementById('refreshOrders').addEventListener('click',loadOrders);
supabase.auth.onAuthStateChange(()=>{setTimeout(refreshAuth,0);});refreshAuth();
