import './style.css';
import { initialRooms } from './data.ts';
import type { Attachment, Message, Room } from './data.ts';
import { createDemoState, filterRooms, sendLocalMessage } from './model.ts';
import type { RoomFilter, SpaceFilter } from './model.ts';
import { avatar, element, fileSize, icon, iconButton, required } from './dom.ts';
import type { IconName } from './dom.ts';

const state = createDemoState(structuredClone(initialRooms));
const app = required<HTMLDivElement>('#app');
const sidebar = required<HTMLElement>('.sidebar');
const conversation = required<HTMLElement>('.conversation');
const roomList = required<HTMLDivElement>('#room-list');
const timeline = required<HTMLElement>('#timeline');
const input = required<HTMLTextAreaElement>('#message-input');
const roomSearch = required<HTMLInputElement>('#room-search');
const messageSearch = required<HTMLInputElement>('#message-search');
const searchPanel = required<HTMLDivElement>('#message-search-panel');
const details = required<HTMLDialogElement>('#details-panel');
const settings = required<HTMLDialogElement>('#settings-dialog');
const fileInput = required<HTMLInputElement>('#file-input');
const narrow = matchMedia('(max-width: 720px)');
const wide = matchMedia('(min-width: 1200px)');
const objects = new Set<string>();
const scrollPositions = new Map<string, number>();
let selectedId = 'design';
let filter: RoomFilter = 'all';
let space: SpaceFilter = 'all';
let detailTab: 'members' | 'files' = 'members';
let lastDetailsTrigger: HTMLElement | null = null;
let preparedBytes = 0;
let composing = false;

let focusRoomSearch = false;
const currentRoom = (): Room => state.rooms.find((room) => room.id === selectedId)!;
const currentDraft = () => state.drafts.get(selectedId)!;
const announce = (text: string) => { required('#announcement').textContent = text; };

function showError(text: string): void {
  const error = required('#composer-error');
  error.textContent = text;
  error.hidden = !text;
}

function mountIcons(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-icon]')) {
    node.replaceChildren(icon(node.dataset.icon as IconName));
  }
}

function renderRooms(): void {
  const rooms = filterRooms(state.rooms, roomSearch.value, filter, space);
  const fragment = document.createDocumentFragment();
  for (const room of rooms) {
    const button = element('button', 'room-row');
    button.type = 'button';
    button.dataset.room = room.id;
    button.setAttribute('aria-current', String(room.id === selectedId));
    const copy = element('span', 'room-copy');
    const top = element('span', 'room-line');
    top.append(element('span', 'room-name', room.name), element('span', 'room-time', room.time));
    const bottom = element('span', 'room-line');
    const draft = state.drafts.get(room.id)!;
    const lastMessage = room.messages.at(-1);
    const preview = draft.text.trim() ? `草稿：${draft.text}` : lastMessage?.body || lastMessage?.attachments?.[0]?.name || '开始交流';
    bottom.append(element('span', `room-preview${draft.text.trim() ? ' has-draft' : ''}`, preview.replaceAll('\n', ' ')));
    if (room.unread) bottom.append(element('span', 'unread-badge', String(room.unread)));
    copy.append(top, bottom);
    button.append(avatar(room.initials, room.color), copy);
    button.addEventListener('click', () => { location.hash = `room/${room.id}`; });
    fragment.append(button);
  }
  if (!rooms.length) fragment.append(element('div', 'empty-state', '没有匹配的会话。试试其他关键词或筛选。'));
  roomList.replaceChildren(fragment);
  required('#room-count').textContent = String(rooms.length);
  required('#unread-count').textContent = String(state.rooms.filter((room) => room.unread > 0).length);
  required('#list-caption').textContent = space === 'mirth' ? 'Mirth 空间' : space === 'open' ? '开放交流' : space === 'personal' ? '个人会话' : '所有会话';
}

