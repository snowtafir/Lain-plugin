import { exec } from 'child_process'
import fs from 'fs'
import sizeOf from 'image-size'
import lodash from 'lodash'
import path from 'path'
import moment from 'moment'
import { encode as encodeSilk, isSilk } from 'silk-wasm'
import Yaml from 'yaml'
import { fileTypeFromBuffer } from 'file-type'
import MiaoCfg from '../../../../lib/config/config.js'
import common from '../../lib/common/common.js'
import Cfg from '../../lib/config/config.js'
import Buttons from './plugins.js'

lain.DAU = {}

export default class adapterQQBot {
  /** 传入基本配置 */
  constructor (sdk, start = false) {
    /** 开发者id */
    this.id = String(sdk.config.appid)
    /** sdk */
    this.sdk = sdk
    /** 基本配置 */
    this.config = sdk.config
    /** 监听事件 */
    if (!start) return this.StartBot()
  }

  async StartBot () {
    /** 保存id到adapter */
    if (!Bot.adapter.includes(String(this.id))) Bot.adapter.push(String(this.id))
    else return `QQBot：<${Bot[this.id].nickname}(${this.id})> 连接重复!`

    /** 群消息 */
    this.sdk.on('message.group', async (data) => {
      Bot.emit('message', await this.message(data, true))
    })
    /** 私聊消息 */
    this.sdk.on('message.private.friend', async (data) => {
      Bot.emit('message', await this.message(data))
    })
    /** 群通知消息 */
    this.sdk.on('notice.group', async (data) => {
      await this.notice(data, true)
    })
    /** 私聊通知消息 */
    this.sdk.on('notice.friend', async (data) => {
      await this.notice(data)
    })

    // 有点怪 先简单处理下
    let id = this.id; let avatar; let username = 'QQBot'
    try {
      const info = await this.sdk.getSelfInfo()
      id = info.id
      avatar = info.avatar
      username = info.username
    } catch {
      avatar = 'https://cdn.jsdelivr.net/gh/Zyy955/imgs/img/202402020757587.gif'
      let txurl = `${process.cwd()}/resources/Avatar/`
      if (fs.existsSync(txurl)) {
        let tx_img = []
        for (let txlb of fs.readdirSync(txurl)) {
          if (txlb.includes('.')) {
            tx_img.push(txurl + txlb)
          }
        }
        if (tx_img.length > 0) {
          avatar = tx_img[Math.floor(Math.random() * tx_img.length)]
        }
      }
    }

    Bot[this.id] = {
      sdk: this.sdk,
      config: this.config,
      bkn: 0,
      avatar,
      adapter: 'QQBot',
      uin: this.id,
      tiny_id: id,
      fl: new Map(),
      gl: new Map(),
      tl: new Map(),
      gml: new Map(),
      guilds: new Map(),
      nickname: username,
      stat: { start_time: parseInt(Date.now() / 1000), recv_msg_cnt: 0 },
      apk: Bot.lain.adapter.QQBot.apk,
      version: Bot.lain.adapter.QQBot.version,
      getFriendMap: () => Bot[this.id].fl,
      getGroupList: () => Bot[this.id].gl,
      getGuildList: () => Bot[this.id].tl,
      readMsg: async () => common.recvMsg(this.id, 'QQBot', true),
      MsgTotal: async (type) => common.MsgTotal(this.id, 'QQBot', type, true),
      pickGroup: (group_id) => this.pickGroup(group_id),
      pickMember: (group_id, user_id) => this.pickMember(group_id, user_id),
      pickUser: (user_id) => this.pickFriend(user_id),
      pickFriend: (user_id) => this.pickFriend(user_id),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getGroupMemberInfo: (group_id, user_id) => Bot.getGroupMemberInfo(group_id, user_id)
    }

    /** 加载缓存中的群列表 */
    this.gmlList('gl')
    /** 加载缓存中的好友列表 */
    this.gmlList('fl')

    /** 初始化dau统计 */
    if (Cfg.Other.QQBotdau) lain.DAU[this.id] = await this.getDAU()
    /** 重启 */
    await common.init('Lain:restart:QQBot')
    return `QQBot：<${username}(${this.id})> 连接成功!`
  }

  /** 加载缓存中的群、好友列表 */
  async gmlList (type = 'gl') {
    try {
      const List = await redis.keys(`lain:${type}:${this.id}:*`)
      List.forEach(async i => {
        const info = JSON.parse(await redis.get(i))
        info.uin = this.id
        lain.debug(this.id, '<读取缓存群，好友列表>', type, info)
        if (type === 'gl') {
          Bot[this.id].gl.set(info.group_id, info)
          Bot.gl.set(info.group_id, info)
        } else {
          Bot[this.id].fl.set(info.user_id, info)
          Bot.fl.set(info.user_id, info)
        }
      })
    } catch (err) {
      lain.warn(this.id, err)
    }
  }

