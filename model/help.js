export const helpCfg = {
  themeSet: false,
  title: '铃音帮助',
  subTitle: 'Miao-Yunzai & Lain-plugin',
  colWidth: 265,
  theme: 'all',
  themeExclude: [
    'default'
  ],
  colCount: 2,
  bgBlur: true
}
export const helpList = [
  {
    group: 'QQBot ---> #QQBot设置 沙盒:私域:appID:token:secret',
    list: [
      {
        icon: 1,
        title: '#QQ群设置',
        desc: '是=1 否=0 再次添加为删除'
      },
      {
        icon: 13,
        title: '#QQ频道设置',
        desc: '是=1 否=0 再次添加为删除'
      },
      {
        icon: 23,
        title: '#QQBot设置',
        desc: '同时连接群和频道'
      },
      {
        icon: 3,
        title: '#QQBot账号',
        desc: '查看机器人'
      },
      {
        icon: 6,
        title: '#QQBot设置MD',
        desc: '机器人ID:模板ID'
      },
      {
        icon: 8,
        title: '#QQBotMD 2',
        desc: '0=关闭 1=全局 2=仅正则 3=与内容分离'
      }
    ]
  },
  {
    group: 'Shamrock',
    list: [
      {
        icon: 2,
        title: '#重载资源',
        desc: '用于重新加载好友列表，群列表等。'
      },
      {
        icon: 5,
        title: '#shamrock版本',
        desc: '查询OpenShamrock官方库版本信息'
      },
      {
        icon: 4,
        title: '#shamrock(测试)安装包',
        desc: '从github下载apk安装包发送到群聊/私聊'
      }
    ]
  },
  {
    group: 'WeChat',
    list: [
      {
        icon: 9,
        title: '#微信修改名称<新名称>',
        desc: '修改椰奶状态显示名称'
      }
    ]
  },
  {
    group: '其他',
    auth: 'master',
    list: [
      {
        icon: 16,
        title: '#设置主人',
        desc: '可以艾特指定用户'
      },
      {
        icon: 5,
        title: '#删除主人',
        desc: '艾特指定用户'
      },
      {
        icon: 18,
        title: '#铃音更新',
        desc: '更新插件'
      },
      {
        icon: 24,
        title: '#铃音版本',
        desc: '查看版本'
      },
      {
        icon: 7,
        title: '#ID',
        desc: '获取个人id、群id'
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