function renderHeader(): void {
  const room = currentRoom();
  required('#room-title').textContent = room.name;
  required('#room-subtitle').textContent = `${room.kind === 'direct' ? '示例私聊' : '示例房间'} · ${room.members.length} 位成员`;
  required('#header-avatar').replaceChildren(avatar(room.initials, room.color, 'header-avatar'));
  input.placeholder = `在「${room.name}」写一条消息…`;
  document.title = `${room.name} · Mirth 演示`;
}

function fileNode(file: Attachment): HTMLElement {
  const node = element('div', 'message-file');
  node.append(icon('file'));
  const info = element('span', 'file-info');
  info.append(element('strong', '', file.name), element('span', 'muted', `${fileSize(file.size)} · ${file.url ? '本地文件' : '示例文件，无实际内容'}`));
  node.append(info);
  if (file.url) {
    const link = element('a', 'file-download', '保存');
    link.href = file.url;
    link.download = file.name;
    link.setAttribute('aria-label', `保存本地文件 ${file.name}`);
    node.append(link);
  }
  return node;
}

function replyTo(message: Message): void {
  currentDraft().reply = { id: message.id, author: message.author, body: message.body || message.attachments?.[0]?.name || '附件' };
  renderDraft();
  input.focus();
}

function toggleReaction(message: Message, label = '喜欢'): void {
  message.reactions ??= [];
  let reaction = message.reactions.find((item) => item.label === label);
  if (!reaction) {
    reaction = { label, count: 0, selected: false };
    message.reactions.push(reaction);
  }
  reaction.count += reaction.selected ? -1 : 1;
  reaction.selected = !reaction.selected;
  const scroll = timeline.scrollTop;
  renderTimeline(false);
  timeline.scrollTop = scroll;
  const trigger = timeline.querySelector<HTMLButtonElement>(`[data-message="${message.id}"] [data-reaction="${label}"]`);
  trigger?.focus({ preventScroll: true });
}

