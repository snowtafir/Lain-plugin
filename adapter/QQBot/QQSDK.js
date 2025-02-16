import { Bot as QQBot } from 'qq-official-bot'
import Cfg from '../../../../lib/config/config.js'

export default class QQSDK {
  constructor (config) {
    this.config = config
  }

  async start () {
    /** appid */
    this.id = this.config.appid
    /** 移除at */
    this.config.removeAt = true
    /** QQBotID */
    this.QQBot = this.config.appid
    /** QQGuidID */
    this.QQGuid = `qg_${this.config.appid}`
    /** 最大重连次数 */
    this.config.maxRetry = this.config.maxRetry || 10
    /** 日志等级 */
    this.config.logLevel = Cfg.bot.log_level
    /** 监听事件 */
    this.config.intents = []

    /** 是否启用群 */
    if (this.config.type == 0 || this.config.type == 2) {
      /** 群私聊事件 */
      this.config.intents.push('C2C_MESSAGE_CREATE')
      /** 群@消息事件 */
      this.config.intents.push('GROUP_AT_MESSAGE_CREATE')
      /** 群按钮点击回调事件 */
      this.config.intents.push('INTERACTION')
    }

    /** 是否启用频道 */
    if (this.config.type == 0 || this.config.type == 1) {
      /** 频道变更事件 */
      this.config.intents.push('GUILDS')
      /** 频道成员变更事件 */
      this.config.intents.push('GUILD_MEMBERS')
      /** 频道私信事件 */
      this.config.intents.push('DIRECT_MESSAGE')
      /** 频道消息表态事件 */
      this.config.intents.push('GUILD_MESSAGE_REACTIONS')
      /** 公域 私域事件 */
      this.config.allMsg ? this.config.intents.push('GUILD_MESSAGES', 'FORUMS_EVENTS') : this.config.intents.push('PUBLIC_GUILD_MESSAGES', 'OPEN_FORUMS_EVENTS')
    }

    /** 创建机器人 */
    this.sdk = new QQBot(this.config)
    /** 连接机器人 */
    await this.sdk.start()
    /** 修改sdk日志为喵崽日志 */
    this.sdk.logger = {
      info: (...log) => this.logger(...log),
      trace: (...log) => lain.trace(this.id, ...log),
      debug: (...log) => lain.debug(this.id, ...log),
      mark: (...log) => lain.mark(this.id, ...log),
      warn: (...log) => lain.warn(this.id, ...log),
      error: (...log) => lain.error(this.id, ...log),
      fatal: (...log) => lain.fatal(this.id, ...log)
    }
    /** 实现自动重连(10秒后运行每1分钟定时检测) */
    if (this.config.mode === 'websocket') {
      setTimeout(() => {
        this.sdk.timer = setInterval(async () => {
          if (this.sdk.receiver?.handler?.ws?.readyState !== 1) {
            lain.warn(this.id, "检测到账号离线，已自动重连")
            await this.sdk.stop()
            await lain.sleep(10)
            await this.sdk.start()
          }
        }, 1 * 60 * 1000)
      }, 10 * 1000)
    }
  }

  /** 修改一下日志 */
  logger (...data) {
    let msg = data[0]

    if (typeof msg !== 'string' || data.length > 1) return lain.info(this.id, ...data)

    msg = msg.trim().replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1')
    try {
      if (/^(recv from Group|recv from Guild|recv from User|recv from Direct)/.test(msg)) {
        return ''
      } else if (/^send to Group/.test(msg)) {
        msg = msg.replace(/^send to Group\([^)]+\): /, `<发送群聊: ${msg.match(/\(([^)]+)\)/)[1]}> => `)
      } else if (/^send to User/.test(msg)) {
        msg = msg.replace(/^send to User\([^)]+\): /, `<发送私聊: ${msg.match(/\(([^)]+)\)/)[1]}> => `)
      } else if (/^send to Channel/.test(msg)) {
        msg = msg.replace(/^send to Channel\([^)]+\): /, `<发送频道: ${msg.match(/\(([^)]+)\)/)[1]}> => `)
      } else if (/^send to Direct/.test(msg)) {
        msg = msg.replace(/^send to Direct\([^)]+\): /, `<发送私信: ${msg.match(/\(([^)]+)\)/)[1]}> => `)
      }
    } catch { }
    return lain.info(this.id, msg)
  }
}
