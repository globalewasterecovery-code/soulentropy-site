// 灵熵 · Qi 轻社区 V1 共用逻辑。所有页面（首页/手记/留言板/资源交换/案例）共用同一套：
// 登录态渲染、发帖（评论/留言/资源/案例统一走 posts 表）、拉取并渲染帖子列表。
import { supabase } from '/js/supabase-client.js';

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

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// 渲染顶部导航里的"账号/加入社区"状态。传入一个容器元素 id。
export async function renderAuthState(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return null;
  const session = await getSession();
  if (session && session.user) {
    const name = (session.user.user_metadata && session.user.user_metadata.display_name) || session.user.email;
    el.innerHTML = `已登录：${escapeHtml(name)} · <a href="#" id="communityLogoutLink">退出</a>`;
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

// 发一条帖子。kind: comment | board | resource_offer | resource_need | resource_trade | case
// target: 评论时用来标记挂在哪个页面/文章上，比如 'home' 或 'journal:local-is-sovereignty'
export async function submitPost({ kind, target = null, title = null, body }) {
  const session = await getSession();
  if (!session || !session.user) {
    throw new Error('NEED_LOGIN');
  }
  const displayName = (session.user.user_metadata && session.user.user_metadata.display_name) || session.user.email;
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: session.user.id, display_name: displayName, kind, target, title, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPosts({ kind, target = null, limit = 50 }) {
  let query = supabase.from('posts').select('*').eq('kind', kind).order('created_at', { ascending: false }).limit(limit);
  if (target !== null) query = query.eq('target', target);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function deletePost(id) {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

// 渲染一个通用留言/评论列表到指定容器（每条：昵称 + 时间 + 正文，标题可选）。
export function renderPostList(containerId, posts, { emptyText = '还没有内容，来写第一条吧。', showTitle = false } = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!posts.length) {
    el.innerHTML = `<p class="empty">${escapeHtml(emptyText)}</p>`;
    return;
  }
  el.innerHTML = posts.map((p) => `
    <article class="post-item">
      ${showTitle && p.title ? `<h3>${escapeHtml(p.title)}</h3>` : ''}
      <p class="post-body">${escapeHtml(p.body)}</p>
      <div class="post-meta">${escapeHtml(p.display_name)} · ${formatTime(p.created_at)}</div>
    </article>
  `).join('');
}

// 挂一个"发帖表单"的提交事件：formId 表单里必须有 id=postBody 的 textarea，
// 可选 id=postTitle 的 input。提交成功后自动清空并调用 onSuccess 刷新列表。
export function wirePostForm({ formId, msgId, kind, target = null, onSuccess }) {
  const form = document.getElementById(formId);
  if (!form) return;
  const msg = document.getElementById(msgId);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) { msg.textContent = ''; msg.className = 'msg'; }
    const bodyEl = form.querySelector('#postBody');
    const titleEl = form.querySelector('#postTitle');
    const body = bodyEl ? bodyEl.value.trim() : '';
    const title = titleEl ? titleEl.value.trim() : null;
    if (!body) return;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await submitPost({ kind, target, title: title || null, body });
      if (bodyEl) bodyEl.value = '';
      if (titleEl) titleEl.value = '';
      if (msg) { msg.textContent = '已发布。'; msg.className = 'msg ok'; }
      if (onSuccess) await onSuccess();
    } catch (err) {
      if (err && err.message === 'NEED_LOGIN') {
        if (msg) { msg.textContent = '请先登录或注册后再发布。'; msg.className = 'msg err'; }
      } else {
        if (msg) { msg.textContent = '发布失败：' + (err && err.message ? err.message : String(err)); msg.className = 'msg err'; }
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
