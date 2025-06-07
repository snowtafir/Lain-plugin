## 原仓库已删库跑路。
## 目前QQbot相关适配器维护代码来源于 [sky-summer](https://gitee.com/sky-summer/Lain-plugin.git) 
## 简介
- 插件更新日志：[点击查看](./CHANGELOG.md)
- 本项目使用 [GPL-3.0](./LICENSE) 开源协议，欢迎任何形式的贡献！

`Lain-plugin`是一个围绕云崽`Yunzai-Bot-V3`开发的多适配器插件，让喵崽有更多途径接入`QQ频道`、`微信`、`shamrock`等消息平台~，不再局限于ICQQ。

我正在为 [kritor](https://github.com/KarinJS/kritor) 开发新的机器人框架，如果您有时间且热爱开源并且想参与其中，您可以联系我~

新框架：[Karin](https://github.com/KarinJS/carrying)

### 这里特别声明：

不想登录ICQQ并继续使用本插件：

- 更新云崽到最新
- 打开云崽的`config/config/bot.yaml`文件将 `skip_login: false` 修改为 `skip_login: true`
- 如果不存在这个，自行加一行  `skip_login: true` 即可。

## 1.安装插件

在`Yunzai`根目录执行

`github:`
```
git clone --depth=1 https://github.com/snowtafir/Lain-plugin ./plugins/Lain-plugin
```

`gitee:`
```
git clone --depth=1 https://gitee.com/snowtafir/Lain-plugin ./plugins/Lain-plugin
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

请点击查看对应教程/说明~

- [标准输入](./docs/stdin.md)
- [QQ频道(旧版)](./docs/QQGuild.md)
- [PC微信](./docs/WeChat.md)
- [Shamrock](./docs/Shamrock.md)
- [QQBot(群和频道)](./docs/QQBot.md)
- [网页版微信](./docs/WeXin.md)
- [Lagrange.Core](./docs/Lagrange.Core.md)
- [OneBotV11](./docs/OneBotV11.md)

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
- OneBotV11: `OneBotV11`

## 适配进度
- [√] 标准输入
- [√] 跳过登录QQ
- [√] QQ频道适配器
- [√] PC微信适配器
- [√] 网页版微信适配器
- [√] Shamrock适配器
- [√] QQBot适配器
- [√] LagrangeCore
- [√] OneBotV11适配器

## 特别鸣谢

以下排名不分先后

- [Trss-Yunzai](https://github.com/TimeRainStarSky/Yunzai)
- [Miao-Yunzai](https://github.com/yoimiya-kokomi/Miao-Yunzai)
- [索引库](https://github.com/yhArcadia/Yunzai-Bot-plugins-index)
- [OpenShamrock](https://github.com/whitechi73/OpenShamrock)
- [ComWeChat](https://github.com/JustUndertaker/ComWeChatBotClient)
- [wechat4u](https://github.com/nodeWechat/wechat4u/blob/master/run-core.js)
- [qq-official-bot](https://github.com/lc-cn/qq-official-bot)
- [QQBot按钮库](https://gitee.com/lava081/button)
- [xiaoye12123](https://gitee.com/xiaoye12123)
- [Lagrange.Core](https://github.com/LagrangeDev/Lagrange.Core)
- [sky-summer | Lain-plugin](https://gitee.com/sky-summer/Lain-plugin.git) ：QQbot适配器
