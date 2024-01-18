import crypto from 'crypto'
import Yaml from '../model/YamlHandler.js'

/** 设置主人 */
let sign = {}

export class LainMaster extends plugin {
  constructor () {
    super({
      name: '铃音-设置主人',
      priority: -50,
      rule: [
        {
          reg: /^#设置主人.*/,
          fnc: 'master'
        },
        {
          reg: /^#(删除|取消)主人.*/,
          fnc: 'del_master',
          permission: 'master'
        },
        {
          reg: /^#(禁用|启用|恢复)主人$/,
          fnc: 'off_master'
        }
      ]
    })
  }

  async master (e) {
    let user_id = e.at || e.msg.replace(/#设置主人/, '') || e.user_id
    user_id = Number(user_id) || String(user_id)

    /** 检测是否为触发用户自身 */
    if (user_id === e.user_id) {
      if (e.isMaster) {
        return await e.reply([segment.at(user_id), "已经是主人了哦(〃'▽'〃)"])
      }
    } else {
      /** 如果不是触发用户自身，检测触发用户是否为主人 */
      if (!e.isMaster) return await e.reply('只有主人才能命令我哦~\n(*/ω＼*)')
      const cfg = new Yaml('./config/config/other.yaml')
      /** 检查指定用户是否已经是主人 */
      if (cfg.value('masterQQ', user_id)) return e.reply([segment.at(user_id), "已经是主人了哦(〃'▽'〃)"])
      return await this.e.reply(this.addmaster(user_id))
    }

    /** 生成验证码 */
    sign[e.user_id] = { user_id, sign: crypto.randomUUID() }
    logger.mark(`设置主人验证码：${logger.green(sign[e.user_id].sign)}`)
    await e.reply([segment.at(e.user_id), '请输入控制台的验证码'])
    /** 开始上下文 */
    return await this.setContext('SetAdmin')
  }

  async del_master (e) {
    let user_id = e.at || e.msg.replace(/#|删除|取消|主人/g, '')
    user_id = Number(user_id) || String(user_id)

    if (!user_id) return await e.reply('你都没有告诉我是谁！^_^')
    const cfg = new Yaml('./config/config/other.yaml')
    if (!cfg.value('masterQQ', user_id)) return await e.reply("这个人不是主人啦(〃'▽'〃)", false, { at: true })
    cfg.delVal('masterQQ', user_id)
    return await e.reply([segment.at(user_id), '拜拜~'])
  }

  async off_master (e) {
    let user_id = Number(e.user_id) || e.user_id
    if (/禁用/.test(e.msg)) {
      /** 检测用户是否是主人 */
      if (!e.isMaster) return e.reply([segment.at(e.user_id), '只有主人才能命令我哦~\n(*/ω＼*)'])
      const cfg = new Yaml('./config/config/other.yaml')
      cfg.addVal('masterQQ', '--' + String(user_id), 'Array')
      cfg.delVal('masterQQ', user_id)
      return await e.reply([segment.at(user_id), '已临时禁用你的主人权限！\n如需恢复发送 #启用主人'])
    } else {
      /** 检测用户是否是主人 */
      if (e.isMaster) return e.reply([segment.at(e.user_id), "已经是主人了哦(〃'▽'〃)"])
      const cfg = new Yaml('./config/config/other.yaml')
      if (!cfg.value('masterQQ', '--' + String(user_id))) return e.reply([segment.at(user_id), '只有主人才能命令我哦~\n(*/ω＼*)'])
      cfg.addVal('masterQQ', user_id, 'Array')
      cfg.delVal('masterQQ', '--' + String(user_id), 'Array')
      return await e.reply([segment.at(user_id), '已恢复你的主人权限~(*/ω＼*)'])
    }
  }

  SetAdmin () {
    /** 结束上下文 */
    this.finish('SetAdmin')
    /** 判断验证码是否正确 */
    if (this.e.msg.trim() === sign[this.e.user_id]?.sign) {
      this.e.reply(this.addmaster(sign[this.e.user_id]?.user_id))
    } else {
      return this.reply([segment.at(this.e.user_id), '验证码错误'])
    }
  }

  /** 设置主人 */
  addmaster (user_id) {
    const cfg = new Yaml('./config/config/other.yaml')
    cfg.addVal('masterQQ', user_id, 'Array')
    return [segment.at(user_id), '新主人好~(*/ω＼*)']
  }
}
