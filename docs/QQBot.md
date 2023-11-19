`请给予机器人基础的权限...什么权限都没有的发个鬼消息啊= =`

 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

## 1.获取QQ机器人

...我也不知道咋获取，因为我没有...

感谢 **@云** 提供的bot测试

## 2.机器人指令配置

如果你没有在登录QQ，可以在控制台使用[标准输入](./stdin.md)来执行指令，直接像QQ一样输入指令！

添加机器人(删除机器人同理)：
```
#QQ群设置 沙盒:私域:移除at:appID:appToken:secret 是=1 否=0
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

开发者ID：`123456789`

appToken：`abcdefghijklmnopqrstuvwxyz123456`

secret：`abcdefghijklmnopqrstuvwxyz`


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

目前由于官方API的限制，需要使用在线url，我准备了3种方法，请注意查看以下

- 方法1：图床，不需要依赖公网。缺点是稳定性未知，随机可能寄。

- 方法2：将喵崽搭在有公网的服务器上，使用服务器的公网放出API，可兼容图片、语音、视频等文件。缺点是需要公网。

- 方法3：登录一个QQ机器人，使用QQ图床。备用方案，你只需要登录，ICQQ、shamrock、ntqq都可。

## 配置图片Api

<details><summary>展开/收起</summary>

- 图床API 从网上收集的，非本人所属，侵权删~

- 优先尝试内置图床发图，失败后如有配置公网IP则使用公网IP发图，否则通过方法3给自己发图的方式上传图片。

- 可通过锅巴配置填写公网IP，支持端口映射。

- 暂时只适配了一个图床，如希望禁用内置图床，可自行将配置文件中的图床地址留空。

</details>