  /** 群对象 */
  pickGroup (group_id) {
    return {
      is_admin: false,
      is_owner: false,
      recallMsg: async (msg_id) => await this.recallGroupMsg(group_id, msg_id),
      sendMsg: async (msg) => await this.sendGroupMsg(group_id, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      pickMember: (user_id) => this.pickMember(group_id, user_id),
      /** 戳一戳 */
      pokeMember: async (operatorId) => '',
      /** 禁言 */
      muteMember: async (group_id, user_id, time) => Promise.reject(new Error('QQBot未支持')),
      /** 全体禁言 */
      muteAll: async (type) => Promise.reject(new Error('QQBot未支持')),
      getMemberMap: async () => Promise.reject(new Error('QQBot未支持')),
      /** 退群 */
      quit: async () => Promise.reject(new Error('QQBot未支持')),
      /** 设置管理 */
      setAdmin: async (qq, type) => Promise.reject(new Error('QQBot未支持')),
      /** 踢 */
      kickMember: async (qq, rejectAddRequest = false) => Promise.reject(new Error('QQBot未支持')),
      /** 头衔 **/
      setTitle: async (qq, title, duration) => Promise.reject(new Error('QQBot未支持')),
      /** 修改群名片 **/
      setCard: async (qq, card) => Promise.reject(new Error('QQBot未支持'))
    }
  }

  /** 好友对象 */
  pickFriend (user_id) {
    return {
      sendMsg: async (msg) => await this.sendFriendMsg(user_id, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      getAvatarUrl: (size = 0) => this.getAvatarUrl(size, user_id)
    }
  }

  pickMember (group_id, user_id) {
    let member = this.member(group_id, user_id)
    return {
      member,
      info: member.info,
      renew: () => member,
      getAvatarUrl: (size = 0) => this.getAvatarUrl(size, user_id),
      ...member,
      ...member.info
    }
  }

  member (group_id, user_id) {
    const member = {
      info: {
        group_id,
        user_id,
        nickname: '',
        card: '',
        last_sent_time: parseInt(Date.now() / 1000)
      },
      group_id,
      user_id,
      nickname: '',
      card: '',
      last_sent_time: parseInt(Date.now() / 1000),
      is_admin: false,
      is_owner: false,
      /** 获取头像 */
      getAvatarUrl: (size = 0) => this.getAvatarUrl(size, user_id),
      mute: (time) => ''
    }
    return member
  }

  getAvatarUrl (size = 0, id) {
    return Number(id) ? `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${id}` : `https://q.qlogo.cn/qqapp/${this.id}/${id}/${size}`
  }

  async recallGroupMsg (group_id, message_id) {
    return await this.sdk.recallGroupMessage(group_id, message_id)
  }

  /** 转换通知消息格式 */
  async notice (data, isGroup) {
    /** 调试日志 */
    let { self_id: tinyId, ...e } = data
    e._bot = data.bot
    delete data.bot
    lain.debug(this.id, '<收到通知>', JSON.stringify(data))

    return e
  }

  /** 转换格式给云崽处理 */
  async message (data, isGroup) {
    /** 调试日志 */
    lain.debug(this.id, '<收到消息>', JSON.stringify(data))

    let { self_id: tinyId, ...e } = data
    e.data = data
    e.bot = Bot[this.id]
    e.uin = this.id // ???鬼知道哪来的这玩意，icqq都没有...
    e.tiny_id = tinyId
    e.time = data.timestamp
    e.self_id = this.id
    e.sendMsg = data.reply
    e.raw_message = e.raw_message.trim()
    e.atBot = true
    e.atme = true

    lain.info(this.id, `${isGroup ? `<群:${e.group_id}>` : ''}<用户:${e.user_id}> -> ${this.messageLog(e.message)}`)

    /** 处理前缀 */
    let raw_message = e.raw_message
    if (e.group_id && raw_message) {
      raw_message = this.hasAlias(raw_message, e, false)
      raw_message = raw_message.replace(/^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/, '#星铁')
    }

    if (Bot[this.id].config.other.Prefix) {
      e.message.some(msg => {
        if (msg.type === 'text') {
          msg.text = this.hasAlias(msg.text, e)
          return true
        }
        return false
      })
    }

    /** 构建快速回复消息 */
    e.reply = async (msg, quote) => await this.sendReplyMsg(e, msg, quote)
    /** 快速撤回 */
    e.recall = async () => await this.recallGroupMsg(data.group_id, data.message_id)
    /** 将收到的消息转为字符串 */
    e.toString = () => e.raw_message
    /** 获取对应用户头像 */
    e.getAvatarUrl = (size = 0) => this.getAvatarUrl(size, data.user_id)

    /** 构建场景对应的方法 */
    if (isGroup) {
      try {
        Bot[this.id].gl.set(e.group_id, { group_id: e.group_id, group_name: '', uin: this.id })
        Bot.gl.set(e.group_id, { group_id: e.group_id, group_name: '', uin: this.id })
        /** 缓存群列表 */
        if (!await redis.get(`lain:gl:${this.id}:${e.group_id}`)) redis.set(`lain:gl:${this.id}:${e.group_id}`, JSON.stringify({ group_id: e.group_id, group_name: '', uin: this.id }))
        /** 防倒卖崽 */
        let tips = Cfg.getToken('QQ_Token', this.id).other
        lain.debug(this.id, '<获取配置>', Cfg.getToken('QQ_Token', this.id))
        if (tips.Tips) await this.QQBotTips(data, e.group_id, tips)
      } catch { }

      e.member = this.member(e.group_id, e.user_id)
      e.group_name = `${this.id}-${e.group_id}`
      e.group = this.pickGroup(e.group_id)
    } else {
      e.friend = this.pickFriend(e.user_id)
    }

    /** 添加适配器标识 */
    e.adapter = 'QQBot'
    e.sender.nickname = e.sender.user_id || `${this.id}-${e.user_id}`

    /** 缓存好友列表 */
    Bot[this.id].fl.set(e.user_id, { user_id: e.user_id, card: e.sender.nickname, nickname: e.sender.nickname, uin: this.id })
    Bot.fl.set(e.user_id, { user_id: e.user_id, card: e.sender.nickname, nickname: e.sender.nickname, uin: this.id })
    if (!await redis.get(`lain:fl:${this.id}:${e.user_id}`)) redis.set(`lain:fl:${this.id}:${e.user_id}`, JSON.stringify({ user_id: e.user_id, card: e.sender.nickname, nickname: e.sender.nickname, uin: this.id }))

    /** 保存消息次数 */
    try { common.recvMsg(this.id, e.adapter) } catch { }
    /** dau统计 */
    this.msg_count(data)
    return e
  }

  /** 前缀处理 */
  hasAlias (text, e, hasAlias = true) {
    text = text.trim()
    if (Bot[this.id].config.other.Prefix && text.startsWith('/')) {
      return text.replace(/^\s*\/\s*/, '#')
    }
    /** 兼容前缀 */
    let groupCfg = MiaoCfg.getGroup(e.group_id)
    let alias = groupCfg.botAlias
    if (!Array.isArray(alias)) {
      alias = [alias]
    }
    for (let name of alias) {
      if (text.startsWith(name)) {
        /** 先去掉前缀 再 / => # */
        text = lodash.trimStart(text, name)
        if (Bot[this.id].config.other.Prefix) text = text.replace(/^\s*\/\s*/, '#')
        if (hasAlias) return name + text
        return text
      }
    }
    return text
  }

  /** 日志 */
  messageLog (message) {
    const logMessage = []
    message.forEach(i => {
      switch (i.type) {
        case 'image':
          logMessage.push(`<图片:${i.url}>`)
          break
        case 'face':
          logMessage.push(`<face:${i.id}>`)
          break
        case 'text':
          logMessage.push(i.text)
          break
        case 'file':
          logMessage.push(`<文件:${i.url}>`)
          break
        case 'video':
          logMessage.push(`<视频:${i.url}>`)
          break
        default:
          logMessage.push(JSON.stringify(i))
      }
    })
    return logMessage.join('')
  }

  /** 小兔崽子 */
  async QQBotTips (data, group_id, tips) {
    /** 首次进群后，推送防司马崽声明~ */
    if (!await redis.get(`lain:QQBot:tips:${group_id}`)) {
      const msg = []
      const name = `「${Bot[this.id].nickname}」`
      msg.push('\n温馨提示：')
      msg.push(`感谢使用${name}，本Bot完全开源免费~\n`)
      msg.push('请各位尊重Yunzai本体及其插件开发者们的努力~')
      msg.push('如果本Bot是付费入群,请立刻退款举报！！！\n')
      msg.push('来自：Lain-plugin防倒卖崽提示，本提示仅在首次入群后触发~')
      if (tips['Tips-GroupId']) msg.push(`\n如有疑问，请添加${name}官方群: ${tips['Tips-GroupId']}~`)
      await data.reply(msg.join('\n'))
      await redis.set(`lain:QQBot:tips:${group_id}`, JSON.stringify({ group_id }))
    }
  }

  /** ffmpeg转码 转为pcm */
  async runFfmpeg (input, output) {
    let cm
    let ret = await new Promise((resolve, reject) => exec('ffmpeg -version', { windowsHide: true }, (error, stdout, stderr) => resolve({ error, stdout, stderr })))
    return new Promise((resolve, reject) => {
      if (ret.stdout) {
        cm = 'ffmpeg'
      } else {
        const cfg = Yaml.parse(fs.readFileSync('./config/config/bot.yaml', 'utf8'))
        cm = cfg.ffmpeg_path ? `"${cfg.ffmpeg_path}"` : null
      }

      if (!cm) {
        throw new Error('未检测到 ffmpeg ，无法进行转码，请正确配置环境变量或手动前往 bot.yaml 进行配置')
      }

      // ${cm} -i "${input}" -f s16le -ar 48000 -ac 1 "${output}"
      // `${cm} -y -i "${input}" -f s16le -ar 24000 -ac 1 -fs 31457280 "${output}"`
      exec(`${cm} -i "${input}" -f s16le -ar 48000 -ac 1 "${output}"`, async (error, stdout, stderr) => {
        if (error) {
          lain.error('Lain-plugin', '执行错误: \n', error)
          reject(error)
          return
        }
        resolve()
      })
    })
  }

  /** 转换message */
  async getQQBot (data, e) {
    data = common.array(data)
    let reply
    let button = []
    const text = []
    const image = []
    const message = []
    const Pieces = []
    let normalMsg = []

    for (let i of data) {
      switch (i.type) {
        case 'text':
        case 'forward':
          if (String(i.text).trim()) {
            if (i.type === 'forward') {
              lain.debug(this.id, '<解析转发消息>', i)
              for (let i2 of i.text) {
                if (i2?.type == 'image') image.push(await this.getImage(i2.file, e))
                else if (i2?.type == 'button') button.push(i2)
                else if (String(i2).trim()) {
                  /** 模板1、4使用按钮替换连接 */
                  if (Bot[this.id].config.markdown.type == 1 || Bot[this.id].config.markdown.type == 4) {
                    for (let p of (this.HandleURL(i2))) {
                      p.type === 'button' ? button.push(p) : text.push(p.text)
                    }
                  } else {
                    for (let p of (await Bot.HandleURL(i2))) {
                      p.type === 'image' ? image.push(await this.getImage(p.file, e)) : text.push(p.text)
                    }
                  }
                }
              }
              break
            }

            /** 禁止用户从文本键入@全体成员 */
            i.text = String(i.text).replace('@everyone', 'everyone')
            /** 模板1、4使用按钮替换连接 */
            if (Bot[this.id].config.markdown.type == 1 || Bot[this.id].config.markdown.type == 4) {
              for (let p of (this.HandleURL(i.text.trim()))) {
                p.type === 'button' ? button.push(p) : text.push(p.text)
              }
            } else {
              for (let p of (await Bot.HandleURL(i.text.trim()))) {
                p.type === 'image' ? image.push(await this.getImage(p.file, e)) : text.push(p.text)
              }
            }
          }
          break
        case 'at':
          if (Bot[this.id].config.markdown.type) {
            if ((i.qq || i.id) === 'all') {
              text.push('@everyone')
            } else {
              let qq

              if (Bot.QQToOpenid) {
                try {
                  qq = await Bot.QQToOpenid(i.qq || i.id, e)
                  text.push(`<@${qq}>`)
                  break
                } catch { }
              }

              qq = String(i.qq || i.id).trim().split('-')
              qq = qq[1] || qq[0]
              text.push(`<@${qq}>`)
            }
          }
          break
        case 'image':
          image.push(await this.getImage(i?.url || i.file, e))
          break
        case 'video':
          message.push(await this.getVideo(i?.url || i.file))
          break
        case 'record':
          message.push(await this.getAudio(i.file))
          break
        case 'reply':
          reply = i
          break
        case 'button':
          if (!i?.buttons || !i.buttons[0]?.action) {
            lain.warn(this.id, '按钮格式错误')
            lain.debug(this.id, JSON.stringify(i))
            break
          }
          button.push(i)
          break
        case 'ark':
        case 'markdown':
          if (i.type === 'markdown' && !(i?.content || i?.custom_template_id)) {
            lain.warn(this.id, 'Markdown格式错误')
            lain.debug(this.id, JSON.stringify(i))
            break
          }
          message.push(i)
          break
        default:
          message.push(i)
          break
      }
    }

    /** 消息次数 */
    if (text.length) try { common.MsgTotal(this.id, 'QQBot') } catch { }
    if (image.length) try { common.MsgTotal(this.id, 'QQBot', 'image') } catch { }

    /** 浅拷贝一次消息为普通消息，用于模板发送失败重发 */
    if (Bot[this.id].config.markdown.type) {
      /** 拷贝源消息 */
      const copyMessage = JSON.parse(JSON.stringify(message))
      const copyImage = JSON.parse(JSON.stringify(image))
      if (text.length) copyMessage.push({ type: 'text', text: text.join('\n') })
      if (copyImage.length) copyMessage.push(copyImage.shift())
      if (copyImage.length) normalMsg.push(...copyImage)
      if (button.length) copyMessage.push(...button)
      /** 合并为一个数组 */
      normalMsg = copyMessage.length ? [copyMessage, ...normalMsg] : normalMsg
    }

    switch (Bot[this.id].config.markdown.type) {
      /** 关闭 */
      case 0:
      case '0':
        if (text.length) message.push({ type: 'text', text: text.join('\n') })
        if (image.length) message.push(image.shift())
        if (image.length) Pieces.push(...image)
        break
      /** 全局，不发送原消息 */
      case 1:
      case '1':
        /** 返回数组，无需处理，直接发送即可 */
        if (image.length) {
          Pieces.push([...(await this.markdown(e, text.length ? [{ type: 'text', text: text.join('\n') }, image.shift()] : [image.shift()])), ...button])
          if (image.length) for (const img of image) Pieces.push([...(await this.markdown(e, [img])), ...button])
          button.length = 0
        } else if (text.length) {
          Pieces.push([...(await this.markdown(e, [{ type: 'text', text: text.join('\n') }])), ...button])
          button.length = 0
        }
        break
      /** 正则模式，遍历插件，按需替换发送 */
      case 2:
      case '2':
        try {
          /** 先走一遍按钮正则，匹配到按钮则修改为markdown */
          const button = await this.button(e)
          if (button && button?.length) {
            /** 返回数组，拆出来和按钮合并 */
            if (image.length) {
              Pieces.push([...await this.markdown(e, text.length ? [{ type: 'text', text: text.join('\n') }, image.shift()] : [image.shift()], false), ...button])
              if (image.length) for (const img of image) Pieces.push([...await this.markdown(e, [img], false), ...button])
            } else if (text.length) {
              Pieces.push([...await this.markdown(e, [{ type: 'text', text: text.join('\n') }], false), ...button])
            }
          } else {
            /** 返回数组，无需处理，直接发送即可 */
            if (text.length) message.push({ type: 'text', text: text.join('\n') })
            if (image.length) message.push(image.shift())
            if (image.length) Pieces.push(...image)
          }
        } catch (error) {
          lain.error(this.id, error)
        }
        break
      /** 原样发送并遍历插件，自动补发一条按钮模板消息 */
      case 3:
      case '3':
        if (text.length) message.push({ type: 'text', text: text.join('\n') })
        if (image.length) message.push(image.shift())
        if (image.length) Pieces.push(...image)
        /** 按钮模板 */
        try {
          const button = await this.button(e)
          if (button && button?.length) {
            const markdown = [
              {
                type: 'markdown',
                custom_template_id: Bot[this.id].config.markdown.id,
                params: [{ key: Bot[this.id].config.markdown.text || 'text_start', values: ['\u200B'] }]
              },
              ...button
            ]
            Pieces.push(markdown)
          }
        } catch (error) {
          lain.error(this.id, error)
        }
        break
      case 4:
      case '4':
        try {
          /** 返回数组，无需处理，直接发送即可 */
          if (image.length && text.length) {
            Pieces.push(...await Bot.Markdown(e, [{ type: 'text', text: text.join('\n') }, ...image], button))
            button.length = 0
          } else if (image.length) {
            Pieces.push(...await Bot.Markdown(e, image, button))
            button.length = 0
          } else if (text.length) {
            Pieces.push(...await Bot.Markdown(e, [{ type: 'text', text: text.join('\n') }], button))
            button.length = 0
          }
        } catch (_err) {
          lain.error(this.id, _err)
          if (text.length) message.push({ type: 'text', text: text.join('\n') })
          if (image.length) message.push(image.shift())
          if (image.length) Pieces.push(...image)
        }
        break
    }

    if (button.length) message.push(...button)

    /** 合并为一个数组 */
    return { Pieces: message.length ? [message, ...Pieces] : Pieces, reply, normalMsg }
  }

  /** 处理图片 */
  async getImage (file, e) {
    file = await Bot.FormatFile(file)

    /** 转换图片类型为jpg */
    // 动态导入
    const sharp = (await import('sharp')).default
    if (sharp) {
      let file2 = await Bot.Buffer(file)
      let filetype = await fileTypeFromBuffer(file2)
      lain.mark(this.id, '<原类型>', filetype)
      if (!['jpg', 'png', 'gif'].includes(filetype?.ext)) {
        file = await sharp(file2).jpeg({ quality: 100 }).toBuffer()
        lain.mark(this.id, '<转换后类型>', await fileTypeFromBuffer(file))
      }
    }
    file = await Bot.FormatFile(file)

    const type = 'image'
    if (Bot[this.id].config?.markdown.type == 0 || Bot[this.id].config?.markdown.type == 3 || (Bot[this.id].config?.markdown.type == 2 && !await this.button(e))) {
      return { type, file }
    }
    try {
      /** 自定义图床 */
      if (Bot?.imageToUrl) {
        const { width, height, url } = await Bot.imageToUrl(file)
        lain.mark('Lain-plugin', `使用自定义图床发送图片：${url}`)
        return { type, file: url, width, height }
      } else if (Bot?.uploadFile) {
        /** 老接口，后续废除 */
        const url = await Bot.uploadFile(file, type)
        lain.mark('Lain-plugin', `使用自定义图床发送图片：${url}`)
        const { width, height } = sizeOf(await Bot.Buffer(file))
        logger.warn('<Bot.uploadFile>接口即将废除，请查看文档更换新接口！')
        return { type, file: url, width, height }
      }
      /** ICQQ */
      if (Cfg.toICQQ && lain?.file?.uploadImage) {
        const { url, width, height } = await lain.file.uploadImage(file)
        lain.mark('Lain-plugin', `使用ICQQ发送图片：${url}`)
        return { type, file: url, width, height }
      }
    } catch (error) {
      lain.error(this.id, '<调用错误><自定义图床> 将继续公网发送图片')
      lain.error(this.id, error)
    }

    try {
      /** QQ图床 预留 */
      const QQCloud = Bot[this.id].config.other.QQCloud
      if (QQCloud) {
        const { width, height, url } = await Bot.uploadQQ(file, QQCloud)
        lain.mark('Lain-plugin', `QQ图床上传成功：${url}`)
        return { type, file: url, width, height }
      }
    } catch (error) {
      lain.error(this.id, '<调用错误><QQ图床> 将继续公网发送图片')
      lain.error(this.id, error)
    }

    /** 公网 */
    const { width, height, url } = await Bot.FileToUrl(file)
    lain.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    return { type, file: url, width, height }
  }

  /** 处理视频 */
  async getVideo (file) {
    return { type: 'video', file: await Bot.FormatFile(file) }
  }

  /** 处理语音 */
  async getAudio (file) {
    /** icqq高清语音(可能寄了) */
    if (typeof file === 'string' && file.startsWith('protobuf://')) {
      file = await lain.file.getPttUrl(lain.file.proto(file)[3])
    }

    try {
      /** 自定义语音接口 */
      if (Bot?.silkToUrl) {
        const url = await Bot.silkToUrl(file)
        if (url) {
          lain.mark('Lain-plugin', `<云转码:${url}>`)
          return { type: 'audio', file: url }
        }
      }
      /** ICQQ(可能寄了)
      if (Cfg.toICQQ && lain?.file?.uploadPtt) {
        const url = await lain.file.uploadPtt(file)
        lain.mark('Lain-plugin', `使用ICQQ发送语音：${url}`)
        return { type: 'audio', file: url }
      }
      */
    } catch (error) {
      lain.error(this.id, '云转码失败')
      lain.error(this.id, error)
    }

    const type = 'audio'
    const _path = process.cwd() + '/resources/temp'
    try { await fs.promises.mkdir(_path) } catch (error) { } // 尝试创建文件夹
    const mp3 = path.join(_path, `${Date.now()}.mp3`)
    const pcm = path.join(_path, `${Date.now()}.pcm`)
    const silk = path.join(_path, `${Date.now()}.silk`)

    /** 保存为MP3文件 */
    const buf = await Bot.Buffer(file)

    fs.writeFileSync(mp3, buf)

    if (isSilk(buf)) return { type: 'audio', file: `file://${mp3}` }

    /** mp3 转 pcm */
    await this.runFfmpeg(mp3, pcm)
    lain.mark('Lain-plugin', 'mp3 => pcm 完成!')
    lain.mark('Lain-plugin', 'pcm => silk 进行中!')

    /** pcm 转 silk */
    await encodeSilk(fs.readFileSync(pcm), 48000)
      .then((silkData) => {
        /** 转silk完成，保存 */
        fs.writeFileSync(silk, silkData?.data || silkData)
        /** 删除初始mp3文件 */
        fs.promises.unlink(mp3, () => { })
        /** 删除pcm文件 */
        fs.promises.unlink(pcm, () => { })
        lain.mark('Lain-plugin', 'pcm => silk 完成!')
      })
      .catch((err) => {
        /** 删除初始mp3文件 */
        fs.promises.unlink(mp3, () => { })
        /** 删除pcm文件 */
        fs.promises.unlink(pcm, () => { })
        lain.error('Lain-plugin', '转码失败：\n', err)
        return { type: 'text', text: `转码失败${err.message}` }
      })

    return { type, file: `file://${silk}` }
  }

  /** 转换为全局md */
  async markdown (e, data, Button = true) {
    let markdown = {
      type: 'markdown',
      custom_template_id: Bot[this.id].config.markdown.id,
      params: []
    }

    for (let i of data) {
      switch (i.type) {
        case 'text':
          markdown.params.push({ key: Bot[this.id].config.markdown.text || 'text_start', values: [i.text.replace(/\n/g, '\r')] })
          break
        case 'image':
          markdown.params.push({ key: Bot[this.id].config.markdown.img_url || 'img_url', values: [i.file] })
          markdown.params.push({ key: Bot[this.id].config.markdown.img_dec || 'img_dec', values: [`text #${i.width}px #${i.height}px`] })
          break
        default:
          break
      }
    }
    markdown = [markdown]
    /** 按钮 */
    if (Button) {
      const button = await this.button(e)
      if (button && button?.length) markdown.push(...button)
    }
    return markdown
  }

  /** 按钮添加 */
  async button (e) {
    try {
      for (let p of Buttons) {
        for (let v of p.plugin.rule) {
          const regExp = new RegExp(v.reg)
          if (regExp.test(e.msg)) {
            p.e = e
            const button = await p[v.fnc](e)
            /** 无返回不添加 */
            if (button) return [...(Array.isArray(button) ? button : [button])]
          }
        }
      }
      return false
    } catch (error) {
      lain.error('Lain-plugin', error)
      return false
    }
  }

  /** 发送好友消息 */
  async sendFriendMsg (user_id, data) {
    /** 构建一个普通e给按钮用 */
    let e = {
      bot: Bot[this.id],
      user_id,
      message: common.array(data)
    }
    /** 发送返回 */
    let ret = { res: [], err: [] }

    e.message.forEach(i => { if (i.type === 'text') e.msg = (e.msg || '') + (i.text || '') })
    const { Pieces, reply } = await this.getQQBot(data, e)
    for (let msg of Pieces) {
      msg = await msg
      if (!msg || (Array.isArray(msg) && !msg?.length)) continue
      if (reply) msg = Array.isArray(msg) ? [reply, ...msg] : [reply, msg]
      lain.debug(this.id, 1, JSON.stringify(msg).replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'))
      try {
        let res = await this.sdk.sendPrivateMessage(user_id, msg, this.sdk)
        ret.res.push(this.returnResult(res))
        lain.debug(this.id, '发送主动好友消息：', JSON.stringify(msg).replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'), res)
      } catch (err) {
        lain.error(this.id, '发送主动好友消息错误：', err)
        ret.err.push(err?.stack || JSON.stringify(err))
      }
      this.send_count()
    }
    return ret
  }

  /** 发送群消息 */
  async sendGroupMsg (group_id, data) {
    /** 构建一个普通e给按钮用 */
    let e = {
      bot: Bot[this.id],
      group_id,
      user_id: 'QQBot',
      message: common.array(data)
    }
    /** 发送返回 */
    let ret = { res: [], err: [] }

    e.message.forEach(i => { if (i.type === 'text') e.msg = (e.msg || '') + (i.text || '') })
    const { Pieces, reply } = await this.getQQBot(data, e)
    for (let msg of Pieces) {
      msg = await msg
      if (!msg || (Array.isArray(msg) && !msg?.length)) continue
      if (reply) msg = Array.isArray(msg) ? [reply, ...msg] : [reply, msg]
      lain.debug(this.id, 1, JSON.stringify(msg).replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'))
      try {
        let res = await this.sdk.sendGroupMessage(group_id, msg, this.sdk)
        ret.res.push(this.returnResult(res))
        lain.debug(this.id, '发送主动群消息：', JSON.stringify(msg).replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'), res)
      } catch (err) {
        lain.error(this.id, '发送主动群消息错误：', err)
        ret.err.push(err?.stack || JSON.stringify(err))
      }
      this.send_count()
    }
    return ret
  }

  /** 快速回复 */
  async sendReplyMsg (e, msg) {
    if (typeof msg === 'string' && msg.includes('歌曲分享失败：')) return false
    let res
    const { Pieces, normalMsg } = await this.getQQBot(msg, e)
    lain.debug(this.id, 1, JSON.stringify(Pieces).replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'))

    for (let msg of Pieces) {
      msg = await msg
      if (!msg || (Array.isArray(msg) && !msg?.length)) continue
      lain.debug(this.id, 2, JSON.stringify(msg).replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'))
      let { ok, data } = await this.sendMsg(e, msg)
      lain.debug(this.id, 3, ok, data)
      if (ok) { res = data; continue }

      /** 错误文本处理 */
      data = data.match(/code\(\d+\): .*/)?.[0] || data
      data = (await this.getQQBot(data, e)).Pieces
      /** 发送错误消息告知用户 */
      res = await this.sendMsg(e, data[0])
      ok = res.ok
      data = res.data
      if (ok) { res = data; continue }

      /** 模板转普通消息并终止发送剩余消息 */
      if (Bot[this.id].config.markdown.type) {
        let val
        for (const p of normalMsg) try { val = await this.sendMsg(e, p) } catch { }
        if (val.ok) {
          return this.returnResult(val.data)
        } else {
          /** 发送错误消息告知用户 */
          let data = (await this.getQQBot(val.data, e)).Pieces
          val = await this.sendMsg(e, data[0])
          return this.returnResult(val)
        }
      }
    }

    return this.returnResult(res)
  }

  /** 发送消息 */
  async sendMsg (e, msg) {
    try {
      this.send_count()
      lain.debug(this.id, '发送回复消息：', JSON.stringify(msg).replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'))
      const newMsg = [{ type: 'reply', id: e.message_id }]
      let res
      if (!e.friend) {
        newMsg.push({ type: 'text', text: '\n' })
        Array.isArray(msg) ? newMsg.push(...msg) : newMsg.push(msg)
        res = { ok: true, data: await this.sdk.sendGroupMessage(e.data.group_id, newMsg, this.sdk) }
      } else {
        Array.isArray(msg) ? newMsg.push(...msg) : newMsg.push(msg)
        res = { ok: true, data: await this.sdk.sendPrivateMessage(e.data.user_id, newMsg, this.sdk) }
      }
      return res
    } catch (err) {
      const error = err.message || err
      lain.error(this.id, err)
      return { ok: false, data: error }
    }
  }

  /** 返回结果 */
  returnResult (res) {
    if (!res?.timestamp) return false
    const { timestamp } = res
    const time = (new Date(timestamp)).getTime()
    res = {
      ...res,
      rand: 1,
      time,
      message_id: res?.id
    }
    lain.debug('Lain-plugin', '<处理发送返回>', res)
    return res
  }

  /** 转换文本中的URL为图片 */
  HandleURL (msg) {
    const message = []
    if (msg?.text) msg = msg.text
    /** 需要处理的url */
    let urls = Bot.getUrls(msg, Cfg.WhiteLink)

    urls.forEach(link => {
      message.push(...Bot.Button([{ link }]), 1)
      msg = msg.replace(new RegExp(url, 'g'), '[链接(请点击按钮查看)]')
    })
    message.unshift({ type: 'text', text: msg })
    return message
  }

  /** 获取日期 */
  getNowDate () {
    const date = new Date()
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
    const [{ value: month }, , { value: day }, , { value: year }] = dtf.formatToParts(date)
    return `${year}-${month}-${day}`
  }

  /** 初始化 */
  async getDAU () {
    const time = this.getNowDate()
    const msg_count = (await redis.get(`QQBotDAU:msg_count:${this.id}`)) || 0
    const send_count = (await redis.get(`QQBotDAU:send_count:${this.id}`)) || 0
    let data = await redis.get(`QQBotDAU:${this.id}`)
    if (data) {
      data = JSON.parse(data)
      data.msg_count = Number(msg_count)
      data.send_count = Number(send_count)
      data.time = time
      return data
    } else {
      return {
        user_count: 0, // 上行消息人数
        group_count: 0, // 上行消息群数
        msg_count, // 上行消息量
        send_count, // 下行消息量
        user_cache: {},
        group_cache: {},
        time
      }
    }
  }

  /** dau统计 */
  async dau () {
    try {
      if (!Cfg.Other.QQBotdau) return
      if (!lain.DAU[this.id]) lain.DAU[this.id] = await this.getDAU()
      lain.DAU[this.id].send_count++
      const time = moment(Date.now()).add(1, 'days').format('YYYY-MM-DD 00:00:00')
      const EX = Math.round((new Date(time).getTime() - new Date().getTime()) / 1000)
      redis.set(`QQBotDAU:send_count:${this.id}`, lain.DAU[this.id].send_count * 1, { EX })
    } catch (error) {
      lain.error(this.id, error)
    }
  }

  /** 下行消息量 */
  async send_count () {
    try {
      if (!Cfg.Other.QQBotdau) return
      if (!lain.DAU[this.id]) lain.DAU[this.id] = await this.getDAU()
      lain.DAU[this.id].send_count++
      const time = moment(Date.now()).add(1, 'days').format('YYYY-MM-DD 00:00:00')
      const EX = Math.round((new Date(time).getTime() - new Date().getTime()) / 1000)
      redis.set(`QQBotDAU:send_count:${this.id}`, lain.DAU[this.id].send_count * 1, { EX })
    } catch (error) {
      lain.error(this.id, error)
    }
  }

  /** 上行消息量 */
  async msg_count (data) {
    try {
      if (!Cfg.Other.QQBotdau) return
      let needSetRedis = false
      if (!lain.DAU[this.id]) lain.DAU[this.id] = await this.getDAU()
      lain.DAU[this.id].msg_count++
      if (data.group_id && !lain.DAU[this.id].group_cache[data.group_id]) {
        lain.DAU[this.id].group_cache[data.group_id] = 1
        lain.DAU[this.id].group_count++
        needSetRedis = true
      }
      if (data.user_id && !lain.DAU[this.id].user_cache[data.user_id]) {
        lain.DAU[this.id].user_cache[data.user_id] = 1
        lain.DAU[this.id].user_count++
        needSetRedis = true
      }
      const time = moment(Date.now()).add(1, 'days').format('YYYY-MM-DD 00:00:00')
      const EX = Math.round((new Date(time).getTime() - new Date().getTime()) / 1000)
      if (needSetRedis) redis.set(`QQBotDAU:${this.id}`, JSON.stringify(lain.DAU[this.id]), { EX })
      redis.set(`QQBotDAU:msg_count:${this.id}`, lain.DAU[this.id].msg_count * 1, { EX })
    } catch (error) {
      lain.error(this.id, error)
    }
  }
}

lain.info('Lain-plugin', 'QQ群Bot适配器加载完成')
