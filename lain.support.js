const list = [
  { label: '铃音帮助', data: '#铃音帮助' },
  { label: '设置主人', data: '#设置主人' }
]

export default class Button {
  constructor() {
    this.plugin = {
      name: 'Lain-plugin',
      dsc: '铃音插件',
      priority: 99,
      rule: [
        {
          reg: '^#?(id|ID)',
          fnc: 'Id'
        },
        {
          reg: /^#(Lain|铃音)帮助$/i,
          fnc: 'menu',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)控制台帮助$/i,
          fnc: 'stdin',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)设置标准输入.*/i,
          fnc: 'stdin',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)三叶草帮助$/i,
          fnc: 'shamrock',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)设置三叶草.*/i,
          fnc: 'shamrock',
          permission: 'master'
        },
        {
          reg: /^#(shamrock|三叶草)(发布|测试)?(版本|更新日志|安装包|apk|APK)$/gi,
          fnc: 'shamrock',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)微信帮助$/i,
          fnc: 'wechat',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)设置(PC)?微信.*/i,
          fnc: 'wechat',
          permission: 'master'
        },
        {
          reg: /^#微信(登(录|陆)|账号|删除.*)$/,
          fnc: 'wechat',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)QQBot帮助$/i,
          fnc: 'qqbot',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道).*/i,
          fnc: 'qqbot',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)全局帮助$/i,
          fnc: 'bot',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)设置.*/i,
          fnc: 'bot',
          permission: 'master'
        }
      ]
    }
  }

  Id(e) {
    const button = [
      { label: '群聊ID', data: `${e.group_id}`, reply: true },
      { label: '用户ID', data: `${e.user_id}`, reply: true }
    ]
    return Bot.Button(button)
  }

  menu(e) {
    const button = [
      list,
      [
        { label: '全局', data: '#铃音全局帮助' },
        { label: '控制台', data: '#铃音控制台帮助' },
        { label: '三叶草', data: '#铃音三叶草帮助' }
      ],
      [
        { label: '微信', data: '#铃音微信帮助' },
        { label: 'QQBot', data: '#铃音QQBot帮助' }
      ],
      [
        { label: '铃音更新', data: '#铃音更新' },
        { label: '更新日志', data: '#铃音更新日志' }
      ]
    ]
    return Bot.Button(button)
  }

  bot() {
    const button = [
      list,
      [
        { label: 'IP', data: '#铃音设置IP192.168.0.1 (临时文件服务器IP，与 url 二选一，可填域名：127.0.0.1 或 www.lain.com)' },
        { label: '端口', data: '#铃音设置端口2955 (2955是你的HTTP端口,ComWeChat、Shamrock、QQBot临时文件使用)' },
        { label: 'url', data: '#铃音设置urlhttp://192.168.0.1:2956 (临时文件服务器访问url，无特殊需要请不要填写此项，QQBot使用。端口转发、域名等使用：http://www.lain.com 或 http://192.168.0.1:2956，使用前请自行配置转发)' },
        { label: '过期时间', data: '#铃音设置文件过期时间30 (临时文件服务器过期时间，单位:秒)' }
      ]
    ]
    return Bot.Button(button)
  }

  stdin() {
    const button = [
      list,
      [
        { label: '开关', data: '#铃音设置标准输入开启 (是否在椰奶状态显示标准输入)' },
        { label: '昵称', data: '#铃音设置标准输入名称铃音 (铃音是你的标准输入在椰奶状态的昵称)' },
        { label: '铃音更新', data: '#铃音更新' },
        { label: '更新日志', data: '#铃音更新日志' }
      ]
    ]
    return Bot.Button(button)
  }

  shamrock() {
    const button = [
      list,
      [
        { label: 'GithubKey', data: '#铃音设置三叶草gitghp_xxxxx (ghp_xxxxx是你的Github personal access token, 用于查看和下载shamrock版本信息)' },
        { label: '安装包', data: '#三叶草测试安装包' },
        { label: '查看版本', data: '#三叶草版本' }
      ]
    ]
    return Bot.Button(button)
  }

  wechat() {
    const button = [
      list,
      [
        { label: 'PC微信:昵称', data: '#铃音设置PC微信名称铃音 (铃音是你的ComWechat在椰奶状态的昵称)' },
        { label: 'PC微信:好友', data: '#铃音设置PC微信好友开启' }
      ],
      [
        { label: '网页微信:昵称', data: '#铃音设置微信名称铃音 (铃音是你的网页微信在椰奶状态的昵称)' },
        { label: '网页微信:好友', data: '#铃音设置PC微信好友开启' }
      ],
      [
        { label: '网页微信:登录', data: '#微信登录' },
        { label: '网页微信:退出', data: '#微信删除' }
      ],
      [
        { label: '网页微信:查看账号', data: '#微信账号' }
      ]
    ]
    return Bot.Button(button)
  }

  qqbot() {
    const button = [
      list,
      [
        { label: '仅群:连接', data: '#QQ群设置0(0或1表示沙盒模式开关，即使上线前也建议关闭此项):0(0-公域 1-私域，机器人类型在QQ开放平台的沙箱配置中有一次设置机会):机器人ID(在QQ开放平台(q.qq.com)的开发设置中查看):机器人令牌:机器人密钥(需要机器人创建者通过重置获取)' },
        { label: '频道:连接', data: '#QQ频道设置0(0或1表示沙盒模式开关，即使上线前也建议关闭此项):0(0-公域 1-私域，机器人类型在QQ开放平台的沙箱配置中有一次设置机会):机器人ID(在QQ开放平台(q.qq.com)的开发设置中查看):机器人令牌:机器人密钥(需要机器人创建者通过重置获取)' },
        { label: '全域:连接', data: '#QQBot设置0(0或1表示沙盒模式开关，即使上线前也建议关闭此项):0(0-公域 1-私域，机器人类型在QQ开放平台的沙箱配置中有一次设置机会):机器人ID(在QQ开放平台(q.qq.com)的开发设置中查看):机器人令牌:机器人密钥(需要机器人创建者通过重置获取)' }
      ],
      [
        { label: '前缀转换', data: '#QQBot设置前缀开启' },
        { label: 'QQ图床', data: '#QQBot设置QQ图床12345 (12345是连接在同一机器人的野生机器人的qq号)' },
        { label: '查看连接', data: '#QQBot账号' }
      ],
      [
        { label: 'MD模式', data: '#QQBotMD1 (0-关闭 1-全局 2-正则模式(仅对有相应按钮的指令启用MD消息) 3-按钮模式(响应内容时发送普通消息，对有相应按钮的指令额外发送一条内容为空的MD消息以显示按钮))' },
        { label: '模板ID', data: '#QQBot设置MD 机器人ID:模板ID(模板ID在QQ开放平台(q.qq.com)的高阶能力中查看)' }
      ]
    ]
    return Bot.Button(button)
  }
}
