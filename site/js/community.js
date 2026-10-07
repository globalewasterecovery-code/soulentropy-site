// 五站共享社区组件库 · community-core.js (SoulEntropy V0.1 Funnel Edition)
import { supabase } from '/js/supabase-client.js';

const SITE = 'soulentropy';

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function publicDisplayName(user) {
  const meta = (user && user.user_metadata) || {};
  if (meta.display_name) return meta.display_name;
  const uid = (user && user.id) || '';
  return '访客' + uid.replace(/-/g, '').slice(0, 6);
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function renderAuthState(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return null;
  const session = await getSession();
  if (session && session.user) {
    const name = (session.user.user_metadata && session.user.user_metadata.display_name) || session.user.email;
    const isTest = (session.user.user_metadata && session.user.user_metadata.is_test) ? ' <span style="font-size:0.75rem;color:#8fd0c0;">[测试账号]</span>' : '';
    el.innerHTML = `已登录：${escapeHtml(name)}${isTest} · <a href="#" id="communityLogoutLink">退出</a>`;
    const logoutLink = document.getElementById('communityLogoutLink');
    if (logoutLink) {
      logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.reload();
      });
    }
  } else {
    el.innerHTML = '<a href="/signup/" class="cta-join">加入社区</a> · <a href="/login/">登录</a>';
  }
  return session;
}

// Prompt Frictionless Auth Modal for Section A / B
export function promptFrictionlessAuth({ pendingComment, onAuthenticated }) {
  const existingModal = document.getElementById('frictionlessAuthModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'frictionlessAuthModal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-box">
      <h3>只差最后一步</h3>
      <p>写得太好了！填写您的 <b>称呼</b> 与 <b>Email</b> 即可永久保存并发表您的观点。</p>
      <form id="frictionlessAuthForm" class="community-form">
        <input type="text" id="authDisplayName" placeholder="您的称呼（如：自由思想者）" required maxlength="50" />
        <input type="email" id="authEmail" placeholder="您的常用 Email（用于接收回复通知）" required />
        <label style="font-size:0.8rem;color:var(--muted);display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" id="authIsTest" /> 标记为测试账号 (IS_TEST=TRUE，剔除出真实增长指标)
        </label>
        <p class="msg" id="authModalMsg"></p>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelAuthBtn">取消</button>
          <button type="submit" class="btn-primary">保存并发表</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('#frictionlessAuthForm');
  const cancelBtn = modal.querySelector('#cancelAuthBtn');
  const msgEl = modal.querySelector('#authModalMsg');

  cancelBtn.addEventListener('click', () => modal.remove());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.textContent = '正在为您保存…';
    msgEl.className = 'msg';

    const name = modal.querySelector('#authDisplayName').value.trim();
    const email = modal.querySelector('#authEmail').value.trim();
    const isTest = modal.querySelector('#authIsTest').checked;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'SoulEntropy_' + Math.random().toString(36).slice(2) + '!',
        options: {
          data: { display_name: name, is_test: isTest }
        }
      });

      if (error && !error.message.includes('User already registered')) {
        throw error;
      }

      // Refresh session
      let session = await getSession();
      if (!session && data && data.user) {
        // Fallback session metadata for immediate publish
        session = { user: data.user };
      }

      modal.remove();
      if (onAuthenticated) await onAuthenticated(name, isTest);
    } catch (err) {
      msgEl.textContent = '保存失败：' + (err.message || '请稍后再试');
      msgEl.className = 'msg err';
    }
  });
}

export async function submitPost({ kind, category = null, target = null, title = null, body, tags = [] }) {
  const session = await getSession();
  if (!session || !session.user) {
    throw new Error('NEED_LOGIN');
  }
  const displayName = publicDisplayName(session.user);
  const isTest = session.user.user_metadata && session.user.user_metadata.is_test;

  const finalTags = (tags && tags.length) ? [...tags] : [];
  if (isTest && !finalTags.includes('test:true')) {
    finalTags.push('test:true');
  }
  if (!finalTags.includes('author:HUMAN')) {
    finalTags.push('author:HUMAN');
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: session.user.id,
      display_name: displayName,
      site: SITE,
      kind,
      category,
      target,
      title,
      body,
      tags: finalTags,
    })
    .select()
    .single();

  if (error) {
    if (String(error.message || '').includes('RATE_LIMITED')) throw new Error('发布太频繁，请稍后再试');
    throw error;
  }
  return data;
}

