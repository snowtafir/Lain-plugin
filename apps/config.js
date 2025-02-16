import YAML from '../model/YamlHandler.js'
import common from '../lib/common/common.js'
import Cfg from '../lib/config/config.js'

export class adapter extends plugin {
  constructor () {
    super({
      name: 'Bot配置',
      dsc: 'QQ频道、QQ群Bot基本配置',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^#QQ(群|Bot|频道)设置(QQ图床|前缀|防倒卖(群号)?).+/i,
          fnc: 'other',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)?设置(?!MD|markdown).+/i,
          fnc: 'bot',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)?账号/i,
          fnc: 'account',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)设置(MD|markdown).+/i,
          fnc: 'markdown',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)(MD|markdown) ?(\d{9}:)?[01234]{1}$/i,
          fnc: 'type',
          permission: 'master'
        }
      ]
    })
  }

  /** bot相关配置 */
  async bot () {
    let config = {
      mode: 'websocket',
      type: 0,
      appid: '',
      token: '',
      sandbox: false,
      timeout: 10000,
      allMsg: false,
      removeAt: false,
      secret: '',
      markdown: {
        id: '',
        type: 0,
        text: 'text_start',
        img_dec: 'img_dec',
        img_url: 'img_url'
      },
      other: {
        Prefix: true,
        QQCloud: '',
        Tips: false,
        'Tips-GroupId': ''
      }
    }

    const msg = this.e.msg.replace(/^#QQ(群|Bot|频道)?设置/i, '').trim().replace(/：/g, ':').split(':')
    const cfg = new YAML(lain._pathCfg + '/Token.yaml')
    const QQSDK = (await import('../adapter/QQBot/QQSDK.js')).default
    const QQBot = (await import('../adapter/QQBot/index.js')).default
    const QQGuild = (await import('../adapter/QQBot/QQGuild.js')).default

    /** 最低要求 */
    if (msg.length < 4) return await this.reply('格式错误', true, { at: true })
    /** 判断开发者id */
    if (msg[2].length != 9) return await this.reply('appid输入错误!', true, { at: true })

    /** 看下是否配置已存在 */
    if (cfg.value('QQ_Token', msg[2])) {
      cfg.delVal('QQ_Token', msg[2])
      return await this.reply('删除成功~请重启 Miao-Yunzai 生效~', true, { at: true })
    } else {
      /** 不存在加一下配置 */
      config.sandbox = msg[0] == 1
      config.allMsg = msg[1] == 1
      config.appid = String(msg[2])
      config.token = msg[3]
      if (msg[4]) config.secret = msg[4]

      /** 获取模式 */
      if (/#QQ频道设置/i.test(this.e.msg)) {
        config.type = 1
      } else if (/#QQ群设置/i.test(this.e.msg)) {
        config.type = 2
      } else {
        config.type = 0
      }
      cfg.addVal('QQ_Token', { [config.appid]: config }, 'object')
    }

    try {
      await this.reply('正在建立连接，请稍等~', true, { at: true })
      const SDK = new QQSDK(config)
      await SDK.start()
      switch (config.type) {
        case 0:
          /** 同时接群和频道 */
          try {
            const QQB = new QQBot(SDK.sdk, true)
            await this.reply(await QQB.StartBot())
            await common.sleep(5000)
            return await this.reply(await new QQGuild(SDK.sdk, true).StartBot())
          } catch {
            return await this.reply('连接失败，请查看控制台日志')
          }
        case 1:
          /** 开始连接QQ频道Bot */
          return await this.reply(await new QQGuild(SDK.sdk, true).StartBot())
        case 2:
          try {
            const bot = new QQBot(SDK.sdk, true)
            return await this.reply(await bot.StartBot())
          } catch {
            return await this.reply('连接失败，请查看控制台日志')
          }
        default:
      }
    } catch (error) {
      /** 异常处理 */
      return this.reply(error?.message || error)
    }
    return await this.reply('格式错误', true, { at: true })
  }

  /** QQ群、频道Bot账号列表 */
  async account () {
    let list = []
    if (this.e.isGroup) return await this.reply('请私聊查看', true, { at: true })
    let token = Object.values(Cfg.getToken('QQ_Token'))

    // if (!Array.isArray(token)) token = [token] // 感觉没啥必要。
    if (!token.length) return await this.reply('当前还没有绑定过账号~', true, { at: true })
    token.forEach(i => {
      switch (Number(i.type)) {
        case 0:
          list.push(`全量-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
        case 1:
          list.push(`QQ频道-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
        case 2:
          list.push(`QQ群-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
        default:
          list.push(`未启用-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
      }
    })

    //     token.forEach(i => {
    //       list.push(`
    // ${i.appid}:
    //   mode: 'websocket'
    //   type: ${i.type}
    //   appid: ${i.appid}
    //   sandbox: ${i.sandbox}
    //   timeout: ${i.timeout}
    //   allMsg: ${i.allMsg}
    //   token: ${i.token}
    //   secret: ${i.secret}
    //   markdown:
    //     id: ${i.markdown.id}
    //     type: ${i.markdown.type}
    //     text: ${i.markdown.text}
    //     img_dec: ${i.markdown.img_dec}
    //     img_url: ${i.markdown.img_url}
    //   other:
    //     Prefix: ${i.other.Prefix}
    //     QQCloud: ${i.other.QQCloud}
    //     Tips: ${i.other.Tips}
    //     Tips-GroupId: ${i.other['Tips-GroupId']}`)
    //     })

    return await this.reply(`QQ群、频道账号列表：\n${list.join('\n')}\n\n共 ${list.length} 个账号`)
  }

  /** 设置模板ID */
  async markdown () {
    if (!/\d{9}_\d{10}/.test(this.e.msg)) return await this.reply('格式错误，切换模板请使用[#QQ群md 0123]')
    let msg = this.e.msg.replace(/^#QQ(群|Bot|频道)设置(MD|markdown)/i, '').replace(/：/g, ':').trim().split(':')
    const cfg = new YAML(lain._pathCfg + '/Token.yaml')
    let val = cfg.get('QQ_Token')
    if (this.e?.adapter === 'QQBot') {
      if (msg.length == 1) {
        val[this.e.self_id].markdown.id = msg[0]
        if (val[this.e.self_id].markdown.type == 0) val[this.e.self_id].markdown.type = 1
        /** 保存 */
        cfg.set('QQ_Token', val)
      } else if (msg.length == 2) {
        val[msg[0]].markdown.id = msg[1]
        if (val[msg[0]].markdown.type == 0) val[msg[0]].markdown.type = 1
        /** 保存 */
        cfg.set('QQ_Token', val)
      } else {
        return await this.reply('格式错误!', true, { at: true })
      }
    } else {
      if (msg.length != 2) return await this.reply('格式错误!', true, { at: true })
      if (cfg.value('QQ_Token', msg[0])) {
        val[msg[0]].markdown.id = msg[1]
        if (val[msg[0]].markdown.type == 0) val[msg[0]].markdown.type = 1
        /** 保存 */
        cfg.set('QQ_Token', val)
      } else {
        return await this.reply('不存在此appid对应的bot!', true, { at: true })
      }
    }
    return await this.reply('修改成功~', true, { at: true })
  }

  /** 切换模板ID */
  async type () {
    let msg = this.e.msg.replace(/^#QQ(群|Bot|频道)(MD|markdown)/i, '').replace(/：/g, ':').trim().split(':')
    const cfg = new YAML(lain._pathCfg + '/Token.yaml')
    let val = cfg.get('QQ_Token')
    if (this.e?.adapter === 'QQBot') {
      if (msg.length == 1) {
        val[this.e.self_id].markdown.type = Number(msg[0])
        /** 保存 */
        cfg.set('QQ_Token', val)
      } else if (msg.length == 2) {
        val[msg[0]].markdown.type = Number(msg[1])
        /** 保存 */
        cfg.set('QQ_Token', val)
      } else {
        return await this.reply('格式错误!', true, { at: true })
      }
    } else {
      if (msg.length != 2) return await this.reply('格式错误!', true, { at: true })
      if (cfg.value('QQ_Token', msg[0])) {
        val[msg[0]].markdown.type = Number(msg[1])
        /** 保存 */
        cfg.set('QQ_Token', val)
      } else {
        return await this.reply('不存在此appid对应的bot!', true, { at: true })
      }
    }
    return await this.reply('修改成功~', true, { at: true })
  }

  /** 其他 */
  async other () {
    const msg = this.e.msg.replace(/^#QQ(群|Bot|频道)设置(QQ图床|前缀|防倒卖(群号)?)/i, '').replace(/：/g, ':').trim().split(':')
    const cfg = new YAML(lain._pathCfg + '/Token.yaml')
    if (msg.length != 1 && msg.length != 2) return await this.reply('格式错误!', true, { at: true })

    let self_id
    if (msg.length == 2) {
      self_id = msg[0]
    } else {
      if (this.e?.adapter === 'QQBot') self_id = this.e.self_id
      else return await this.reply('格式错误!', true, { at: true })
    }
    if (cfg.value('QQ_Token', self_id)) {
      let val = cfg.get('QQ_Token')
      if (this.e.msg.includes('图床')) {
        val[self_id].other.QQCloud = Number(msg[1] || msg[0])
      } else if (this.e.msg.includes('前缀')) {
        val[self_id].other.Prefix = (msg[1] || msg[0]) === '开启'
      } else if (this.e.msg.includes('防倒卖群号')) {
        val[self_id].other.Tips = Number(msg[1] || msg[0]) || String(msg[1] || msg[0])
      } else if (this.e.msg.includes('防倒卖')) {
        val[self_id].other['Tips-GroupId'] = Number(msg[1] || msg[0]) || String(msg[1] || msg[0])
      }
      await this.reply(`bot(${self_id}):修改配置文件`, true, { at: true })
      /** 保存 */
      cfg.set('QQ_Token', val)
      /** 渲染 */
    } else {
      return await this.reply('不存在此appid对应的bot!', true, { at: true })
    }
  }
}
