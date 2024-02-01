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
// 请认真查看例子中的说明
#QQBot设置 沙盒:私域:机器人ID:机器人令牌:机器人密钥
```

查看机器人：
```
#QQBot账号
```

## 使用例子

<details><summary>展开/收起</summary>

是否沙盒：`否`

是否私域：`是`

AppID(机器人ID)：`123456789`

Token(机器人令牌)：`abcdefghijklmnopqrstuvwxyz123456`   // 目前该配置sdk已废除，但是目前本插件还会保留一段时间。

AppSecret(机器人密钥)：`abcdefghijklmnopqrstuvwxyz`


- 3个指令，3选1
- `#QQBot设置`  => 同时接频道、群
- `#QQ群设置`   => 只连接群
- `QQ频道设置`  => 只连接频道

添加群机器人：
```
#QQ群设置 0:1:123456789:abcdefghijklmnopqrstuvwxyz123456:abcdefghijklmnopqrstuvwxyz
```

删除群机器人：
```
#QQ群设置 0:1:123456789:abcdefghijklmnopqrstuvwxyz123456:abcdefghijklmnopqrstuvwxyz
```

</details>

## 其他

是否沙箱选择**否**即可，选择是有可能导致收不到消息或消息发送报错。目前暂未发现需要选择是的情况。

目前由于官方API的限制，发图需要使用在线url，我准备了3种方法，请注意查看以下

- 方法1：
  - 图片：编写一个全局变量`Bot.imageToUrl`，接收一个参数，返回 `width, height, url`，例如花瓣图床，起点图床等。
  - 语音：编写一个全局变量`Bot.audioToUrl`，接收一个参数，返回 `url`。
  - 视频：编写一个全局变量`Bot.videoToUrl`，接收一个参数，返回 `url`。
- 方法2：前往 [./plugins/Lain-plugin/config/config.yaml](../config/config.yaml) 配置公网地址，端口为配置文件中的`HTTP`端口，如果有转发，请修改`实际端口`选项。
- 方法3：登录一个QQ机器人，随后前往[./plugins/Lain-plugin/config/config.yaml](../config/config.yaml)配置`QQBotUin`为QQ号，此方法仅可发送图片。
- 适配器自带指令前缀/转#，默认打开。若需关闭请发送
```
#QQBot设置前缀关闭
```
或者编辑 [config/token.yaml](../config/token.yaml) 配置文件，关闭将 `/` 转换为 `#`


<details><summary>方法1图床编写参考</summary>

```javascript
// 编写后保存为js文件放到example文件夹
import fs from 'fs'
import fetch from 'node-fetch'

/** key获取地址：https://api.imgbb.com/ 登录后获取即可 */
const key = ''

/** 上传后是否自动删除，单位秒 */
const expiration = ''

/**
* ibb图床
* @param file 文件，支持file://,buffer,base64://
* @return url地址
*/
Bot.imageToUrl = async (file) => {
  let base64
  if (Buffer.isBuffer(file)) {
    base64 = file.toString('base64')
  } else if (file.startsWith('file://')) {
    base64 = fs.readFileSync(file.slice(7)).toString('base64')
  } else if (file.startsWith('base64://')) {
    base64 = file.slice(9)
  } else if (/^http(s)?:\/\//.test(file)) {
    let res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      base64 = Buffer.from(await res.arrayBuffer()).toString('base64')
    }
  } else {
    throw new Error('上传失败，未知格式的文件')
  }

  const url = 'https://api.imgbb.com/1/upload'
  const params = new URLSearchParams()
  params.append('key', key)
  params.append('image', base64)
  if (expiration) params.append('expiration', expiration)

  const res = await fetch(url, {
    method: 'post',
    body: params
  })

  if (res.ok) {
    const { data } = await res.json()
    const { width, height, url } = data
    return { width, height, url: 'https://i0.wp.com/' + url.replace(/^https:\/\//, '') }
  } else {
    throw new Error(`HTTP error: ${res.status}`)
  }
}

```
</details>

## 高阶能力

高阶能力 → 消息模板 → 添加 Markdown 模板

<details><summary>图文消息</summary>

模板名称：图文消息

使用场景：发送图文混排消息

请复制后去除源码前后的 ` 标记

Markdown 源码：

```
{{.text_start}}![{{.img_dec}}]({{.img_url}}){{.text_end}}
```

配置模板参数
| 模板参数   | 参数示例                                                          号位文字 |
| ---------- | -------------------------------------------------------------------------- |
| text_start | 开头文字                                                          号位文字 |
| img_dec    | 图片                                                              号位文字 |
| img_url    | https://qqminiapp.cdn-go.cn/open-platform/11d80dc9/img/robot.b167c62c.png  |
| text_end   | 结束文字                                                          号位文字 |

保存 → 提交审核 → 审核完成后，输入 `#QQBot设置MD 机器人ID:模板ID`


温馨提示：
支持自定义全局模板名称，打开配置文件自行配置，`./plugins/Lain-plugin/config/config/token.yaml`

配置后无需申请通用模板，经测试，只需要一个图文模板即可使用全局md。

随后执行
```
#QQ群设置MD 机器人ID:模板ID
```