function messageNode(message: Message): HTMLElement {
  const row = element('article', `message-row${message.own ? ' own' : ''}`);
  row.dataset.message = message.id;
  row.setAttribute('aria-label', `${message.author}，${message.time}`);
  const content = element('div', 'message-content');
  const meta = element('div', 'message-meta');
  meta.append(element('strong', '', message.author), element('time', '', message.time));
  const bubble = element('div', 'message-bubble');
  if (message.reply) {
    const quote = element('blockquote', 'reply-quote');
    quote.append(element('strong', '', message.reply.author), element('span', '', message.reply.body));
    bubble.append(quote);
  }
  if (message.body) bubble.append(element('p', '', message.body));
  for (const file of message.attachments ?? []) {
    if (file.url && /^(image\/(png|jpeg|webp|gif|avif))$/.test(file.type)) {
      const image = element('img', 'image-preview');
      image.src = file.url;
      image.alt = file.name;
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        image.replaceWith(element('p', 'muted', '无法预览此图片，仍可保存本地文件。'));
      }, { once: true });
      bubble.append(image);
    }
    bubble.append(fileNode(file));
  }
  content.append(meta, bubble);
  const actions = element('div', 'message-actions');
  const reply = iconButton('reply', `回复 ${message.author} 的消息`, () => replyTo(message));
  reply.dataset.reply = message.id;
  actions.append(reply);
  const reactionLabels = new Set(['喜欢', ...(message.reactions ?? []).map((reaction) => reaction.label)]);
  for (const label of reactionLabels) {
    const reaction = message.reactions?.find((item) => item.label === label);
    const button = element('button', `reaction${reaction?.selected ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.reaction = label;
    button.setAttribute('aria-label', `${label} ${message.author} 的消息`);
    button.setAttribute('aria-pressed', String(reaction?.selected ?? false));
    button.append(icon(label === '赞同' ? 'check' : 'heart'), element('span', '', `${label}${reaction?.count ? ` ${reaction.count}` : ''}`));
    button.addEventListener('click', () => toggleReaction(message, label));
    actions.append(button);
  }
  if (message.status === 'local') actions.append(element('span', 'message-status', '仅本地'));
  content.append(actions);
  row.append(avatar(message.initials, message.color, 'message-avatar'), content);
  return row;
}

function renderTimeline(toBottom = true): void {
  const room = currentRoom();
  const query = searchPanel.hidden ? '' : messageSearch.value.trim().toLocaleLowerCase();
  const messages = query ? room.messages.filter((message) => `${message.author} ${message.body} ${(message.attachments ?? []).map((file) => file.name).join(' ')}`.toLocaleLowerCase().includes(query)) : room.messages;
  const fragment = document.createDocumentFragment();
  if (!query) {
    const intro = element('div', 'timeline-intro');
    intro.append(element('span', 'pill', room.kind === 'direct' ? '一段对话，从这里开始' : '留一点空间，给有趣的想法'));
    fragment.append(intro, element('div', 'day-divider', '今天 · 示例对话'));
  }
  for (const message of messages) fragment.append(messageNode(message));
  if (!messages.length) fragment.append(element('div', 'empty-state', query ? '当前示例会话没有匹配的消息。' : '这里还没有消息，写下第一句吧。'));
  timeline.replaceChildren(fragment);
  required('#search-count').textContent = query ? `${messages.length} 条本地结果` : '仅搜索当前示例消息';
  if (toBottom && !query) timeline.scrollTop = timeline.scrollHeight;
}

function renderDraft(): void {
  const draft = currentDraft();
  input.value = draft.text;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  const replyPreview = required('#reply-preview');
  replyPreview.replaceChildren();
  replyPreview.hidden = !draft.reply;
  if (draft.reply) {
    const quote = element('div', 'reply-preview-copy');
    quote.append(element('strong', '', `回复 ${draft.reply.author}`), element('span', '', draft.reply.body));
    replyPreview.append(icon('reply'), quote, iconButton('close', '取消回复', () => {
      draft.reply = undefined;
      renderDraft();
      input.focus();
    }));
  }
  const attachments = required('#attachment-preview');
  attachments.replaceChildren();
  attachments.hidden = !draft.attachments.length;
  for (const file of draft.attachments) {
    const item = element('div', 'attachment-chip');
    item.append(icon('file'), element('span', '', file.name), iconButton('close', `移除附件 ${file.name}`, () => {
      draft.attachments = draft.attachments.filter((attachment) => attachment.id !== file.id);
      if (file.url) { URL.revokeObjectURL(file.url); objects.delete(file.url); preparedBytes -= file.size; }
      renderDraft();
    }));
    attachments.append(item);
  }
  required<HTMLButtonElement>('#send-button').disabled = !draft.text.trim() && !draft.attachments.length;
}

function renderDetails(): void {
  const room = currentRoom();
  const hero = required('#detail-hero');
  hero.replaceChildren(avatar(room.initials, room.color, 'detail-avatar'), element('h3', '', room.name), element('span', 'pill', room.kind === 'direct' ? '示例私聊' : 'Mirth · 示例房间'), element('p', 'detail-description', room.description));
  required('#detail-stats').replaceChildren(element('span', '', `${room.members.length} 位示例成员`), element('span', '', `${room.messages.length} 条消息`));
  const content = required('#detail-content');
  content.replaceChildren();
  if (detailTab === 'members') {
    for (const member of room.members) {
      const row = element('div', 'member-row');
      const info = element('div', 'member-info');
      info.append(element('strong', '', member.name), element('span', 'muted', member.role));
      row.append(avatar(member.initials, member.color), info);
      content.append(row);
    }
  } else {
    const files = room.messages.flatMap((message) => message.attachments ?? []);
    if (!files.length) content.append(element('p', 'empty-state', '当前会话还没有文件。'));
    for (const file of files) content.append(fileNode(file));
  }
}

function applyLayout(): void {
  const isChat = app.dataset.view === 'chat';
  sidebar.inert = narrow.matches && isChat;
  conversation.inert = narrow.matches && !isChat;
}

function closeDetails(): void {
  if (!details.open) return;
  details.close();
}

function openDetails(): void {
  lastDetailsTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  renderDetails();
  app.classList.add('details-open');
  if (wide.matches) details.show();
  else details.showModal();
}

function selectSpace(value: SpaceFilter): void {
  space = value;
  required<HTMLSelectElement>('#mobile-space').value = value;
  for (const button of document.querySelectorAll<HTMLButtonElement>('.space-button')) {
    const active = button.dataset.space === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  renderRooms();
}

function applyRoute(): void {
  const match = /^#room\/([a-z-]+)$/.exec(location.hash);
  const target = match?.[1];
  if (target && !state.drafts.has(target)) {
    announce('这个示例会话不存在，已返回会话列表。');
    history.replaceState(null, '', '#rooms');
  }
  const next = target && state.drafts.has(target) ? target : selectedId;
  if (next !== selectedId) {
    scrollPositions.set(selectedId, timeline.scrollTop);
    selectedId = next;
    messageSearch.value = '';
    showError('');
  }
  app.dataset.view = target && state.drafts.has(target) ? 'chat' : 'list';
  if (app.dataset.view === 'list') closeDetails();
  renderHeader();
  renderRooms();
  renderTimeline(false);
  renderDraft();
  if (details.open) renderDetails();
  applyLayout();
  if (focusRoomSearch && !sidebar.inert) {
    roomSearch.focus();
    focusRoomSearch = false;
  }
  timeline.scrollTop = scrollPositions.get(selectedId) ?? timeline.scrollHeight;
  if (narrow.matches && app.dataset.view === 'chat') timeline.focus({ preventScroll: true });
}

function toggleSearch(): void {
  searchPanel.hidden = !searchPanel.hidden;
  renderTimeline(false);
  if (!searchPanel.hidden) messageSearch.focus();
  else required<HTMLButtonElement>('#search-toggle').focus();
}

function submitMessage(): void {
  if (composing) return;
  const result = sendLocalMessage(state, selectedId);
  if (!result.ok) {
    showError(result.reason === 'capacity' ? '当前会话已达到 100 条本地新增消息上限。刷新页面可重新开始，现有草稿不会被自动清空。' : '请先输入正文或选择附件。');
    return;
  }
  showError('');
  messageSearch.value = '';
  renderTimeline();
  renderDraft();
  renderRooms();
  if (details.open) renderDetails();
  announce(`已在 ${currentRoom().name} 添加本地消息，未发送到服务器。`);
  input.focus();
}

function addAttachments(files: FileList | null): void {
  if (!files) return;
  const draft = currentDraft();
  const errors: string[] = [];
  for (const file of files) {
    if (draft.attachments.length >= 4) { errors.push('每条消息最多选择 4 个附件。'); break; }
    if (file.size > 5 * 1024 * 1024) { errors.push(`${file.name} 超过演示的 5 MB 单文件限制。`); continue; }
    if (preparedBytes + file.size > 40 * 1024 * 1024) { errors.push('本页附件已达到 40 MB 上限，请刷新后重新开始。'); break; }
    const url = URL.createObjectURL(file);
    objects.add(url);
    preparedBytes += file.size;
    draft.attachments.push({ id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, url });
  }
  showError(errors.join(' '));
  renderDraft();
  fileInput.value = '';
}

function setPreference(key: 'theme' | 'density', value: string): void {
  document.body.dataset[key] = value;
  for (const radio of document.querySelectorAll<HTMLInputElement>(`input[name="${key}"]`)) radio.checked = radio.value === value;
  try { localStorage.setItem(`mirth-demo-${key}`, value); }
  catch { announce('浏览器不允许保存外观设置，本次页面内仍然有效。'); }
}

function openSettings(): void { settings.showModal(); }

mountIcons();
for (const [name, label, value] of [
  ['chat', '所有会话', 'all'], ['grid', 'Mirth 空间', 'mirth'], ['leaf', '开放交流', 'open'],
] as const) {
  const button = iconButton(name, label, () => {
    selectSpace(value);
  }, `space-button${value === 'all' ? ' active' : ''}`);
  button.setAttribute('aria-pressed', String(value === 'all'));
  button.dataset.space = value;
  required('#space-list').append(button);
}
required('#rail-bottom').append(iconButton('settings', '外观与演示说明', openSettings), avatar('R', 'sage', 'account-avatar'));
required('#sidebar-actions').append(iconButton('settings', '打开外观设置', openSettings));
required('#back-action').append(iconButton('back', '返回会话列表', () => {
  closeDetails();
  location.hash = 'rooms';
}, 'mobile-back'));
const searchToggle = iconButton('search', '搜索当前会话', toggleSearch);
searchToggle.id = 'search-toggle';
required('#header-actions').append(searchToggle, iconButton('info', '打开会话详情', () => {
  if (details.open) closeDetails(); else openDetails();
}));
required('#search-close').append(iconButton('close', '关闭消息搜索', toggleSearch));
required('#details-close').append(iconButton('close', '关闭会话详情', closeDetails));
required('#settings-close').append(iconButton('close', '关闭外观设置', () => settings.close()));
required('#attachment-action').append(iconButton('attach', '选择本地附件', () => fileInput.click()));

roomSearch.addEventListener('input', renderRooms);
required<HTMLSelectElement>('#mobile-space').addEventListener('change', (event) => {
  selectSpace((event.currentTarget as HTMLSelectElement).value as SpaceFilter);
});
messageSearch.addEventListener('input', () => renderTimeline(false));
for (const tab of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
  tab.addEventListener('click', () => {
    filter = tab.dataset.filter as RoomFilter;
    for (const item of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
      item.classList.toggle('active', item === tab);
      item.setAttribute('aria-pressed', String(item === tab));
    }
    renderRooms();
  });
}
for (const tab of document.querySelectorAll<HTMLButtonElement>('[data-detail]')) {
  tab.addEventListener('click', () => {
    detailTab = tab.dataset.detail as typeof detailTab;
    for (const item of document.querySelectorAll<HTMLButtonElement>('[data-detail]')) {
      item.classList.toggle('active', item === tab);
      item.setAttribute('aria-pressed', String(item === tab));
    }
    renderDetails();
  });
}
input.addEventListener('input', () => {
  currentDraft().text = input.value;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  required<HTMLButtonElement>('#send-button').disabled = !input.value.trim() && !currentDraft().attachments.length;
});
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; currentDraft().text = input.value; });
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !composing && event.keyCode !== 229) {
    event.preventDefault();
    submitMessage();
  }
});
required<HTMLFormElement>('#composer').addEventListener('submit', (event) => { event.preventDefault(); submitMessage(); });
fileInput.addEventListener('change', () => addAttachments(fileInput.files));
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="theme"], input[name="density"]')) {
  radio.addEventListener('change', () => setPreference(radio.name as 'theme' | 'density', radio.value));
}
for (const [key, allowed] of [['theme', ['light', 'dark']], ['density', ['compact', 'comfortable']]] as const) {
  try {
    const saved = localStorage.getItem(`mirth-demo-${key}`);
    if (saved && (allowed as readonly string[]).includes(saved)) setPreference(key, saved);
  } catch { /* 外观存储受限时保留页面默认值，不影响本地编辑。 */ }
}
details.addEventListener('close', () => {
  if (details.open) return;
  app.classList.remove('details-open');
  if (lastDetailsTrigger?.isConnected) lastDetailsTrigger.focus({ preventScroll: true });
});
wide.addEventListener('change', () => {
  if (!details.open) return;
  details.close();
  openDetails();
});
narrow.addEventListener('change', applyLayout);
window.addEventListener('hashchange', applyRoute);
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    if (settings.open || (details.open && !wide.matches)) return;
    event.preventDefault();
    if (narrow.matches && app.dataset.view === 'chat') {
      focusRoomSearch = true;
      location.hash = 'rooms';
    } else {
      roomSearch.focus();
    }
  }
  if (event.key === 'Escape' && !settings.open) {
    if (details.open) closeDetails();
    else if (!searchPanel.hidden) toggleSearch();
  }
});
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  for (const url of objects) URL.revokeObjectURL(url);
  objects.clear();
});
applyRoute();
