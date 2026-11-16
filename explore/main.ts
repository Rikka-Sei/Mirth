import './style.css';
import { element, icon, required, type IconName } from '../src/dom.ts';

// 可丢弃视觉样板：这些局部工厂用于审阅外观，不作为正式组件 API。
type SampleMessage = { id: number; author: string; initials: string; tone?: string; time: string; text: string; continuation?: string; own?: boolean; quote?: { author: string; text: string }; attachment?: string; reaction?: { label: string; count: number; active: boolean } };
type SampleRoom = { id: string; kind: 'group' | 'direct' | 'notes'; name: string; initials: string; tone: string; preview: string; time: string; unread: number; subtitle: string; messages: [SampleMessage, ...SampleMessage[]] };
const rooms: [SampleRoom, SampleRoom, SampleRoom, SampleRoom] = [
  { id: 'design', kind: 'group', name: '设计与体验', initials: '设', tone: 'blue', preview: 'Mia：界面笔记已经整理好了。', time: '14:28', unread: 2, subtitle: '4 位示例成员 · 不连接 Matrix', messages: [
    { id: 1, author: 'Lin', initials: 'L', time: '14:20', text: '我想要的聊天界面，是打开之后就能安心阅读。', continuation: '不需要每条消息都提醒我，这里有多少按钮。', reaction: { label: '赞同', count: 3, active: false } },
    { id: 2, author: '陈默', initials: '陈', tone: 'stone', time: '14:23', text: '轻一点，但不要软绵绵。\n留白、对齐和文字本身，就能把层次建立起来。' },
    { id: 3, author: '你', initials: 'R', time: '14:25', text: '先把阅读做好，再让操作自然出现。', own: true, quote: { author: 'Lin', text: '打开之后就能安心阅读。' } },
    { id: 4, author: 'Mia', initials: 'M', tone: 'rose', time: '14:28', text: '整理了这一版的界面笔记。\n我们也可以切到「组件预览」，单独看看各种状态。', attachment: '界面方向与组件笔记.pdf' },
  ] },
  { id: 'team', kind: 'group', name: '工程讨论', initials: '工', tone: 'stone', preview: '陈默：组件的状态也一起整理。', time: '13:46', unread: 0, subtitle: '示例群聊 · 不连接 Matrix', messages: [
    { id: 5, author: '陈默', initials: '陈', tone: 'stone', time: '13:42', text: '颜色、间距、排版是一套规则。\n会话行、消息组和编辑器，也应该使用相同的组件。' },
    { id: 6, author: '你', initials: 'R', time: '13:46', text: '不引入 UI 框架。先验证视觉和交互，再确定正式接口。', own: true },
  ] },
  { id: 'lin', kind: 'direct', name: 'Lin', initials: 'L', tone: 'blue', preview: '周末去走走？', time: '12:18', unread: 1, subtitle: '私人对话 · 示例数据，不代表在线状态', messages: [
    { id: 7, author: 'Lin', initials: 'L', time: '12:18', text: '周末去走走？\n最近发现了一条很安静的山间步道。' },
    { id: 8, author: '你', initials: 'R', time: '12:21', text: '好，带上相机。', own: true },
  ] },
  { id: 'notes', kind: 'notes', name: '随手记', initials: '记', tone: 'rose', preview: '留一点空间，给新的想法。', time: '昨天', unread: 0, subtitle: '个人笔记 · 示例数据', messages: [
    { id: 9, author: '你', initials: 'R', time: '昨天', text: '轻盈，不是少做功能。\n稳重，也不等于让界面变得厚重。', own: true },
  ] },
];
const workspace = required<HTMLElement>('.workspace');
const timeline = required<HTMLElement>('#timeline');
const input = required<HTMLTextAreaElement>('#message-input');
const send = required<HTMLButtonElement>('#send-button');
const detail = required<HTMLDialogElement>('#detail-dialog');
const actionDialog = required<HTMLDialogElement>('#action-dialog');
const search = required<HTMLInputElement>('#room-search');
const fileInput = required<HTMLInputElement>('#file-input');
const drafts = new Map<string, { text: string; quote?: SampleMessage; file?: File }>();
let selected = rooms[0];
let page: 'chat' | 'gallery' = 'chat';
let composing = false;
let nextId = 20;
let previousActionTrigger: HTMLElement | null = null;
const draft = () => { let value = drafts.get(selected.id); if (!value) { value = { text: '' }; drafts.set(selected.id, value); } return value; };
const say = (message: string) => { required('#announcement').textContent = message; };
function uiIcon(name: IconName | 'more'): SVGSVGElement {
  if (name !== 'more') return icon(name);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('fill', 'currentColor');
  for (const x of [5, 12, 19]) { const dot = document.createElementNS(svg.namespaceURI, 'circle'); dot.setAttribute('cx', String(x)); dot.setAttribute('cy', '12'); dot.setAttribute('r', '1.5'); svg.append(dot); }
  return svg;
}
function control(name: IconName | 'more', label: string, action: () => void, extra = ''): HTMLButtonElement {
  const button = element('button', `icon-button ${extra}`.trim()); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label); button.append(uiIcon(name)); button.addEventListener('click', action); return button;
}
function avatar(initials: string, tone = 'blue'): HTMLElement { const node = element('span', `avatar ${tone}`, initials); node.setAttribute('aria-hidden', 'true'); return node; }
function textButton(label: string, action: () => void, kind = ''): HTMLButtonElement { const button = element('button', `component-button ${kind}`.trim(), label); button.type = 'button'; button.addEventListener('click', action); return button; }
function quote(author: string, text: string): HTMLElement { const node = element('div', 'quote'); node.append(element('strong', '', author), element('p', '', text)); return node; }
function roomRow(room: SampleRoom, active = false): HTMLButtonElement {
  const row = element('button', 'room'); row.type = 'button'; row.setAttribute('aria-current', String(active));
  const copy = element('div', 'room-copy'); const title = element('div', 'room-title'); title.append(element('strong', '', room.name), element('time', '', room.time));
  const preview = element('div', 'room-preview'); preview.append(element('span', '', room.preview)); if (room.unread) preview.append(element('span', 'unread', String(room.unread)));
  copy.append(title, preview); row.append(avatar(room.initials, room.tone), copy); row.addEventListener('click', () => selectRoom(room)); return row;
}
function renderRooms(): void { const query = search.value.trim().toLocaleLowerCase(); const list = required('#rooms'); list.replaceChildren(); const matches = rooms.filter(room => `${room.name} ${room.preview}`.toLocaleLowerCase().includes(query)); for (const room of matches) list.append(roomRow(room, room === selected)); if (!matches.length) list.append(element('p', 'secondary-text', '没有匹配的示例会话。')); }
function react(message: SampleMessage): void {
  if (!message.reaction) message.reaction = { label: '赞同', count: 1, active: true };
  else { message.reaction.active = !message.reaction.active; message.reaction.count += message.reaction.active ? 1 : -1; }
  // 样板只替换发生变化的消息，不重建输入框或整条时间线。
  const node = timeline.querySelector(`[data-message="${message.id}"]`); if (node) node.replaceWith(messageGroup(message));
  say('已切换本页示例反应，未发送到服务器。');
}
function reply(message: SampleMessage): void { draft().quote = message; setPage('chat'); workspace.dataset.view = 'chat'; renderDraft(); input.focus(); }
function openActions(message: SampleMessage, trigger: HTMLElement): void {
  previousActionTrigger = trigger;
  actionDialog.replaceChildren(element('p', 'action-title', `${message.author} · 消息操作`));
  for (const [name, label, action] of [
    ['reply', '回复这条消息', () => reply(message)],
    ['heart', message.reaction?.active ? '移除我的反应' : '添加赞同反应', () => react(message)],
  ] as const) {
    const button = element('button'); button.type = 'button'; button.append(uiIcon(name), element('span', '', label)); button.addEventListener('click', () => { actionDialog.close(); action(); }); actionDialog.append(button);
  }
  const close = element('button', '', '取消'); close.type = 'button'; close.addEventListener('click', () => actionDialog.close()); actionDialog.append(close); actionDialog.showModal();
}
function attachment(name: string, caption: string): HTMLElement { const node = element('div', 'attachment'); const copy = element('div'); copy.append(element('strong', '', name), element('span', '', caption)); node.append(uiIcon('file'), copy); return node; }
function messageGroup(message: SampleMessage, specimen = false): HTMLElement {
  const group = element('article', `message-group${message.own ? ' own' : ''}`); group.dataset.message = String(message.id); group.setAttribute('aria-label', `${message.author}，${message.time}`);
  const body = element('div', 'message-body');
  const showAuthor = !message.own && (specimen || selected.kind === 'group');
  if (showAuthor) body.append(element('strong', 'message-author', message.author));
  const tools = element('div', 'message-tools'); tools.setAttribute('aria-label', '消息操作');
  tools.append(control('reply', '回复消息', () => reply(message), 'context-only'), control('heart', '切换赞同反应', () => react(message), 'context-only'));
  const more = control('more', '更多消息操作', () => openActions(message, more)); tools.append(more);
  if (message.quote) body.append(quote(message.quote.author, message.quote.text));
  body.append(element('p', 'message-text', message.text)); if (message.continuation) body.append(element('p', 'message-text continuation', message.continuation));
  if (message.attachment) body.append(attachment(message.attachment, specimen ? '附件组件 · 展示状态' : '示例文件 · 无实际下载内容'));
  if (message.reaction && message.reaction.count > 0) { const reactions = element('div', 'reactions'); const reaction = element('button', 'reaction'); reaction.type = 'button'; reaction.setAttribute('aria-pressed', String(message.reaction.active)); reaction.setAttribute('aria-label', `${message.reaction.label} ${message.reaction.count}`); reaction.append(uiIcon('check'), element('span', '', `${message.reaction.label} ${message.reaction.count}`)); reaction.addEventListener('click', () => { if (specimen) { reaction.setAttribute('aria-pressed', String(reaction.getAttribute('aria-pressed') !== 'true')); } else react(message); }); reactions.append(reaction); body.append(reactions); }
  const timestamp = element('time', 'message-meta', message.time);
  const lastContent = body.lastElementChild;
  if (lastContent?.matches('.message-text')) lastContent.append(timestamp); else body.append(timestamp);
  if (showAuthor) group.append(avatar(message.initials, message.tone));
  group.append(body, tools);
  group.addEventListener('contextmenu', event => { event.preventDefault(); openActions(message, more); });
  group.addEventListener('keydown', event => { if (event.key === 'F10' && event.shiftKey) { event.preventDefault(); openActions(message, more); } });
  return group;
}
function renderTimeline(): void { timeline.replaceChildren(element('div', 'day-label', '今天 · 示例对话')); for (const message of selected.messages) timeline.append(messageGroup(message)); }
function renderDraft(): void {
  const value = draft(); input.value = value.text; resizeInput();
  const preview = required('#quote-preview'); preview.replaceChildren(); preview.hidden = !value.quote;
  if (value.quote) preview.append(quote(`回复 ${value.quote.author}`, value.quote.text), control('close', '取消回复', () => { delete draft().quote; renderDraft(); input.focus(); }));
  const files = required('#file-preview'); files.replaceChildren(); files.hidden = !value.file;
  if (value.file) files.append(uiIcon('file'), element('span', '', `${value.file.name} · 只选择，不上传`), control('close', '移除所选附件', () => { delete draft().file; renderDraft(); }));
  send.disabled = !value.text.trim() && !value.file;
}
function resizeInput(): void { input.style.height = '40px'; input.style.height = `${Math.min(136, Math.max(40, input.scrollHeight))}px`; }
function selectRoom(room: SampleRoom): void { selected = room; setPage('chat'); workspace.dataset.view = 'chat'; renderRooms(); renderTimeline(); renderDraft(); }
function setPage(value: 'chat' | 'gallery'): void {
  page = value; required('#chat-page').hidden = page !== 'chat'; required('#gallery-page').hidden = page !== 'gallery';
  required('#page-title').textContent = page === 'chat' ? selected.name : '组件预览'; required('#page-subtitle').textContent = page === 'chat' ? selected.subtitle : '一套视觉语言，放进真实的状态里看。';
  const headerAvatar = required('#header-avatar'); headerAvatar.replaceChildren(avatar(selected.initials, selected.tone)); headerAvatar.hidden = page !== 'chat';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-page]')) { if (button.dataset.page === page) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); }
  required('#detail-toggle').hidden = page === 'gallery';
}
function section(title: string, description: string, ...nodes: HTMLElement[]): HTMLElement { const node = element('section', 'specimen'); node.append(element('h3', '', title), element('p', '', description), ...nodes); return node; }
function row(...nodes: HTMLElement[]): HTMLElement { const node = element('div', 'component-row'); node.append(...nodes); return node; }
function renderGallery(): void {
  const root = required('#gallery-page'); const inner = element('div', 'gallery-inner'); const intro = element('header', 'gallery-intro');
  intro.append(element('span', 'eyebrow', 'MIRTH / 视觉探索 03'), element('h2', '', '回到聊天本身。'), element('p', '', '以 Telegram Web K 的会话列表、消息气泡与浮动输入区为主参考。这里检查组件在聊天语境中的比例，不再提供两套未获认可的配色。仍是可丢弃样板，不是正式组件库。'));
  const swatches = element('div', 'swatches');
  for (const [token, label] of [['--surface', '主表面'], ['--sidebar', '次表面'], ['--fg', '主文字'], ['--accent', '强调色'], ['--accent-soft', '选中背景']]) { const swatch = element('div', 'swatch'); const color = element('span'); color.style.background = `var(${token})`; swatch.append(color, element('small', '', label)); swatches.append(swatch); }
  const disabled = textButton('暂不可用', () => {}); disabled.disabled = true;
  const status = element('p', 'secondary-text', '按钮尚未操作。');
  const buttons = row(textButton('主要操作', () => { status.textContent = '主要按钮已触发。本页状态已更新。'; }, 'primary'), textButton('次要操作', () => { status.textContent = '次要按钮已触发。本页状态已更新。'; }), textButton('低强调操作', () => { status.textContent = '低强调按钮已触发。本页状态已更新。'; }, 'quiet'), disabled);
  const sample = { ...rooms[0].messages[0], id: 1000, text: '头像、作者和正文拥有稳定的对齐关系。', continuation: '连续内容不重复创建一整套消息头。' };
  const note = element('div', 'notice'); note.append(uiIcon('info'), element('span', '', '一般提示不抢主内容的注意力。'));
  const error = element('div', 'notice error'); error.append(uiIcon('info'), element('span', '', '错误状态使用清晰文字和语义色，不只靠颜色区别。'));
  inner.append(intro, section('01 / 表面与颜色', '大部分界面保持中性，强调色只承担选择、操作与焦点。', swatches), section('02 / 按钮与操作', '主要、次要、低强调、禁用。悬停与键盘焦点可直接体验。', buttons, status), section('03 / 会话行', '主次文字、时间与未读各有固定位置；长内容截断不挤压计数。', roomRow(rooms[0], true), roomRow(rooms[1])), section('04 / 消息组与引用', '消息组默认没有常驻动作行；手机保留更多入口，键盘可进入操作。', messageGroup(sample, true), quote('引用内容', '这是引用层级，不再嵌套一张厚重的卡片。')), section('05 / 提示与弹层', '弹层有关闭入口与焦点管理；错误与普通提示可区分。', row(note, error, textButton('打开说明弹层', () => detail.showModal()))));
  root.append(inner);
}
function toggleTheme(): void { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; for (const button of document.querySelectorAll<HTMLButtonElement>('.theme-toggle')) { button.replaceChildren(uiIcon(dark ? 'sun' : 'moon')); button.setAttribute('aria-label', dark ? '切换浅色主题' : '切换深色主题'); } }
for (const button of document.querySelectorAll<HTMLButtonElement>('.theme-toggle')) { button.append(uiIcon('moon')); button.addEventListener('click', toggleTheme); }
required('#search-icon').append(uiIcon('search'));
required('.mobile-back').append(uiIcon('back'));
required('.mobile-back').addEventListener('click', () => { workspace.dataset.view = 'list'; });
required('.gallery-toggle').append(uiIcon('grid'));
required('.gallery-toggle').addEventListener('click', () => { setPage(page === 'gallery' ? 'chat' : 'gallery'); workspace.dataset.view = 'chat'; });
required('#detail-toggle').append(uiIcon('info')); required('#detail-toggle').addEventListener('click', () => detail.showModal());
required('.close-dialog').append(uiIcon('close')); required('.close-dialog').addEventListener('click', () => detail.close());
required('#attach-button').append(uiIcon('attach')); required('#attach-button').addEventListener('click', () => fileInput.click()); send.append(uiIcon('send'));
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-page]')) button.addEventListener('click', () => { setPage(button.dataset.page as 'chat' | 'gallery'); workspace.dataset.view = 'chat'; });
search.addEventListener('input', renderRooms);
input.addEventListener('input', () => { draft().text = input.value; resizeInput(); send.disabled = !input.value.trim() && !draft().file; });
input.addEventListener('compositionstart', () => { composing = true; }); input.addEventListener('compositionend', () => { composing = false; draft().text = input.value; });
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !composing) { event.preventDefault(); required<HTMLFormElement>('#composer').requestSubmit(); } });
required('#composer').addEventListener('submit', event => {
  event.preventDefault(); const value = draft(); if (composing || (!value.text.trim() && !value.file)) return;
  if (selected.messages.length >= 50) { say('视觉样板每个会话最多添加到 50 条消息，请刷新后重新体验。'); return; }
  const message: SampleMessage = { id: nextId++, author: '你', initials: 'R', own: true, time: '刚刚', text: value.text.trim(), quote: value.quote ? { author: value.quote.author, text: value.quote.text } : undefined, attachment: value.file?.name };
  selected.messages.push(message); timeline.append(messageGroup(message)); drafts.set(selected.id, { text: '' }); renderDraft(); timeline.scrollTop = timeline.scrollHeight; say('已添加本页样板消息，未发送到服务器。');
});
fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) { draft().file = file; renderDraft(); say('仅选择文件，未读取内容或上传。'); } fileInput.value = ''; });
actionDialog.addEventListener('close', () => { if (previousActionTrigger?.isConnected && document.activeElement === document.body) previousActionTrigger.focus(); });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !detail.open && !actionDialog.open) { event.preventDefault(); workspace.dataset.view = 'list'; search.focus(); } });
renderGallery(); renderRooms(); renderTimeline(); renderDraft(); setPage('chat');
