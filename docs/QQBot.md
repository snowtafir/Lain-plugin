`请给予机器人基础的权限...什么权限都没有的发个鬼消息啊= =`

 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

# 请勿轻信任何人的出售官方Bot，吃相别太难看。

## 1.获取QQ机器人

前往 [QQ开放平台](https://q.qq.com/) -> 登录(企业) -> 应用管理 -> 创建机器人 -> 创建完成

前往应用管理 -> 选择你注册的机器人 -> 开发 -> 开发设置 -> 获取`AppID(机器人ID)`、`Token(机器人令牌)`、`AppSecret(机器人密钥)`。

感谢 **@云** 提供的bot测试。目前QQbot仅对企业用户开放，个人开发者很难申请

## 2.机器人指令配置

如果你没有在登录QQ，可以在控制台使用 [标准输入](./stdin.md) 来执行指令，直接像QQ一样输入指令！

添加机器人(删除机器人同理)：**是=1 否=0**
```
#QQ群设置 沙盒:私域:移除at:机器人ID:机器人令牌:机器人密钥
```

查看机器人：
```
#QQ频道账号
```

## 使用例子

<details><summary>展开/收起</summary>

是否沙盒：`否`

是否私域：`是`

移除at：`是`

AppID(机器人ID)：`123456789`

Token(机器人令牌)：`abcdefghijklmnopqrstuvwxyz123456`

AppSecret(机器人密钥)：`abcdefghijklmnopqrstuvwxyz`


添加机器人：
```
#QQ群设置 0:1:1:123456789:abcdefghijklmnopqrstuvwxyz123456:abcdefghijklmnopqrstuvwxyz
```

删除机器人：
```
#QQ群设置 0:1:1:123456789:abcdefghijklmnopqrstuvwxyz123456:abcdefghijklmnopqrstuvwxyz
```

</details>

## 其他

是否沙箱选择**否**即可，选择是有可能导致收不到消息或消息发送报错。目前暂未发现需要选择是的情况。

目前由于官方图片API的限制，发图需要使用在线url，我准备了3种方法，请注意查看以下

- 方法1：编写一个全局变量`Bot.uploadFile`，接收一个参数，返回url，例如花瓣图床，起点图床等。

- 方法2：前往 [./plugins/Lain-plugin/config/config.yaml](../config/config.yaml) 配置公网地址，端口为配置文件中的`HTTP`端口，如果有转发，请修改`实际端口`选项。

- 方法3：登录一个QQ机器人，使用QQ图床。备用方案，你只需要登录，ICQQ、shamrock、ntqq都可，此方法仅可发送图片。

- 适配器自带指令前缀/转#，默认打开。

## 高阶能力

<details><summary>Markdown 消息</summary>

`此项配置同步 TRSS-Yunzai，设置后视为全局启用Markdown模板发送文本、图片消息`

高阶能力 → 消息模板 → 添加 Markdown 模板

模板名称：图文消息  
使用场景：发送图文混排消息  
Markdown 源码：

```
{{.text_start}}![{{.img_dec}}]({{.img_url}}){{.text_end}}
```

配置模板参数
| 模板参数 | 参数示例 |
| - | - |
| text_start | 开头文字 |
| img_dec | 图片 |
| img_url | https://qqminiapp.cdn-go.cn/open-platform/11d80dc9/img/robot.b167c62c.png |
| text_end | 结束文字 | 

保存 → 提交审核 → 审核完成后，输入 `#QQ群设置MD 机器人ID:模板ID`

</details>

<details><summary>全局 Markdown 消息附带发送按钮编写</summary>

请自行查看`./plugins/Lain-plugin/config/markdown.js`，参考其中的编写方法，可根据传入的消息在返回的`Markdown`消息中添加按钮一起返回。

支持异步、同步函数，可返回数组或对象。

用户可自行接收e，插件会原封不动将e传递。

</details>

<details><summary>自定义发送 Markdown 消息</summary>



Markdown 源码:

```
![imagesize#618px #249px]({{.image}})
```

喵崽发送：

```
const file = 'https://resource5-1255303497.cos.ap-guangzhou.myqcloud.com/abcmouse_word_watch/other/mkd_img.png'
const { width, height, url } = await Bot.imgProc(file)

return await this.reply({
    type: 'markdown', // 这里添加多一个类型，其他按照官方文档来。
    custom_template_id: '101993071_1658748972',
    params: [
      { key: 'imagesize', values: [`text #${width}px #${height}px`] },
      { key: 'image', values: [url] }
    ]
  })
```

参数按照[官方文档](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/type/markdown.html#发送方式)发送即可，注意`type`，其他的自行参考文档。

</details>

