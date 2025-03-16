import Cfg from './lib/config/config.js'
import Yaml from './model/YamlHandler.js'

/**
 *  支持锅巴
 *  锅巴插件：https://gitee.com/guoba-yunzai/guoba-plugin.git
 *  组件类型，可参考 https://vvbin.cn/doc-next/components/introduction.html
 *  https://antdv.com/components/overview-cn/
 */

// function guildList() {
// const guilds = []
// const channels = []
// const prefixBlack = []
// /** 延迟10秒加载数据，防止某些数据没有加载 */
// setTimeout(async () => {
//  while (true) {
//    /** 防止为空 */
//    if (Bot?.lain?.guilds) {
//      const list = Bot.lain.guilds
//      for (let id in list) {
//        /** 频道 */
//        guilds.push({ label: list[id].name, value: `qg_${id}` })
//        /** 这里是子频道 */
//        for (let i in list[id].channels) {
//          channels.push({ label: list[id].name + '-' + list[id].channels[i], value: i })
//        }
//      }
//      break
//    } else {
//      await lain.sleep(1000)
//    }
//  }

//  const cfg = new yaml('./plugins/Lain-plugin/config/bot.yaml')
//  const config = cfg.data()
//  for (const i in config) {
//    prefixBlack.push({ label: Bot?.[i]?.name || '未知', value: config[i].appID })
//  }
// }, 10000)

