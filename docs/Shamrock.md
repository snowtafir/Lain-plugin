 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

### 温馨提示：
- 目前`Shamrock`搭建难度较高，不推荐小白现阶段进行迁移。
- 目前本插件也是只实现了简单的图文收发，更建议您当前迁移至`QQNT`~

### 使用方法：

- shamrock安装教程：[快速开始](https://whitechi73.github.io/OpenShamrock/guide/getting-started.html)
- 安装好`Shamrock`并登录QQ之后，请打开`shamrock`，按照以下教程进行配置。
- 启动`Shamrock`，打开`被动WebSocket`
- 填写`被动WebSocket地址`：`ws://localhost:2955/Shamrock`
- 彻底关闭`QQ`，注意需要彻底关闭
- 彻底关闭`Shamrock`，注意需要彻底关闭
- 启动`Shamrock`
- 启动`QQ`
- 启动喵崽即可


解释一下`ws://localhost:2955/Shamrock`这个地址
- `ws://`这部分是固定的，无需更改
- `localhost`这个是本地地址，如果你的喵崽在`云服务器`，请更换为云服务器的`公网IP地址`
- `:2956`这部分是端口，需要使用`:`和`IP地址`连接起来，如需更改，请自行修改配置文件`config.yaml`或使用锅巴修改
- `/Shamrock`这部分是固定的，无需更改

# 适配进度

没有注明的在下方的有需求并且我时间充裕的情况下会实现...

- [√] 接收`文本`、`表情`、`at`、`图片`消息，语音、视频、文件消息需测试。
- [√] 发送`文本`、`表情`、`at`、`图片`消息，语音、视频消息需测试。
- [√] 好友主动消息`Bot[BotQQ号].pickUser(user_id).sendMsg("主动消息")`
- [√] 群聊主动消息`Bot[BotQQ号].pickGroup(group_id).sendMsg("主动消息")`
- [ ] 合并转发`(上游未实现)`
- [√] 适配禁言
- [√] 适配戳一戳
- [√] 适配点赞 `上游接口无响应`
- [√] 适配群踢人
- [ ] 适配群申请
- [ ] 适配发送文件
