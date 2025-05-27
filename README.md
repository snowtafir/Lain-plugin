## 此插件已被修改为适配本仓库云崽，原仓库已跑路删库了
## 原仓库已删库跑路，我也只维护QQbot适配器

## 简介
- 插件更新日志：[点击查看](./CHANGELOG.md)
- 本项目使用 [GPL-3.0](./LICENSE) 开源协议，欢迎任何形式的贡献！

`Lain-plugin`是一个围绕云崽`Yunzai-Bot`开发的多适配器插件，让喵崽接入`QQ频道`、`微信`、`shamrock`等三方平台~，不再局限于ICQQ。

我正在为 [kritor](https://github.com/KarinJS/kritor) 开发新的机器人框架，如果您有时间且热爱开源并且想参与其中，您可以联系我~

新框架：[Karin](https://github.com/KarinJS/carrying)

### 这里特别声明：

不想登录ICQQ并继续使用本插件：

<details><summary>喵崽请看</summary><blockquote>

  - 更新喵崽到最新

  - 打开喵崽的`config/config/bot.yaml`文件将 `skip_login: false` 修改为 `skip_login: true`

  - 如果不存在这个，自行加一行  `skip_login: true` 即可。

</blockquote></details>

<details><summary>本仓库云崽请看</summary><blockquote>

  - 更新云崽到最新

  - 打开云崽的`config/config/bot.yaml`文件将 `login_type: 1` 修改为 `login_type: 2`

  - 如果不存在这个，自行加一行  `login_type: 2` 即可。

</blockquote></details>

## 1.安装插件

在`Yunzai-Bot`根目录执行

```
git clone --depth=1 https://gitee.com/sky-summer/Lain-plugin ./plugins/Lain-plugin
```

## 2.安装依赖

```
pnpm install -P
```

`安装失败再用这个：`
```
pnpm config set sharp_binary_host "https://npmmirror.com/mirrors/sharp" && pnpm config set sharp_libvips_binary_host "https://npmmirror.com/mirrors/sharp-libvips" && pnpm install -P
```

## 3.使用适配器

请点击查看对应教程~

- [标准输入](./docs/stdin.md)
- [QQ频道(旧版)](./docs/QQGuild.md)
- [PC微信](./docs/WeChat.md)
- [Shamrock](./docs/Shamrock.md)
- [QQBot(群和频道)](./docs/QQBot.md)
- [网页版微信](./docs/WeXin.md)
- [Lagrange.Core](./docs/Lagrange.Core.md)

## 4.设置主人

- 使用方法
  - 方法1：发送`#设置主人`，随后复制发送控制台的验证码即可成为主人
  - 方法2：发送`#设置主人@用户`，需要你是主人的情况下，指定此用户成为主人

主人可通过`#取消主人@用户`或者`#删除主人@用户`

## 插件更新

- #铃音更新
- #Lain更新

## 如何区分适配器

- `e.adapter` || `Bot[uin].adapter`
- 标准输入：`stdin`
- QQ频道：`QQGuild`
- Shamrock：`shamrock`
- PC微信：`ComWeChat`
- QQBot：`QQBot`
- 网页版微信：`WeXin`
- LagrangeCore: `LagrangeCore`

## 适配进度
- [√] 标准输入
- [√] 跳过登录QQ
- [√] QQ频道适配器
- [√] PC微信适配器
- [√] 网页版微信适配器
- [√] Shamrock适配器
- [√] QQBot适配器
- [√] LagrangeCore

## 特别鸣谢

以下排名不分先后

- [Miao-Yunzai](https://github.com/yoimiya-kokomi/Miao-Yunzai)
- [索引库](https://github.com/yhArcadia/Yunzai-Bot-plugins-index)
- [OpenShamrock](https://github.com/whitechi73/OpenShamrock)
- [ComWeChat](https://github.com/JustUndertaker/ComWeChatBotClient)
- [wechat4u](https://github.com/nodeWechat/wechat4u/blob/master/run-core.js)
- [qq-official-bot](https://github.com/lc-cn/qq-official-bot)
- [QQBot按钮库](https://gitee.com/lava081/button)
- [xiaoye12123](https://gitee.com/xiaoye12123)
- [Lagrange.Core](https://github.com/LagrangeDev/Lagrange.Core)
