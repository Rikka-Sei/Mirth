# Telegram Web K 视觉参考与样板验证

## 状态与范围

前两版视觉未获用户认可，本版改以 Telegram Web K 为主要参考。`explore/` 是独立、可丢弃的视觉样板，不是正式组件库；不替换主应用，不改变六域核心规格的 Draft 状态。视觉方向仍待用户确认。

本地入口：<http://127.0.0.1:5173/explore/>。使用原生 DOM、TypeScript 和 CSS，没有增加依赖。样例会话、草稿和消息只在本页内存中存在，没有 Matrix 登录、同步或远端发送。

## 可核验参考

源码基线：[`morethanwords/tweb` 的 `2e4bbb52b6aec5e95ee32e5c2882c1f05de32200`](https://github.com/morethanwords/tweb/tree/2e4bbb52b6aec5e95ee32e5c2882c1f05de32200)。本轮打开了 [Web K 官方站点](https://web.telegram.org/k/)，只能访问登录页；没有登录账户，不宣称真实聊天页或登录后交互实测。

|依据|观察|
|---|---|
|[`updateColumnWidths.ts`](https://github.com/morethanwords/tweb/blob/2e4bbb52b6aec5e95ee32e5c2882c1f05de32200/src/helpers/updateColumnWidths.ts)|默认侧栏 360px、范围 320–480px；聊天宽度上限 696px，顶栏与输入板消费相同宽度变量|
|[`_chatTopbar.scss` L43–70](https://github.com/morethanwords/tweb/blob/2e4bbb52b6aec5e95ee32e5c2882c1f05de32200/src/scss/partials/_chatTopbar.scss#L43-L70)|顶栏是居中的圆角浮动板，不是贯穿聊天区的横向白条|
|[`input.ts` L1897](https://github.com/morethanwords/tweb/blob/2e4bbb52b6aec5e95ee32e5c2882c1f05de32200/src/components/chat/input.ts#L1897)|发送按钮容器位于输入行内部；不能拿旧版板外发送按钮当当前版本依据|
|[`_chatBubble.scss`](https://github.com/morethanwords/tweb/blob/2e4bbb52b6aec5e95ee32e5c2882c1f05de32200/src/scss/partials/_chatBubble.scss)|收发两侧气泡；作者、时间、引用、反应归属消息；时间靠近正文末尾而非消息头|
|[维护者消息设计原图](https://raw.githubusercontent.com/morethanwords/tweb-design/main/WebDesign_v0.2/Chat/2x_Messages_1.png)|实际打开原图核对气泡与元信息关系。属于早期设计，不作为当前顶栏和输入板的尺寸证据|
|[官方 Web 版本介绍](https://telegram.org/blog/payments-2-0-scheduled-voice-chats)|2021 年发布资料；本轮打开其公开演示视频，不把旧影像说成当前登录态实测|

## 本版取舍

- 撤下暖白墨黑、冷白深蓝配色切换与平铺消息骨架，不在旧结构上继续换色。
- 桌面以独立侧栏表面、浮动顶栏、两侧消息气泡及浮动输入板建立聊天层次。顶栏和输入板共用 696px 上限；输入板 48px 起，圆形发送按钮 40px，位于板内。
- 会话列表采用圆头像、标题与时间同排、预览与未读同排。群聊作者和头像归属消息；私聊不逐条重复头像和作者名。
- 使用自行编写的蓝灰渐变背景与低饱和头像色，不复制 Telegram 涂鸦、图标、源码或品牌资产；不是像素级复刻。
- 没有照搬 Web K 的拖拽栏宽、折叠栏、主题引擎或详情面板。样板没有实现完整的连续事件分组；正文的 `continuation` 仍是同一条样例消息的内容。
- 不从该样板推导正式组件 API；正式契约须在视觉认可后明确。

## 实际验证

类型检查退出码 0：

```sh
pnpm exec tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --strict --noUncheckedIndexedAccess --allowImportingTsExtensions --skipLibCheck explore/main.ts
```

浏览器实际观察：

- 1440×900 桌面浅色：顶栏宽 696px、高 48px；输入板宽 696px；发送按钮确实在表单内部。
- 390×844 手机：浅色聊天、深色聊天、深色组件预览及浅色会话列表均已截图查看。
- 320×700、768×1024、1024×768、1920×1080、844×390：未见页面横向溢出，输入区位于视口内。
- 手机通过更多菜单回复并添加样板消息，引用清除；`<b>文字</b>` 保留为文本，时间线没有生成 `b` 元素。
- 私聊时间线逐条头像与作者名数量均为 0；搜索“工程”只显示工程讨论；跨会话草稿未混入。
- 组件页可通过真实按钮进入；旧配色切换控件数量为 0；浏览器错误列表为空。

以上是样板验证，不是审美认可、完整可访问性审计或 Matrix 产品验收。主应用的构建并未被拿来充当 `explore/` 的类型检查。