export function supportGuoba () {
  /** 添加url链接白名单 */
  const addUrlPromptProps = {
    content: '请输入URL：',
    placeholder: '请输入URL',
    okText: '添加',
    rules: [
      { required: true, message: 'URL得填上才行哦~' },
      { pattern: '^https?://\\S+', message: '请输入合法的URL' },
      { max: 255, message: 'URL太长了……' }
    ]
  }

  return {
    pluginInfo: {
      name: '铃音插件',
      title: 'Lain-plugin',
      author: [
        '@sky-summer',
        '@Lain.'
      ],
      authorLink: [
        'https://gitee.com/sky-summer',
        'https://gitee.com/Zyy955'
      ],
      link: 'https://gitee.com/sky-summer/Lain-plugin',
      isV3: true,
      isV2: false,
      description: '主要为云崽提供QQ频道、PC微信、网页版微信机器人等功能',
      // 显示图标，此为个性化配置
      // 图标可在 https://icon-sets.iconify.design 这里进行搜索
      icon: 'mdi: image-filter-drama-outline',
      // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
      iconColor: '#6bb9dd',
      // 如果想要显示成图片，也可以填写图标路径（绝对路径）
      iconPath: process.cwd() + '/plugins/Lain-plugin/resources/icon.png'
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
        {
          label: 'HTTP服务器设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'Server.baseUrl',
          label: '方法1：公网地址',
          bottomHelpMessage: '请输入HTTP服务的公网地址，服务器放行http端口',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入公网地址'
          }
        },
        {
          field: 'Server.baseIP',
          label: '方法2：公网IP',
          bottomHelpMessage: '请输入HTTP服务的公网IP，服务器放行http端口',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入公网IP'
          }
        },
        {
          field: 'Server.port',
          label: '端口',
          bottomHelpMessage: '请输入HTTP服务器端口(Shamrock、QQBot共用)',
          component: 'InputNumber',
          required: true,
          componentProps: {
            type: 'number',
            placeholder: '请输入HTTP服务器端口(Shamrock、QQBot共用)',
            min: 1,
            max: 65535
          }
        },
        {
          field: 'Server.InvalidTime',
          label: '临时文件失效时间',
          bottomHelpMessage: '请输入时间(单位：秒，QQBot使用)',
          component: 'InputNumber',
          required: true,
          componentProps: {
            type: 'number',
            placeholder: '请输入时间(单位：秒，QQBot使用)',
            min: 1
          }
        },
        {
          label: 'QQBot设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: "Token.QQ_Token",
          label: "QQBot Token配置",
          bottomHelpMessage: "点击列表项右上角可删除配置，删除后请重启云崽以应用更新",
          component: "GSubForm",
          componentProps: {
            multiple: true,
            schemas: [
              {
                field: "mode",
                label: "运行模式",
                bottomHelpMessage: "",
                component: "RadioGroup",
                required: true,
                componentProps: {
                  options: [
                    { label: 'websocket', value: 'websocket' },
                    { label: 'webhook', value: 'webhook' },
                    { label: 'middleware', value: 'middleware' }
                  ]
                }
              },
              {
                field: "type",
                label: "是否启用",
                bottomHelpMessage: "",
                component: "RadioGroup",
                required: true,
                componentProps: {
                  options: [
                    { label: '全部启用', value: 0 },
                    { label: '仅启用QQ频道', value: 1 },
                    { label: '仅启用QQ群', value: 2 },
                    { label: '不启用', value: 3 }
                  ]
                }
              },
              {
                field: "appid",
                label: "机器人ID",
                bottomHelpMessage: "",
                component: "Input",
                required: true,
                rules: [
                  { pattern: '^\\d{9,}$', message: '最少需要9位哦！' },
                ]
              },
              {
                field: "sandbox",
                label: "是否使用沙盒",
                bottomHelpMessage: "",
                component: "Switch"
              },
              {
                field: "timeout",
                label: "请求接口超时时间",
                bottomHelpMessage: "单位：毫秒",
                component: "InputNumber",
                componentProps: {
                  type: 'number',
                  placeholder: '请输入时间(单位：秒，QQBot使用)',
                  min: 1
                }
              },
              {
                field: "allMsg",
                label: "QQ频道接收全部消息",
                bottomHelpMessage: "",
                component: "Switch"
              },
              {
                field: "removeAt",
                label: "移除at",
                bottomHelpMessage: "",
                component: "Switch"
              },
              {
                field: "token",
                label: "机器人令牌",
                bottomHelpMessage: "",
                component: "InputPassword",
                required: true
              },
              {
                field: "secret",
                label: "机器人秘钥",
                bottomHelpMessage: "",
                component: "InputPassword",
                required: true
              },
              {
                field: "markdown.id",
                label: "markdown模板ID",
                bottomHelpMessage: "",
                component: "Input"
              },
              {
                field: "markdown.type",
                label: "markdown模板类型",
                bottomHelpMessage: "",
                component: "RadioGroup",
                required: true,
                componentProps: {
                  options: [
                    { label: '关闭', value: 0 },
                    { label: '全局', value: 1 },
                    { label: '正则模式', value: 2 },
                    { label: '按钮模式', value: 3 }
                  ]
                }
              },
              {
                field: "markdown.text",
                label: "markdown模板文字键",
                bottomHelpMessage: "",
                component: "Input"
              },
              {
                field: "markdown.img_dec",
                label: "markdown模板图片宽高键",
                bottomHelpMessage: "",
                component: "Input"
              },
              {
                field: "markdown.img_url",
                label: "markdown模板图片url键",
                bottomHelpMessage: "",
                component: "Input"
              },
              {
                field: "other.Prefix",
                label: "QQ频道、QQ群Bot前缀转换 [/] => [#]",
                bottomHelpMessage: "",
                component: "Switch"
              },
              {
                field: "other.QQCloud",
                label: "QQ图床，填写QQ号。需使用QQ发送图片",
                bottomHelpMessage: "",
                component: "Input"
              },
              {
                field: "other.Tips",
                label: "进入新群后，发送防倒卖提示",
                bottomHelpMessage: "",
                component: "Switch"
              },
              {
                field: "other.Tips_GroupId",
                label: "防倒卖提示中的QQ群号",
                bottomHelpMessage: "",
                component: "Input"
              }
            ]
          }
        },
        {
          label: 'PC微信设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'Adapter.ComWeChat.autoFriend',
          label: '自动同意加好友',
          component: 'RadioGroup',
          bottomHelpMessage: '是否自动同意加好友',
          componentProps: {
            options: [
              { label: '不处理', value: 0 },
              { label: '自动同意', value: 1 }
            ]
          }
        },
        {
          field: 'Adapter.ComWeChat.name',
          label: '椰奶状态名称',
          bottomHelpMessage: '自定义PC微信椰奶状态名称',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入椰奶状态名称'
          }
        },
        {
          label: '网页微信设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'Adapter.WeXin.autoFriend',
          label: '自动同意加好友',
          component: 'RadioGroup',
          bottomHelpMessage: '是否自动同意加好友',
          componentProps: {
            options: [
              { label: '不处理', value: 0 },
              { label: '自动同意', value: 1 }
            ]
          }
        },
        {
          field: 'Adapter.WeXin.name',
          label: '椰奶状态名称',
          bottomHelpMessage: '自定义微信椰奶状态名称',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入椰奶状态名称'
          }
        },
        {
          label: 'Shamrock设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'Adapter.Shamrock.baseUrl',
          label: 'Shamrock主动http链接',
          bottomHelpMessage: '例如http://localhost:5700。若填写将通过此端口进行文件上传等被动ws不支持的操作',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入公网地址'
          }
        },
        {
          field: 'Adapter.Shamrock.token',
          label: '鉴权token',
          bottomHelpMessage: 'Shamrock鉴权token，如果开放公网强烈建议配置',
          component: 'InputPassword',
          required: false,
          componentProps: {
            placeholder: '请输入shamrock鉴权token'
          }
        },
        {
          field: 'Adapter.Shamrock.githubKey',
          label: 'Github Access Token',
          component: 'InputPassword',
          bottomHelpMessage: '用于查询shamrock仓库版本信息。登录网页github点击右上角头像，然后settings-developer-personal access tokens-Fine-grained tokens创建一个默认的即可',
          required: false,
          componentProps: {
            placeholder: '请输入Github Access Token'
          }
        },
        {
          label: '标准输入设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'Adapter.Stdin.state',
          label: '标准输入开关',
          bottomHelpMessage: '是否开启标准输入',
          component: 'Switch'
        },
        {
          field: 'Adapter.Stdin.name',
          label: '标准输入昵称',
          bottomHelpMessage: '自定义标准输入的椰奶状态名称',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入自定义标准输入昵称'
          }
        },
        {
          field: 'Adapter.Stdin.avatar',
          label: '标准输入头像',
          bottomHelpMessage: '自定义标准输入的椰奶状态头像',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入自定义标准输入头像路径，可选绝对路径或以崽目录开始相对路径'
          }
        },
        {
          label: '其他设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'Other.DelFileCron',
          label: '定时清理缓存',
          bottomHelpMessage: '在指定的时间清理缓存',
          component: 'EasyCron',
          componentProps: {
            multiple: true,
            placeholder: '请输入或选择Cron表达式'
          }
        },
        {
          field: 'Other.ICQQtoFile',
          label: 'ICQQ魔法文件',
          bottomHelpMessage: '是否开启',
          component: 'Switch'
        },
        {
          field: 'Other.QQBotdau',
          label: 'QQBotdau统计',
          bottomHelpMessage: '是否开启QQBotdau统计功能',
          component: 'Switch'
        },
        {
          field: 'Other.WhiteLink',
          label: '白名单url',
          bottomHelpMessage: 'url白名单，在白名单中的链接不会转为二维码',
          component: 'GTags',
          componentProps: {
            placeholder: '请输入链接',
            allowAdd: true,
            allowDel: true,
            showPrompt: true,
            promptProps: addUrlPromptProps,
            valueFormatter: ((value) => String(value)).toString()
          }
        }
      ],
      // 获取配置数据方法（用于前端填充显示数据）
      getConfigData () {
        let QQ_Token = Object.values(Cfg.getToken('QQ_Token') ?? {})

        return {
          Server: Cfg.Server,
          Adapter: {
            ComWeChat: Cfg.ComWeChat,
            WeXin: Cfg.WeXin,
            Shamrock: Cfg.Shamrock,
            Stdin: Cfg.Stdin
          },
          Other: Cfg.Other,
          Token: {
            QQ_Token
          }
        }
      },
      // 设置配置的方法（前端点确定后调用的方法）
      setConfigData (data, { Result }) {
        const selectPath = (name) => {
          if (name === "Token") return `/${name}.yaml`
          else return `/Config-${name}.yaml`
        }
        try {
          for (let i in data) {
            let value = data[i]
            i = i.split('.')
            let key = i.shift()
            let config = new Yaml(lain._pathCfg + selectPath(key))
            if (key === "Token") {
              value = parseQQToken(config, value)
            }
            config.set(i.join('.'), value)
          }
          return Result.ok({}, '保存成功~')
        } catch (err) {
          logger.error('[Lain-plugin][锅巴] 保存失败：\n', err)
          return Result.error(`保存失败：\n${err.message}`)
        }
      }
    }
  }
}

