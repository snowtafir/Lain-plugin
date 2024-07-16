# 标准输入
- 作用：在控制台和在QQ一样执行指令，用于无法登录QQ情况下想执行指令。
- 主人：`标准输入`默认为主人
- 支持大部分基础指令，类似于锅巴登录等，支持保存图片、视频、语音至`data/stdin/`目录。
  
# 如何使用

请直接把`控制台`当成您的QQ`输入指令`即可！

# 自定义椰奶状态头像

如何使用：在`./resources`文件夹下方创建一个名称为`avatar.jpg`的图片

也可通过`config/config/Config-Adapter.yaml`中修改`Stdin.avatar`配置，`./resources/avatar.jpg`优先级大于`Stdin.avatar`；`Stdin.avatar`可选绝对路径或以崽目录开始相对路径

# 自动更换椰奶状态头像
每次启动会从目录中随机选择一张图片作为椰奶状态头像

如何使用：先配置`Stdin.avatar`为`auto`，在`resources/Avatar/`目录放置头像图片即可
