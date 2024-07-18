import Cfg from './lib/config/config.js'
import Yaml from './model/YamlHandler.js'
// import common from '../../lib/common/common.js'

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
//      await common.sleep(1000)
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
      author: '@sky-summer @Lain.',
      authorLink: 'https://gitee.com/sky-summer',
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
          component: 'Divider',
          label: 'HTTP服务器设置'
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
          component: 'Divider',
          label: 'PC微信设置'
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
          bottomHelpMessage: '自定义微信椰奶状态名称',
          component: 'Input',
          required: false,
          componentProps: {
            placeholder: '请输入椰奶状态名称'
          }
        },
        {
          component: 'Divider',
          label: '网页微信设置'
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
          component: 'Divider',
          label: 'Shamrock设置'
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
          component: 'Divider',
          label: '标准输入设置'
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
          component: 'Divider',
          label: '其他设置'
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
        return {
          Server: Cfg.Server,
          Adapter: {
            ComWeChat: Cfg.ComWeChat,
            WeXin: Cfg.WeXin,
            Shamrock: Cfg.Shamrock,
            Stdin: Cfg.Stdin
          },
          Other: Cfg.Other
        }
      },
      // 设置配置的方法（前端点确定后调用的方法）
      setConfigData (data, { Result }) {
        try {
          for (let i in data) {
            let value = data[i]
            i = i.split('.')
            let key = i.shift()
            let config = new Yaml(lain._pathCfg + `/Config-${key}.yaml`)
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

/** 后续添加(咕咕咕)

        {
          component: 'Divider',
          label: 'QQ频道设置'
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
