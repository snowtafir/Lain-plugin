## 简介
- 插件更新日志：[点击查看](./CHANGELOG.md)
- 本项目使用 [GPL-3.0](./LICENSE) 开源协议，欢迎任何形式的贡献！

## 1.安装插件

在`Miao-Yunzai`根目录执行，任选其一

Gitee：
```
git clone --depth=1 https://gitee.com/all-thoughts-are-broken/Lain-plugin ./plugins/Lain-plugin
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
- [qq-group-bot](https://github.com/lc-cn/qq-group-bot)
- [QQBot按钮库](https://gitee.com/lava081/button)
- [xiaoye12123](https://gitee.com/xiaoye12123)
- [Lagrange.Core](https://github.com/LagrangeDev/Lagrange.Core)