function convertToNestedObject(data) {
  const result = {}

  for (const key in data) {
    if (Object.hasOwn(data, key)) {
      const keys = key.split(".")
      let obj = result

      keys.forEach((k, index) => {
        if (index === keys.length - 1) {
          obj[k] = data[key]
        } else {
          obj[k] = obj[k] || {}
          obj = obj[k]
        }
      })
    }
  }

  return result
}

function parseQQToken(cfg, token) {
  let ret = {}
  token.map(async i => {
    const config = convertToNestedObject(i)

    /** 单独处理部分参数 */
    config.other["Tips-GroupId"] = Number(config.other.Tips_GroupId) || ""
    delete config.other.Tips_GroupId
    config.other.QQCloud = Number(config.other.QQCloud) || ""
    if (String(config.appid).length < 9) return
    config.appid = String(config.appid)

    /** 看下是否配置已存在 */
    if (cfg.value('QQ_Token', config.appid)) {
      ret[String(config.appid)] = {
        ...cfg.get('QQ_Token', config.appid),
        ...config
      }
    } else {
      ret[config.appid] = config
    }

    if (Bot.adapter.includes(config.appid)) return

    try {
      const QQSDK = (await import('./adapter/QQBot/QQSDK.js')).default
    const QQBot = (await import('./adapter/QQBot/index.js')).default
    const QQGuild = (await import('./adapter/QQBot/QQGuild.js')).default
      lain.info(config.appid, '正在建立连接，请稍等~')
      const SDK = new QQSDK(config)
      await SDK.start()
      switch (config.type) {
        case 0:
          /** 同时接群和频道 */
          try {
            const QQB = new QQBot(SDK.sdk, true)
            lain.info(config.appid, await QQB.StartBot())
            await lain.sleep(5000)
            lain.info(config.appid, await new QQGuild(SDK.sdk, true).StartBot())
          } catch (err) {
            lain.error(config.appid, err)
          }
          break
        case 1:
          /** 开始连接QQ频道Bot */
          lain.info(config.appid, await new QQGuild(SDK.sdk, true).StartBot())
          break
        case 2:
          try {
            const bot = new QQBot(SDK.sdk, true)
            lain.info(config.appid, await bot.StartBot())
          } catch (err) {
            lain.error(config.appid, err)
          }
          break
        default:
          break
      }
    } catch (error) {
      /** 异常处理 */
      lain.error(config.appid, error)
    }
  })
  return ret
}

