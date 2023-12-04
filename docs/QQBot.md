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

是否沙箱选择否即可，选择是有可能导致收不到消息或消息发送报错。目前暂未发现需要选择是的情况。

目前由于官方API的限制，需要使用在线url，我准备了3种方法，请注意查看以下

- 方法1：内置了一个网盘，如果你没有设置公网，会默认调用网盘，支持图片、语音、视频。

- 方法2：前往`./plugins/Lain-plugin/config/config.yaml`配置公网地址，端口为配置文件中的`HTTP`端口，如果有转发，请修改`实际端口`选项。

- 方法3：登录一个QQ机器人，使用QQ图床。备用方案，你只需要登录，ICQQ、shamrock、ntqq都可，此方法仅可发送图片。

- 适配器自带指令前缀/转#，默认打开。

## 网盘Api

<details><summary>展开/收起</summary>

- 网盘API 从网上收集的，非本人所属，侵权删~

- 优先尝试内置网盘发图，失败后如有配置公网IP则使用公网IP发图，否则通过方法3给自己发图的方式上传图片，语音，视频等。

- 可通过锅巴配置填写公网IP，支持端口映射。

- 暂时只适配了一个网盘，如希望禁用内置网盘，可自行将配置文件中的网盘地址留空。

</details>

