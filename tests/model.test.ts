import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoState, filterRooms, sendLocalMessage } from '../src/model.ts';
import type { Room } from '../src/data.ts';

const rooms: Room[] = [
  { id: 'design', name: '设计讨论', initials: '设', color: 'sage', kind: 'room', space: 'mirth', description: '讨论界面', members: [], unread: 3, time: '10:24', messages: [] },
  { id: 'lin', name: 'Lin', initials: 'L', color: 'clay', kind: 'direct', space: 'personal', description: '私聊', members: [], unread: 0, time: '09:00', messages: [] },
];

test('切换房间后发送不能携带另一房间的草稿、引用或附件', () => {
  const state = createDemoState(structuredClone(rooms));
  state.drafts.get('design')!.text = '保留设计稿';
  state.drafts.get('design')!.reply = { id: 'r1', author: 'Lin', body: '原始讨论' };
  state.drafts.get('design')!.attachments.push({ id: 'f1', name: '设计稿.txt', size: 10, type: 'text/plain' });
  state.drafts.get('lin')!.text = '只给 Lin';
  const result = sendLocalMessage(state, 'lin');
  assert.equal(result.ok, true);
  assert.equal(state.rooms[1]!.messages[0]!.body, '只给 Lin');
  assert.equal(state.rooms[1]!.messages[0]!.reply, undefined);
  assert.deepEqual(state.rooms[1]!.messages[0]!.attachments, []);
  assert.equal(state.drafts.get('design')!.text, '保留设计稿');
  assert.equal(state.drafts.get('design')!.reply?.body, '原始讨论');
  assert.equal(state.drafts.get('design')!.attachments[0]!.name, '设计稿.txt');
  assert.equal(state.drafts.get('lin')!.text, '');
});

test('空白消息不得清除回复；纯附件消息保留文件归属并明确仅本地', () => {
  const state = createDemoState(structuredClone(rooms));
  const draft = state.drafts.get('design')!;
  draft.text = '   \n';
  draft.reply = { id: 'r1', author: 'Lin', body: '保留引用' };
  assert.equal(sendLocalMessage(state, 'design').ok, false);
  assert.equal(draft.reply?.body, '保留引用');
  draft.attachments.push({ id: 'f1', name: '<img onerror=alert(1)>.txt', size: 20, type: 'text/plain' });
  const result = sendLocalMessage(state, 'design');
  assert.equal(result.ok, true);
  assert.equal(state.rooms[0]!.messages[0]!.attachments?.[0]!.name, '<img onerror=alert(1)>.txt');
  assert.equal(state.rooms[0]!.messages[0]!.status, 'local');
  assert.equal(draft.attachments.length, 0);
  assert.equal(draft.reply, undefined);
});

test('查询忽略首尾空白和大小写，筛选条件不能相互覆盖', () => {
  const state = createDemoState(structuredClone(rooms));
  assert.deepEqual(filterRooms(state.rooms, '  LIN ', 'all', 'all').map((r) => r.id), ['lin']);
  assert.deepEqual(filterRooms(state.rooms, '', 'unread', 'all').map((r) => r.id), ['design']);
  assert.deepEqual(filterRooms(state.rooms, '', 'direct', 'mirth'), []);
});