/** 后续添加(咕咕咕)

        {
          label: 'QQ频道设置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'prefix',
          label: '前缀转换',
          bottomHelpMessage: '是否开启前缀“/”转换为“#”',
          component: 'Switch'
        },
        {
          field: 'prefixBlack',
          label: '前缀转换黑名单',
          bottomHelpMessage: '在这里添加机器人的开发者id(appID)则不会转换该机器人的前缀',
          component: 'Select',
          componentProps: {
            allowAdd: true,
            allowDel: true,
            mode: 'multiple',
            options: prefixBlack
          }
        },
        {
          field: 'forwar',
          label: '分片转发',
          bottomHelpMessage: '是否使用分片发送转发消息',
          component: 'Switch'
        },
        {
          field: 'recallQR',
          label: '二维码撤回时间',
          bottomHelpMessage: 'url转换成二维码后的撤回时间 0表示不撤回',
          component: 'Input',
          required: true,
          componentProps: {
            type: 'number',
            placeholder: '请输入纯数字',
            min: 1,
            max: 120
          }
        },
        {
          field: 'ImageSize',
          label: '图片压缩阈值',
          bottomHelpMessage: '超过此大小的图片发送前会进行压缩',
          component: 'Input',
          required: true,
          componentProps: {
            type: 'number',
            placeholder: '请输入纯数字',
            min: 1,
            max: 5
          }
        },
        {
          field: 'width',
          label: '压缩图片-宽度',
          bottomHelpMessage: '压缩后的图片宽度像素大小',
          component: 'Input',
          required: true,
          componentProps: {
            type: 'number',
            placeholder: '请输入压缩后的图片宽度像素大小',
            min: 1,
            max: 3000
          }
        },
        {
          field: 'quality',
          label: '压缩图片-质量',
          bottomHelpMessage: '压缩后的图片质量',
          component: 'Input',
          required: true,
          componentProps: {
            type: 'number',
            placeholder: '请输入压缩后的图片质量',
            min: 1,
            max: 100
          }
        },
        {
          field: 'whitelist_Url',
          label: '白名单url',
          bottomHelpMessage: 'url白名单，在白名单中的链接不会转为二维码',
          component: 'GTags',
          componentProps: {
            placeholder: '请输入链接',
            allowAdd: true,
            allowDel: true,
            showPrompt: true,
            promptProps: addUrlPromptProps,
            valueFormatter: ((value) => String(value)).toString()
          }
        },
        {
          field: 'whitelist',
          label: '白名单频道',
          bottomHelpMessage: '配置此项后，只有在配置中的频道能响应消息',
          component: 'Select',
          componentProps: {
            allowAdd: true,
            allowDel: true,
            mode: 'multiple',
            options: guilds
          }
        },
        {
          field: 'blacklist',
          label: '黑名单频道',
          bottomHelpMessage: '顾名思义',
          component: 'Select',
          componentProps: {
            allowAdd: true,
            allowDel: true,
            mode: 'multiple',
            options: guilds
          }
        },
        {
          field: 'channel_whitelist',
          label: '白名单子频道',
          bottomHelpMessage: '配置此项后，只有在配置中的子频道能响应消息',
          component: 'Select',
          componentProps: {
            allowAdd: true,
            allowDel: true,
            mode: 'multiple',
            options: channels
          }
        },
        {
          field: 'channel_blacklist',
          label: '黑名单子频道',
          bottomHelpMessage: '顾名思义',
          component: 'Select',
          componentProps: {
            allowAdd: true,
            allowDel: true,
            mode: 'multiple',
            options: channels
          }
        },
*/
