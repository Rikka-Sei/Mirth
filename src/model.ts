import type { Attachment, Message, Quote, Room } from './data.ts';

export interface Draft { text: string; reply?: Quote; attachments: Attachment[] }
export interface DemoState { rooms: Room[]; drafts: Map<string, Draft>; localCounts: Map<string, number> }
export type RoomFilter = 'all' | 'direct' | 'unread';
export type SpaceFilter = 'all' | Room['space'];

export function createDemoState(rooms: Room[]): DemoState {
  return {
    rooms,
    drafts: new Map(rooms.map((room) => [room.id, { text: '', attachments: [] }])),
    localCounts: new Map(),
  };
}

export function filterRooms(rooms: Room[], query: string, filter: RoomFilter, space: SpaceFilter): Room[] {
  const term = query.trim().toLocaleLowerCase();
  return rooms.filter((room) =>
    (space === 'all' || room.space === space)
    && (filter !== 'direct' || room.kind === 'direct')
    && (filter !== 'unread' || room.unread > 0)
    && (!term || `${room.name} ${room.description} ${room.messages.at(-1)?.body ?? ''}`.toLocaleLowerCase().includes(term)),
  );
}

export function sendLocalMessage(state: DemoState, roomId: string):
  { ok: true; message: Message } | { ok: false; reason: 'empty' | 'capacity' | 'unknown' } {
  const room = state.rooms.find((item) => item.id === roomId);
  const draft = state.drafts.get(roomId);
  if (!room || !draft) return { ok: false, reason: 'unknown' };
  const body = draft.text.trim();
  if (!body && !draft.attachments.length) return { ok: false, reason: 'empty' };
  const count = state.localCounts.get(roomId) ?? 0;
  if (count >= 100) return { ok: false, reason: 'capacity' };
  const message: Message = {
    id: `local-${roomId}-${count + 1}`,
    author: '你', initials: 'R', color: 'sage', own: true,
    body, time: new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
    reply: draft.reply ? { ...draft.reply } : undefined,
    attachments: draft.attachments.slice(), status: 'local',
  };
  room.messages.push(message);
  room.time = message.time;
  state.localCounts.set(roomId, count + 1);
  draft.text = '';
  draft.reply = undefined;
  draft.attachments = [];
  return { ok: true, message };
}
