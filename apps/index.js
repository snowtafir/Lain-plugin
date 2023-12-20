import fs from 'fs'
import yaml from '../model/yaml.js'
import { execSync } from 'child_process'
import { update } from '../../other/update.js'
import { xiaofei_music } from '../adapter/shamrock/xiaofei/music.js'
import { xiaofei_weather } from '../adapter/shamrock/xiaofei/weather.js'

export class Lain extends plugin {
  constructor () {
    super({
      name: '铃音基本设置',
      priority: -50,
      rule: [
        {
          reg: /^#QQ频道设置.+$/gi,
          fnc: 'QQGuildCfg',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|群机器人|机器人)设置.+$/gi,
          fnc: 'QQBot',
          permission: 'master'
        },
        {
          reg: /^#QQ频道账号$/gi,
          fnc: 'QQGuildAccount',
          permission: 'master'
        },
        {
          reg: /^#(Lain|铃音)(强制)?更新(日志)?$/gi,
          fnc: 'update',
          permission: 'master'
        },
        {
          reg: /^#(我的|当前)?(id|信息)$/gi,
          fnc: 'user_id'
        },
        {
          reg: /^#微信修改名称.+/,
          fnc: 'ComName',
          permission: 'master'
        },
        {
          reg: /^#(重载|重新加载)资源/,
          fnc: 'loadRes',
          permission: 'master'
        }
      ]
    })
  }

  async QQGuildCfg (e) {
    const cfg = new yaml(Bot.lain._path + '/config.yaml')
    if (e.msg.includes('分片转发')) {
      e.msg.includes('开启') ? cfg.set('forwar', true) : cfg.set('forwar', false)
      const msg = `分片转发已${cfg.get('forwar') ? '开启' : '关闭'}`
      return await e.reply(msg, true, { at: true })
    } else {
      const msg = async (e) => {
        const cmd = e.msg.replace(/^#QQ频道设置/gi, '').replace(/：/g, ':').trim().split(':')
        if (!/^1\d{8}$/.test(cmd[2])) return 'appID 错误！'
        if (!/^[0-9a-zA-Z]{32}$/.test(cmd[3])) return 'token 错误！'

        let bot
        const cfg = new yaml(Bot.lain._path + '/bot.yaml')
        /** 重复的appID，删除 */
        if (cfg.hasIn(cmd[2])) {
          cfg.del(cmd[2])
          return `Bot：${Bot?.[cmd[2]]?.nickname}${cmd[2]} 删除成功...重启后生效...`
        } else {
          bot = { appID: cmd[2], token: cmd[3], sandbox: cmd[0] === '1', allMsg: cmd[1] === '1' }
        }

        /** 保存新配置 */
        cfg.addIn(cmd[2], bot)
        try {
          const Guild = (await import('../adapter/QQGuild/index.js')).default
          await (new Guild(bot)).monitor()
          return `Bot：${Bot?.[cmd[2]]?.nickname}(${cmd[2]}) 已连接...`
        } catch (err) {
          return err
        }
      }
      return await e.reply(await msg(e))
    }
  }

  async QQBot (e) {
    const msg = async (e) => {
      const cmd = e.msg.replace(/^#QQ(群|群机器人|机器人)设置/gi, '').replace(/：/g, ':').trim().split(':')
      if (cmd.length !== 6) return '格式错误...'
      let bot
      const cfg = new yaml(Bot.lain._path + '/QQBot.yaml')
      /** 重复的appID，删除 */
      if (cfg.hasIn(cmd[3])) {
        cfg.del(cmd[3])
        return `QQBot：${cmd[3]} 删除成功...重启后生效...`
      } else {
        // 沙盒:私域:移除at:appID:appToken:secret 是=1 否=0
        bot = { appid: cmd[3], token: cmd[4], sandbox: cmd[0] === '1', allMsg: cmd[1] === '1', removeAt: cmd[2] === '1', secret: cmd[5] }
      }

      /** 保存新配置 */
      cfg.addIn(cmd[3], bot)
      try {
        const StartQQBot = (await import('../adapter/QQBot/index.js')).default
        await new StartQQBot(bot)
        return `QQBot：${cmd[3]} 已连接...`
      } catch (err) {
        return err
      }
    }
    return await e.reply(await msg(e))
  }

  async QQGuildAccount (e) {
    let cfg, msg, config
    msg = []
    if (e.sub_type !== 'friend') {return await e.reply('请私聊查看')}
    else {
      cfg = new yaml(Bot.lain._path + '/bot.yaml')
      config = cfg.data()
      for (const i in config) {
        if (i === 'default') continue
        cfg = [
          config[i].sandbox ? 1 : 0,
          config[i].allMsg ? 1 : 0,
          config[i].appID,
          config[i].token
        ]
        msg.push(`#QQ频道设置${cfg.join(':')}`)
      }
      cfg = new yaml(Bot.lain._path + '/QQbot.yaml')
      config = cfg.data()
      for (const i in config) {
        if (i === 'ndefault') continue
        cfg = [
          config[i].sandbox ? 1 : 0,
          config[i].allMsg ? 1 : 0,
          config[i].removeAt ? 1 : 0,
          config[i].appid,
          config[i].token,
          config[i].secret
        ]
        msg.push(`#QQ群设置${cfg.join(':')}`)
      }
      return await e.reply(`共${msg.length}个账号：\n${msg.join('\n')}`)
    }
  }

  async update (e) {
    let new_update = new update()
    new_update.e = e
    new_update.reply = this.reply
    const name = 'Lain-plugin'
    if (e.msg.includes('更新日志')) {
      if (new_update.getPlugin(name)) {
        this.e.reply(await new_update.getLog(name))
      }
    } else {
      if (new_update.getPlugin(name)) {
        if (this.e.msg.includes('强制')) { execSync('git reset --hard', { cwd: `${process.cwd()}/plugins/${name}/` }) }
        await new_update.runUpdate(name)
        if (new_update.isUp) { setTimeout(() => new_update.restart(), 2000) }
      }
    }
    return true
  }

  async user_id (e) {
    const msg = []
    if (e.isMaster) msg.push(`Bot：${e.self_id}`)
    msg.push(`您的个人ID：${e.user_id}`)
    e.guild_id ? msg.push(`当前频道ID：${e.guild_id}`) : ''
    e.channel_id ? msg.push(`当前子频道ID：${e.channel_id}`) : ''
    e.group_id ? msg.push(`当前群聊ID：${e.group_id}`) : ''
    if (e.isMaster && e?.adapter === 'QQGuild') msg.push('\n温馨提示：\n使用本体黑白名单请使用「群聊ID」\n使用插件黑白名单请按照配置文件说明进行添加~')

    /** at用户 */
    if (e.isMaster && e.at) msg.push(`\n目标用户ID：${e.at}`)
    return await e.reply(`\n${msg.join('\n')}`, true, { at: true })
  }

  /** 微信椰奶状态自定义名称 */
  async ComName (e) {
    const msg = e.msg.replace('#微信修改名称', '').trim()
    const cfg = new yaml(Bot.lain._path + '/config.yaml')
    cfg.set('name', msg)
    Bot[Bot.lain.wc.uin].nickname = msg
    return await e.reply(`修改成功，新名称为：${msg}`, false, { at: true })
  }

  /** shamrock重载资源 */
  async loadRes (e) {
    await e.reply('开始重载，请稍等...', true)
    let res = (await import('../adapter/shamrock/bot.js')).default
    res = new res(e.self_id)
    const msg = await res.LoadList()
    return await e.reply(msg, true)
  }
}

/** 还是修改一下，不然cvs这边没法用...  */
if (!fs.existsSync('./plugins/ws-plugin/model/dlc/index.js') &&
  !fs.existsSync('./plugins/ws-plugin/model/red/index.js')) {
  const getGroupMemberInfo = Bot.getGroupMemberInfo
  Bot.getGroupMemberInfo = async function (group_id, user_id) {
    try {
      return await getGroupMemberInfo.call(this, group_id, user_id)
    } catch (error) {
      let nickname
      error?.stack?.includes('ws-plugin') ? nickname = 'chronocat' : nickname = 'Yunzai-Bot'
      return {
        group_id,
        user_id,
        nickname,
        card: nickname,
        sex: 'female',
        age: 6,
        join_time: '',
        last_sent_time: '',
        level: 1,
        role: 'member',
        title: '',
        title_expire_time: '',
        shutup_time: 0,
        update_time: '',
        area: '南极洲',
        rank: '潜水'
      }
    }
  }
}

try {
  /** 兼容原版椰奶点赞 */
  const QQApi = (await import('../../yenai-plugin/model/api/QQApi.js')).default
  QQApi.prototype.thumbUp = async function (uid, times = 1) {
    if (this.e?.adapter && this.e?.adapter == 'shamrock') {
      // 劫持为shamrock点赞
      let target = (this.e.at && this.e.msg.includes('他', '她', '它', 'TA', 'ta', 'Ta')) ? this.e.at : this.e.user_id
      let lock = await redis.get(`lain:thumbup:${this.e.self_id}_${target}`)
      // shamrock不管点没点上一律返回ok。。只好自己伪造了，不然椰奶会死循环，暂不考虑svip的情况。
      try {
        const Api = (await import('../../Lain-plugin/adapter/shamrock/api.js')).default
        await Api.send_like(this.e.self_id, uid, times)
      } catch (err) {
        logger.error(err)
        return { code: 1, msg: 'Shamrock点赞失败，请查看日志' }
      }
      if (lock) {
        // 今天点过了
        return { code: 2, msg: '今天已经赞过了，还搁这讨赞呢！！！' }
      } else {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const secondsUntilMidnight = Math.floor((tomorrow - now) / 1000)
        await redis.set(`lain:thumbup:${this.e.self_id}_${target}`, '1', { EX: secondsUntilMidnight })
        lock = true
        return { code: 0, msg: '点赞成功' }
      }
    }
    let core = this.Bot.core
    if (!core) {
      try {
        core = (await import('icqq')).core
      } catch (error) {
        throw Error('非icqq无法进行点赞')
      }
    }
    if (times > 20) { times = 20 }
    let ReqFavorite
    if (this.Bot.fl.get(uid)) {
      ReqFavorite = core.jce.encodeStruct([
        core.jce.encodeNested([
          this.Bot.uin, 1, this.Bot.sig.seq + 1, 1, 0, Buffer.from('0C180001060131160131', 'hex')
        ]),
        uid, 0, 1, Number(times)
      ])
    } else {
      ReqFavorite = core.jce.encodeStruct([
        core.jce.encodeNested([
          this.Bot.uin, 1, this.Bot.sig.seq + 1, 1, 0, Buffer.from('0C180001060131160135', 'hex')
        ]),
        uid, 0, 5, Number(times)
      ])
    }
    const body = core.jce.encodeWrapper({ ReqFavorite }, 'VisitorSvc', 'ReqFavorite', this.Bot.sig.seq + 1)
    const payload = await this.Bot.sendUni('VisitorSvc.ReqFavorite', body)
    let result = core.jce.decodeWrapper(payload)[0]
    return { code: result[3], msg: result[4] }
  }
} catch { }

export { xiaofei_music, xiaofei_weather }