</details>

<details><summary>纯文模板</summary>

模板名称：合并转发

使用场景：发送合并转发消息

请复制后去除源码前后的 ` 标记

### 我更推荐你用此模板，支持多图，Markdown语法。 

Markdown 源码：

```
{{.text_0}}{{.text_1}}{{.text_2}}{{.text_3}}{{.text_4}}{{.text_5}}{{.text_6}}{{.text_7}}{{.text_8}}{{.text_9}}
```

配置模板参数
| 模板参数 | 参数示例  |
| -------- | --------- |
| text_0   | 0号位文字 |
| text_1   | 1号位文字 |
| text_2   | 2号位文字 |
| text_3   | 3号位文字 |
| text_4   | 4号位文字 |
| text_5   | 5号位文字 |
| text_6   | 6号位文字 |
| text_7   | 7号位文字 |
| text_8   | 8号位文字 |
| text_9   | 9号位文字 |


保存 → 提交审核 → 审核完成

将`./plugins/Lain-plugin/plugins/纯文模板.js`复制到`./plugins/example`

对机器人输入 
```
#QQBot设置MD 机器人ID:模板ID
```

随后输入 
```
#QQBotMD 机器人ID:4
```

</details>

<details><summary>Markdown 消息附带发送按钮编写</summary>

按钮仓库：[lava081/button](https://gitee.com/lava081/button)

- 插件开发者请在插件包目录创建 `lain.support.js`，和锅巴一样。
- 个人用户可在 `plugins/Lain-plugin/plugins/button`文件夹创建 `js` 文件、文件夹，可创建多个。
- 复制以下内容到 `lain.support.js` 中，自行编写正则和执行方法即可。

```javascript
export default class Button {
  constructor () {
    this.plugin = {
      // 插件名称
      name: '按钮示例',
      // 描述
      dsc: '按钮示例',
      // 按钮优先级
      priority: 100,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^#?测试$',
          /** 执行方法 */
          fnc: 'test'
        },
      ]
    }
  }

  /** 执行方法 */
  test (e) {
    const button = []
  
    const list1 = [  // 方法1: 传入二维数组，适用于不定列数按钮
      [
        { label: '0.0' },  // 外显和内容相同的按钮
        { label: '0.1' , enter: true },  // 外显和内容相同的回车按钮
        { label: '0.2' , data: 'test1' },  // 外显和内容不同的按钮
        { label: '0.3' , callback: 'test2' },  // 外显和内容不同的回车按钮
      ],
      [  
        { label: '1.0' , link: 'https://im.qq.com/index/' },  // 跳转到链接的按钮

        /* style: 0 - 灰色线框, 1 - 蓝色线框 */
        { label: '1.1' , style: '0' },  // 灰色线框按钮

        /* type: 0 - http或小程序, 1 - 回调后台接口, 2 - 自动在输入框 @bot data */
        { label: '1.2' , type: '1' },  // 回调后台接口的按钮

        /* permission.type: 0 - 指定用户可操作(群, 需填写specify_user_ids), 1 - 仅管理者可操作, 2 - 所有人可操作, 3 - 指定身份组可操作(频道, 需填写specify_role_ids) */
        { label: '1.3' , permission: { type: '0' , specify_user_ids: [ e.user_openid ] } },  // 附带权限的按钮

        { label: '1.4' , data: 'test4' , style: '0' , type: '1' , permission: { type: '0' , specify_user_ids: [ e.user_openid ] } },
      ],
    ]
    button.push(...Bot.Button(list1))  // 调用Bot.Button制作按钮

    const list2 = [  // 方法2: 传入一维数组，适用于固定列数的按钮
      { label: '0' },
      { label: '1' },

      { label: '2' },
      { label: '3' },

      { label: '4' },
    ]
    button.push(...Bot.Button( list2 , 2 ))  // 调用Bot.Button制作按钮，第二个参数为固定列数

    return button  // 返回制作完成的按钮
  }
}

```

#### 基本参数

| 序号 | 键    | 注释                   |
| ---- | ----- | ---------------------- |
| 1    | text  | 文本内容               |
| 2    | style  | 按钮颜色               |
| 3    | data  | 自定义回复内容         |
| 4    | send  | 直接发送内容           |
| 5    | admin | 仅管理员可点           |
| 6    | list  | 仅指定用户可点         |
| 7    | role  | 仅指定用户可点 - 频道  |
| 8    | reply | 点击后自动添加引用回复 |
| 9    | link  | http跳转               |

```javascript
// text和link均可作为主键与其他任何键进行单个、多个组合
const list = [
  { text: '普通文本' },
  { text: '灰色按钮', style: 0 },
  { text: '显示的文字', data: '实际的文本' },
  { text: '直接发送文本', send: true },
  { text: '仅管理员可点', admin: true },
  { text: '仅列表用户可点', list: ['用户1', '用户2'] },
  { text: '引用回复', reply: true },
  { link: 'http连接' }
]

```

</details>

<details><summary>自定义发送 Markdown 消息</summary>



Markdown 源码:

```
![imagesize#618px #249px]({{.image}})
```

喵崽发送：

```javascript
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