export async function fetchPosts({ kind, category = null, target = null, tag = null, q = null, limit = 50 }) {
  let query = supabase.from('posts').select('*').eq('site', SITE).eq('kind', kind).eq('status', 'active').order('created_at', { ascending: false }).limit(limit);
  if (target !== null) query = query.eq('target', target);
  if (category !== null) query = query.eq('category', category);
  if (tag !== null) query = query.contains('tags', [tag]);
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updatePost(id, body) {
  const { error } = await supabase.from('posts').update({ body, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id) {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

export async function reportPost(id, reason = 'user_reported') {
  const session = await getSession();
  if (!session || !session.user) throw new Error('NEED_LOGIN');
  const { error } = await supabase.from('reports').insert({ post_id: id, reporter_user_id: session.user.id, reason });
  if (error) throw error;
}

export function renderPostList(containerId, posts, { emptyText = '还没有内容，来写第一条吧。', showTitle = false, actionable = true } = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!posts.length) {
    el.innerHTML = `<p class="empty">${escapeHtml(emptyText)}</p>`;
    return;
  }
  const render = (uid) => {
    el.innerHTML = posts.map((p) => {
      const mine = actionable && uid && p.user_id === uid;
      const isAI = (p.tags && p.tags.includes('author:AI')) || String(p.display_name).startsWith('[AI');
      
      let aiBadge = '';
      if (isAI) {
        if (p.display_name.includes('观察者')) aiBadge = '<span class="ai-badge">AI 观察者</span>';
        else if (p.display_name.includes('怀疑论者')) aiBadge = '<span class="ai-badge">AI 怀疑论者</span>';
        else if (p.display_name.includes('连续性守护者')) aiBadge = '<span class="ai-badge">AI 连续性守护者</span>';
        else if (p.display_name.includes('主持人')) aiBadge = '<span class="ai-badge">AI 讨论主持人</span>';
        else aiBadge = '<span class="ai-badge">AI 智能体</span>';
      }

      const isTest = (p.tags && p.tags.includes('test:true'));
      const testBadge = isTest ? ' <span style="font-size:0.7rem;color:#8fd0c0;">(测试)</span>' : '';

      const tagsHtml = (p.tags && p.tags.length) ? `<div class="post-tags">${p.tags.filter(t => !t.startsWith('author:') && !t.startsWith('persona:') && !t.startsWith('parent:')).map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}</div>` : '';
      
      const actions = !actionable ? '' : (mine
        ? `<button type="button" class="post-action" data-act="reply" data-id="${p.id}" data-author="${escapeHtml(p.display_name)}">回复</button><button type="button" class="post-action" data-act="edit" data-id="${p.id}">编辑</button><button type="button" class="post-action" data-act="delete" data-id="${p.id}">删除</button>`
        : `<button type="button" class="post-action" data-act="reply" data-id="${p.id}" data-author="${escapeHtml(p.display_name)}">回复</button><button type="button" class="post-action" data-act="report" data-id="${p.id}">举报</button>`);
      
      return `<article class="post-item" data-post-id="${p.id}">
        ${showTitle && p.title ? `<h3>${escapeHtml(p.title)}</h3>` : ''}
        <p class="post-body" data-body>${escapeHtml(p.body)}</p>
        ${tagsHtml}
        <div class="post-meta">${escapeHtml(p.display_name)}${aiBadge}${testBadge} · ${formatTime(p.created_at)}${p.updated_at ? ' · 已编辑' : ''} <span class="post-actions">${actions}</span></div>
      </article>`;
    }).join('');
    
    if (!actionable) return;
    el.querySelectorAll('.post-action').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        const author = btn.dataset.author;
        const article = el.querySelector(`[data-post-id="${id}"]`);
        
        if (act === 'reply') {
          const bodyEl = document.querySelector('textarea#postBody');
          if (bodyEl) {
            bodyEl.value = `@${author} ` + bodyEl.value;
            bodyEl.focus();
            bodyEl.dataset.parentId = id;
          }
        } else if (act === 'delete') {
          if (!confirm('确定删除这条内容？删除后无法恢复。')) return;
          try { await deletePost(id); article.remove(); } catch (e) { alert('删除失败：' + (e && e.message ? e.message : e)); }
        } else if (act === 'edit') {
          const bodyEl = article.querySelector('[data-body]');
          const current = (posts.find((p) => String(p.id) === String(id)) || {}).body || '';
          const next = prompt('修改内容：', current);
          if (next === null || !next.trim()) return;
          try { await updatePost(id, next.trim()); bodyEl.textContent = next.trim(); } catch (e) { alert('修改失败：' + (e && e.message ? e.message : e)); }
        } else if (act === 'report') {
          if (!confirm('确定要举报这条内容给管理员吗？')) return;
          try { await reportPost(id); btn.textContent = '已举报'; btn.disabled = true; } catch (e) {
            if (e && e.message === 'NEED_LOGIN') alert('请先登录后再举报。');
            else alert('举报失败：' + (e && e.message ? e.message : e));
          }
        }
      });
    });
  };
  getSession().then((session) => render(session && session.user ? session.user.id : null));
}

export function wirePostForm({ formId, msgId, kind, category = null, target = null, onSuccess }) {
  const form = document.getElementById(formId);
  if (!form) return;
  const msg = document.getElementById(msgId);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) { msg.textContent = ''; msg.className = 'msg'; }
    const bodyEl = form.querySelector('#postBody');
    const titleEl = form.querySelector('#postTitle');
    const tagsEl = form.querySelector('#postTags');
    const catEl = form.querySelector('#postCategory');
    const body = bodyEl ? bodyEl.value.trim() : '';
    const title = titleEl ? titleEl.value.trim() : null;
    const tags = tagsEl ? tagsEl.value.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const cat = catEl ? catEl.value : category;

    const parentId = bodyEl ? bodyEl.dataset.parentId : null;
    if (parentId) {
      tags.push(`parent:${parentId}`);
    }

    if (!body) return;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const executePublish = async () => {
      try {
        const postData = await submitPost({ kind, category: cat, target, title: title || null, body, tags });
        if (bodyEl) {
          bodyEl.value = '';
          delete bodyEl.dataset.parentId;
        }
        if (titleEl) titleEl.value = '';
        if (tagsEl) tagsEl.value = '';
        if (msg) { msg.textContent = '已成功发表。'; msg.className = 'msg ok'; }
        
        await renderAuthState('authState');
        if (onSuccess) await onSuccess(postData);
      } catch (err) {
        if (err && err.message === 'NEED_LOGIN') {
          promptFrictionlessAuth({
            pendingComment: body,
            onAuthenticated: async (name, isTest) => {
              await executePublish();
            }
          });
        } else {
          if (msg) { msg.textContent = '发布失败：' + (err && err.message ? err.message : String(err)); msg.className = 'msg err'; }
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    };

    await executePublish();
  });
}
