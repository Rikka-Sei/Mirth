export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface Quote { id: string; author: string; body: string }
export interface Message {
  id: string;
  author: string;
  initials: string;
  color: string;
  body: string;
  time: string;
  own?: boolean;
  reply?: Quote;
  attachments?: Attachment[];
  reactions?: { label: string; count: number; selected?: boolean }[];
  status?: 'local';
}
export interface Member { name: string; initials: string; color: string; role: string }
export interface Room {
  id: string;
  name: string;
  initials: string;
  color: string;
  kind: 'room' | 'direct';
  space: 'mirth' | 'open' | 'personal';
  description: string;
  members: Member[];
  unread: number;
  time: string;
  messages: Message[];
}

const members: Member[] = [
  { name: 'Lin', initials: 'L', color: 'clay', role: '设计' },
  { name: '陈默', initials: '陈', color: 'blue', role: '开发' },
  { name: '你', initials: 'R', color: 'sage', role: '自己' },
  { name: 'Mia', initials: 'M', color: 'lavender', role: '成员' },
];

export const initialRooms: Room[] = [
  {
    id: 'design', name: '设计讨论', initials: '设', color: 'sage', kind: 'room', space: 'mirth',
    description: '聊聊 Mirth 的界面、交互，以及那些值得认真打磨的小细节。少一点干扰，多一点交流。',
    members, unread: 3, time: '10:42',
    messages: [
      { id: 'd1', author: 'Lin', initials: 'L', color: 'clay', time: '10:24', body: '早上好！把昨天讨论的方向整理了一下。\n我希望打开 Mirth 的第一感觉是：终于可以安静地聊聊天了。' },
      { id: 'd2', author: '陈默', initials: '陈', color: 'blue', time: '10:28', body: '同意。让会话成为主角，其他功能需要的时候再出现。\n尤其是手机上，别把桌面的三栏硬塞进去。', reactions: [{ label: '赞同', count: 3 }] },
      { id: 'd3', author: '你', initials: 'R', color: 'sage', time: '10:31', own: true, body: '小巧，但不牺牲功能。\n先把阅读、切换会话、回复这几件事做顺手。', status: 'local' },
      { id: 'd4', author: 'Lin', initials: 'L', color: 'clay', time: '10:35', body: '还有一个细节：在一个房间写到一半，切去别的房间看消息，回来时草稿应该还在。', reply: { id: 'd3', author: '你', body: '小巧，但不牺牲功能。' } },
      { id: 'd5', author: 'Mia', initials: 'M', color: 'lavender', time: '10:39', body: '我整理了交互笔记，主要是导航和消息状态。', attachments: [{ id: 'notes', name: '交互笔记.md', size: 2840, type: 'text/markdown' }] },
      { id: 'd6', author: 'Lin', initials: 'L', color: 'clay', time: '10:42', body: '这个方向不错。先试试右上角的房间详情，再切换到手机尺寸看看？', reactions: [{ label: '喜欢', count: 2 }] },
    ],
  },
  { id: 'lin', name: 'Lin', initials: 'L', color: 'clay', kind: 'direct', space: 'personal', description: '这是 Lin 的示例私聊；消息不会发送到任何服务器。', members: [members[0]!, members[2]!], unread: 1, time: '10:38', messages: [{ id: 'l1', author: 'Lin', initials: 'L', color: 'clay', time: '10:38', body: '周末去走走？最近发现一条很安静的山间步道。' }] },
  { id: 'development', name: '开发小组', initials: '开', color: 'blue', kind: 'room', space: 'mirth', description: '关于协议、性能和实现的小组。这里显示的是示例资料，不是实时同步状态。', members, unread: 2, time: '10:16', messages: [{ id: 'v1', author: '陈默', initials: '陈', color: 'blue', time: '10:16', body: '先从原生 DOM 和 TypeScript 开始。Matrix 协议交给 matrix-js-sdk；没有用到的模块不急着装。' }] },
  { id: 'garden', name: '数字花园', initials: '花', color: 'olive', kind: 'room', space: 'open', description: '交换发现、文章与灵感的地方。', members, unread: 0, time: '09:56', messages: [{ id: 'g1', author: 'Mia', initials: 'M', color: 'lavender', time: '09:56', body: '好的工具应该让人忘记工具本身，把注意力留给正在做的事情。' }] },
  { id: 'chen', name: '陈默', initials: '陈', color: 'blue', kind: 'direct', space: 'personal', description: '陈默的示例私聊。', members: [members[1]!, members[2]!], unread: 0, time: '09:41', messages: [{ id: 'c1', author: '陈默', initials: '陈', color: 'blue', time: '09:41', body: '收到，我们把状态所有权和组件生命周期一起写清楚。' }] },
  { id: 'matrix', name: 'Matrix 交流', initials: 'M', color: 'lavender', kind: 'room', space: 'open', description: '关于开放通信协议的示例讨论空间。', members, unread: 0, time: '昨天', messages: [{ id: 'm1', author: 'Mia', initials: 'M', color: 'lavender', time: '18:20', body: 'Space 不是文件夹，线程也不只是引用回复。UI 简单，背后的语义还是要分清。' }] },
  { id: 'mia', name: 'Mia', initials: 'M', color: 'lavender', kind: 'direct', space: 'personal', description: 'Mia 的示例私聊。', members: [members[3]!, members[2]!], unread: 0, time: '昨天', messages: [{ id: 'p1', author: 'Mia', initials: 'M', color: 'lavender', time: '17:05', body: '新的主题看起来很舒服，暗色模式也试试吧。' }] },
  { id: 'coffee', name: '茶水间', initials: '茶', color: 'sand', kind: 'room', space: 'mirth', description: '不着急，喝杯茶再聊。', members, unread: 0, time: '周一', messages: [{ id: 't1', author: 'Lin', initials: 'L', color: 'clay', time: '15:30', body: '今天的咖啡很好喝。你们那边天气怎么样？' }] },
];
