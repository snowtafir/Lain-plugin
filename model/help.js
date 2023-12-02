export const helpCfg = {
  "themeSet": false,
  "title": "铃音帮助",
  "subTitle": "Miao-Yunzai & Lain-plugin",
  "colWidth": 265,
  "theme": "all",
  "themeExclude": [
    "default"
  ],
  "colCount": 2,
  "bgBlur": true
}
export const helpList = [
  {
    "group": "QQBot ---> #QQ群设置 沙盒:私域:移除at:appID:token:secret",
    "list": [
      {
        "icon": 1,
        "title": "#QQ群设置",
        "desc": "是=1 否=0 再次添加为删除"
      },
      {
        "icon": 3,
        "title": "#QQ频道账号",
        "desc": "查看机器人"
      }
    ],
    "auth": false
  },
  {
    "group": "QQGuild --> #QQ频道设置 沙盒:私域:appid:token",
    "list": [
      {
        "icon": 23,
        "title": "#QQ频道设置",
        "desc": "是=1 否=0 再次添加为删除"
      },
      {
        "icon": 13,
        "title": "#QQ频道账号",
        "desc": "查看已经获取面板信息的角色列表"
      },
      {
        "icon": 6,
        "title": "#QQ频道解除私信",
        "desc": "解除私信3条后等待回复问题...每天仅可发送两次私信主动消息"
      },
      {
        "icon": 7,
        "title": "#ID",
        "desc": "获取个人id、频道id"
      }
    ]
  },
  {
    "group": "Shamrock",
    "list": [
      {
        "icon": 2,
        "title": "#重载资源",
        "desc": "用于重新加载好友列表，群列表等。"
      }
    ]
  },
  {
    "group": "WeChat",
    "list": [
      {
        "icon": 9,
        "title": "#微信修改名称<新名称>",
        "desc": "修改椰奶状态显示名称"
      }
    ]
  },
  {
    "group": "其他",
    "auth": "master",
    "list": [
      {
        "icon": 16,
        "title": "#设置主人",
        "desc": "可以艾特指定用户"
      },
      {
        "icon": 5,
        "title": "#删除主人",
        "desc": "艾特指定用户"
      },
      {
        "icon": 18,
        "title": "#铃音更新",
        "desc": "更新插件"
      },
      {
        "icon": 24,
        "title": "#铃音版本",
        "desc": "查看版本"
      }
    ]
  }
]
export const style = {
  fontColor: '#ceb78b',
  fontShadow: 'none',
  descColor: '#eee',
  contBgColor: 'rgba(6, 21, 31, .5)',
  contBgBlur: 3,
  headerBgColor: 'rgba(6, 21, 31, .4)',
  rowBgColor1: 'rgba(6, 21, 31, .2)',
  rowBgColor2: 'rgba(6, 21, 31, .35)'
}