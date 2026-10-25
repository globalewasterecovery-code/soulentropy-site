(() => {
'use strict';
const $ = id => document.getElementById(id);
let clue = '';
$('clueForm').addEventListener('submit', e => {
 e.preventDefault();
 const f = new FormData(e.currentTarget);
 if (!['alias','period','note'].every(k => String(f.get(k)).trim())) { $('clueStatus').textContent = '请填写人物代号、年代和出处。'; return; }
 clue = `SoulEntropy 家族寻踪 · 待核线索（非血缘证明）\n人物代号：${f.get('alias').trim()}\n大致年代：${f.get('period').trim()}\n大致地区：${f.get('region').trim() || '未提供'}\n来源类型：${f.get('source')}\n出处与问题：${f.get('note').trim()}\n\n核验步骤：\n□ 找到原始记录并记下馆藏 / 页码 / 日期\n□ 确认记录年代、地名变化与同名人物\n□ 用独立来源交叉核对，保留矛盾与缺失\n□ 区分口述、转录、推测与已核对的事实\n□ 分享前取得涉及人员授权，隐去联系方式\n\n当前状态：全部待人工核验；未检索档案、未验证身份或血缘。`;
 $('clueText').textContent = clue; $('clueResult').hidden = false; $('clueStatus').textContent = '清单已在本页生成，未上传。';
});
$('downloadClue').addEventListener('click', () => {
 if (!clue) return;
 const url = URL.createObjectURL(new Blob([clue], {type:'text/plain;charset=utf-8'}));
 const a = document.createElement('a'); a.href = url; a.download = 'soulentropy-clue.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('clearClue').addEventListener('click', () => { clue=''; $('clueText').textContent=''; $('clueForm').reset(); $('clueResult').hidden=true; $('clueStatus').textContent='本页线索已清除。已导出文件请自行删除。'; });
$('applyForm').addEventListener('submit', e => {
 e.preventDefault(); const f = new FormData(e.currentTarget);
 if (!String(f.get('nickname')).trim() || !f.get('consent')) return;
 $('applicationText').value=`【SoulEntropy 家族寻踪测试申请 v0.1】\n参与代号：${f.get('nickname').trim()}\n体验方向：${f.get('interest')}\n我已满18岁，自愿联系申请测试，理解本项目仅整理线索、不提供血缘鉴定。请仅将此申请用于测试联系；我可在本对话申请撤回与删除。`;
 $('applyResult').hidden=false; $('applyStatus').textContent='申请文字已生成，尚未发送。请复制后在 Telegram 自行发送。';
});
$('copyApplication').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('applicationText').value); $('applyStatus').textContent='已复制，尚未发送。请打开 Telegram 粘贴并自行发送。'; } catch { $('applicationText').focus(); $('applicationText').select(); $('applyStatus').textContent='无法自动复制，请手动复制选中的文字。尚未发送。'; } });
$('clearApplication').addEventListener('click', () => { $('applyForm').reset(); $('applicationText').value=''; $('applyResult').hidden=true; $('applyStatus').textContent='本页申请已清除。已复制或已发送的内容需自行删除。'; });
})();