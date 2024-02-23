 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

# 请注意，`Lagrange.Core`作者不接受任何形式的传播  
# 请勿将`Lagrange.Core`在中国大陆任何公开的平台进行任何传播，特别是“B站”~  
# 请勿对`Lagrange.Core`进行制作任何教程，包括于本插件的任何教程  
# 谨记：上一个走的还是超时空猫猫。

### 使用方法：

你需要自行前往[Lagrange.Core](https://github.com/LagrangeDev/Lagrange.Core)找到文件、sign

### Linux

提权：
```bash
chmod +777 Lagrange.OneBot
./Lagrange.OneBot
```

随后先进行关闭，进行下一步

### windows

解压，运行一次，随后关闭，进行下一步


### 编辑`appsettings.json`

在根目录打开`appsettings.json`

修改为以下这样

```json
{
    "Logging": {
        "LogLevel": {
            "Default": "Information",
            "Microsoft": "Warning",
            "Microsoft.Hosting.Lifetime": "Information"
        }
    },
    "SignServerUrl": "你需要自己找到sign，填写到这里",
    "Account": {
        "Uin": 0,
        "Password": "",
        "Protocol": "Linux",
        "AutoReconnect": true,
        "GetOptimumServer": true
    },
    "Message": {
      "IgnoreSelf": true
    },
    "Implementations": [
        {
            "Type": "ReverseWebSocket",
            "Host": "127.0.0.1",
            "Port": 2955,
            "Suffix": "/LagrangeCore",
            "ReconnectInterval": 5000,
            "HeartBeatInterval": 5000,
            "AccessToken": ""
        }
    ]
}
```

**如果你的端口地址是云服务器，请自行更改**
```json
{
    "Type": "ReverseWebSocket",
    "Host": "192.168.1.1",
    "Port": 8888,
    "Suffix": "/LagrangeCore",
    "ReconnectInterval": 5000,
    "HeartBeatInterval": 5000,
    "AccessToken": ""
}
```


解释一下`ws://localhost:2955/LagrangeCore`这个地址
- `ws://`这部分是固定的，无需更改
- `localhost`这个是本地地址，如果你的喵崽在`云服务器`，请更换为云服务器的`公网IP地址`
- `:2956`这部分是端口，需要使用`:`和`IP地址`连接起来，如需更改，请自行修改配置文件`config.yaml`或使用锅巴修改
- `/Shamrock`这部分是固定的，无需更改


# 适配进度

没有注明的在下方的有需求并且我时间充裕的情况下会实现... 欢迎pr

- [√] 接收`文本`、`表情`、`at`、`图片`消息
- [√] 发送`文本`、`表情`、`at`、`图片`消息
- [ ] 语音、视频、文件、合并转发
- [√] 好友主动消息`Bot[BotQQ号].pickUser(user_id).sendMsg("主动消息")`
- [√] 群聊主动消息`Bot[BotQQ号].pickGroup(group_id).sendMsg("主动消息")`
- [√] 撤回消息


如需使用`yenai-plugin`，请使用为`shamrock`专门适配的椰奶：[yenai-plugin](https://github.com/Zyy955/yenai-plugin)