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
    if (this.config.model == 0 || this.config.model == 2) {
      /** 群私聊事件 */
      this.config.intents.push('C2C_MESSAGE_CREATE')
      /** 群@消息事件 */
      this.config.intents.push('GROUP_AT_MESSAGE_CREATE')
      /** 群按钮点击回调事件 */
      this.config.intents.push('INTERACTION')
    }

    /** 是否启用频道 */
    if (this.config.model == 0 || this.config.model == 1) {
      /** 频道变更事件 */
      this.config.intents.push('GUILDS')
      /** 频道成员变更事件 */
      this.config.intents.push('GUILD_MEMBERS')
      /** 频道私信事件 */
      this.config.intents.push('DIRECT_MESSAGE')
      /** 频道消息表态事件 */
      this.config.intents.push('GUILD_MESSAGE_REACTIONS')
      /** 公域 私域事件 */
      this.config.allMsg ? this.config.intents.push('GUILD_MESSAGES') : this.config.intents.push('PUBLIC_GUILD_MESSAGES')
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
  }

  /** 修改一下日志 */
  logger (...data) {
    let msg = data[0]
    if (typeof msg !== 'string' || data.length > 1) return lain.info(this.id, ...data)
    msg = msg.trim()
    try {
      if (/^(recv from Group|recv from Guild|send to Channel|recv from User|send to Direct|recv from Direct)/.test(msg)) {
        return ''
      } else if (/^send to Group/.test(msg)) {
        msg = msg.replace(/^send to Group\([^)]+\): /, `<发送群聊: ${this.id}-${msg.match(/\(([^)]+)\)/)[1]}> => `)
        return lain.info(this.QQBot, msg)
      } else if (/^send to User/.test(msg)) {
        msg = msg.replace(/^send to User\([^)]+\): /, `<发送私聊: ${this.id}-${msg.match(/\(([^)]+)\)/)[1]}> => `)
      }
    } catch { }
    return logger.info(msg)
  }
}
