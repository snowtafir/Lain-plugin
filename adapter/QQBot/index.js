import { exec } from 'child_process'
import fs from 'fs'
import sizeOf from 'image-size'
import lodash from 'lodash'
import path from 'path'
import { encode as encodeSilk } from 'silk-wasm'
import Yaml from 'yaml'
import MiaoCfg from '../../../../lib/config/config.js'
import loader from '../../../../lib/plugins/loader.js'
import common from '../../lib/common/common.js'
import Cfg from '../../lib/config/config.js'
import Button from './plugins.js'

export default class adapterQQBot {
  /** 传入基本配置 */
  constructor (sdk, start) {
    /** 开发者id */
    this.id = String(sdk.config.appid)
    /** sdk */
    this.sdk = sdk
    /** 基本配置 */
    this.config = sdk.config
    /** 监听事件 */
    if (!start) this.StartBot()
  }

  async StartBot () {
    /** 群消息 */
    this.sdk.on('message.group', async (data) => {
      data = await this.message(data, true)
      if (data) Bot.emit('message', data)
    })
    /** 私聊消息 */
    this.sdk.on('message.private', async (data) => {
      data = await this.message(data, true)
      if (data) Bot.emit('message', data)
    })

    const { id, avatar, username } = await this.sdk.getSelfInfo()

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
      stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
      apk: Bot.lain.adapter.QQBot.apk,
      version: Bot.lain.adapter.QQBot.version,
      getFriendMap: () => Bot[this.id].fl,
      getGroupList: () => Bot[this.id].gl,
      getGuildList: () => Bot[this.id].tl,
      readMsg: async () => common.recvMsg(this.id, 'QQBot', true),
      MsgTotal: async (type) => common.MsgTotal(this.id, 'QQBot', type, true),
      pickGroup: (groupID) => this.pickGroup(groupID),
      pickUser: (userId) => this.pickFriend(userId),
      pickFriend: (userId) => this.pickFriend(userId),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getGroupMemberInfo: (group_id, user_id) => Bot.getGroupMemberInfo(group_id, user_id)
    }
    /** 加载缓存中的群列表 */
    this.gmlList('gl')
    /** 加载缓存中的好友列表 */
    this.gmlList('fl')
    /** 保存id到adapter */
    if (!Bot.adapter.includes(String(this.id))) Bot.adapter.push(String(this.id))

    /** 重启 */
    await common.init('Lain:restart:QQBot')
    return `QQBot：[${username}(${this.id})] 连接成功!`
  }

  /** 加载缓存中的群、好友列表 */
  async gmlList (type = 'gl') {
    try {
      const List = await redis.keys(`lain:${type}:${this.id}:*`)
      List.forEach(async i => {
        const id = await redis.get(i)
        if (type === 'gl') {
          Bot[this.id].gl.set(id, JSON.parse(id))
        } else {
          Bot[this.id].fl.set(id, JSON.parse(id))
        }
      })
    } catch { }
  }

  /** 群对象 */
  pickGroup (groupID) {
    return {
      is_admin: false,
      is_owner: false,
      recallMsg: async () => ({ error: 'QQBot未支持' }),
      sendMsg: async (msg) => await this.sendGroupMsg(groupID, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      pickMember: (userID) => this.pickMember(groupID, userID),
      /** 戳一戳 */
      pokeMember: async (operatorId) => '',
      /** 禁言 */
      muteMember: async (groupId, userId, time) => ({ error: 'QQBot未支持' }),
      /** 全体禁言 */
      muteAll: async (type) => ({ error: 'QQBot未支持' }),
      getMemberMap: async () => ({ error: 'QQBot未支持' }),
      /** 退群 */
      quit: async () => ({ error: 'QQBot未支持' }),
      /** 设置管理 */
      setAdmin: async (qq, type) => ({ error: 'QQBot未支持' }),
      /** 踢 */
      kickMember: async (qq, rejectAddRequest = false) => ({ error: 'QQBot未支持' }),
      /** 头衔 **/
      setTitle: async (qq, title, duration) => ({ error: 'QQBot未支持' }),
      /** 修改群名片 **/
      setCard: async (qq, card) => ({ error: 'QQBot未支持' })
    }
  }

  /** 好友对象 */
  pickFriend (userId) {
    return {
      sendMsg: async (msg) => await this.sendFriendMsg(userId, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      getAvatarUrl: async (size = 0, userID) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID.split('-')[1] || this.id}`
    }
  }

  pickMember (groupID, userID) {
    return {
      member: this.member(groupID, userID),
      getAvatarUrl: (size = 0, userID) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID.split('-')[1] || this.id}`
    }
  }

  member (groupId, userId) {
    const member = {
      info: {
        group_id: `${this.id}-${groupId}`,
        user_id: `${this.id}-${userId}`,
        nickname: '',
        last_sent_time: ''
      },
      group_id: `${this.id}-${groupId}`,
      is_admin: false,
      is_owner: false,
      /** 获取头像 */
      getAvatarUrl: (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userId}`,
      mute: async (time) => ''
    }
    return member
  }

  /** 转换格式给云崽处理 */
  async message (data, isGroup) {
    let { self_id: tinyId, ...e } = data
    e.data = data
    e.tiny_id = tinyId
    e.self_id = this.id
    e.sendMsg = data.reply
    e.raw_message = e.raw_message.trim()

    /** 过滤事件 */
    let priority = true
    let raw_message = e.raw_message
    if (e.group_id && raw_message) {
      raw_message = this.hasAlias(raw_message, e, false)
      raw_message = raw_message.replace(/^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/, '#星铁')
    }

    for (let v of loader.priority) {
      let p = new v.class(e)
      p.e = e
      /** 判断是否启用功能 */
      if (!this.checkDisable(e, p, raw_message)) {
        priority = false
        return false
      }
    }

    if (!priority) return false

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
    e.recall = async () => { }
    /** 将收到的消息转为字符串 */
    e.toString = () => e.raw_message
    /** 获取对应用户头像 */
    e.getAvatarUrl = (size = 0, id = data.user_id) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${id}`

    /** 构建场景对应的方法 */
    if (isGroup) {
      try {
        const groupId = `${this.id}-${e.group_id}`
        if (!Bot[e.self_id].gl.get(groupId)) Bot[e.self_id].gl.set(groupId, { group_id: groupId })
        /** 缓存群列表 */
        if (await redis.get(`lain:gl:${e.self_id}:${groupId}`)) redis.set(`lain:gl:${e.self_id}:${groupId}`, JSON.stringify({ group_id: groupId }))
        /** 防倒卖崽 */
        if (Bot.lain.cfg.QQBotTips) await this.QQBotTips(data, groupId)
      } catch { }

      e.member = this.member(e.group_id, e.user_id)
      e.group_name = `${this.id}-${e.group_id}`
      e.group = this.pickGroup(e.group_id)
    } else {
      e.friend = this.pickFriend(e.user_id)
    }

    /** 添加适配器标识 */
    e.adapter = 'QQBot'
    e.user_id = `${this.id}-${e.user_id}`
    e.group_id = `${this.id}-${e.group_id}`
    e.author.id = `${this.id}-${e.author.id}`
    e.sender.user_id = e.user_id
    /** 为什么本体会从群名片拿uid啊? */
    e.sender.card = ''
    e.sender.nickname = ''

    /** 缓存好友列表 */
    if (!Bot[e.self_id].fl.get(e.user_id)) Bot[e.self_id].fl.set(e.user_id, { user_id: e.user_id })
    if (await redis.get(`lain:fl:${e.self_id}:${e.user_id}`)) redis.set(`lain:fl:${e.self_id}:${e.user_id}`, JSON.stringify({ user_id: e.user_id }))

    /** 保存消息次数 */
    try { common.recvMsg(e.self_id, e.adapter) } catch { }
    common.info(this.id, `<群:${e.group_id}><用户:${e.user_id}> -> ${this.messageLog(e.message)}`)
    return e
  }

  /** 判断是否启用功能 */
  checkDisable (e, p, raw_message) {
    let groupCfg = Cfg.getGroup(e.self_id)
    /** 白名单 */
    if (!lodash.isEmpty(groupCfg.enable)) {
      if (groupCfg.enable.includes(p.name)) {
        /** 判断当前传入的值是否符合正则 */
        for (let i of p.rule) {
          i = new RegExp(i.reg)
          if (i.test(raw_message.trim())) {
            return true
          }
        }
        logger.mark(`[Lain-plugin][${p.name}]功能已禁用`)
        return false
      }
    }

    if (!lodash.isEmpty(groupCfg.disable)) {
      if (groupCfg.disable.includes(p.name)) {
        /** 判断当前传入的值是否符合正则 */
        for (let i of p.rule) {
          i = new RegExp(i.reg)
          if (i.test(raw_message.trim())) {
            logger.mark(`[Lain-plugin][${p.name}]功能已禁用`)
            return false
          }
        }
      }
    }
    return true
  }

  /** 前缀处理 */
  hasAlias (text, e, hasAlias = true) {
    text = text.trim()
    if (Bot[this.id].config.other.Prefix && text.startsWith('/')) {
      return text.replace(/^\//, '#')
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
        if (Bot[this.id].config.other.Prefix) text = text.replace(/^\//, '#')
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
        default:
          logMessage.push(JSON.stringify(i))
      }
    })
    return logMessage.join('')
  }

  /** 小兔崽子 */
  async QQBotTips (data, groupId) {
    /** 首次进群后，推送防司马崽声明~ */
    if (!await redis.get(`lain:QQBot:tips:${groupId}`)) {
      const msg = []
      const name = `「${Bot[this.id].nickname}」`
      msg.push('温馨提示：')
      msg.push(`感谢使用${name}，本Bot完全开源免费~\n`)
      msg.push('请各位尊重Yunzai本体及其插件开发者们的努力~')
      msg.push('如果本Bot是付费入群,请立刻退款举报！！！\n')
      msg.push('来自：Lain-plugin防倒卖崽提示，本提示仅在首次入群后触发~')
      if (Bot.lain.cfg.QQBotGroupId) msg.push(`\n如有疑问，请添加${name}官方群: ${Bot.lain.cfg.QQBotGroupId}~`)
      data.reply(msg.join('\n'))
      redis.set(`lain:QQBot:tips:${groupId}`, JSON.stringify({ group_id: groupId }))
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

      exec(`${cm} -i "${input}" -f s16le -ar 48000 -ac 1 "${output}"`, async (error, stdout, stderr) => {
        if (error) {
          common.error('Lain-plugin', `执行错误: ${error}`)
          reject(error)
          return
        }
        resolve()
      }
      )
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

    for (let i of data) {
      switch (i.type) {
        case 'text':
        case 'forward':
          if (String(i.text).trim()) {
            for (let item of (await Bot.HandleURL(i.text.trim()))) {
              item.type === 'image' ? image.push(await this.getImage(item.file)) : text.push(item.text)
            }
          }
          break
        case 'at':
          if (e.bot.config.markdown.type) text.push(`<@${(i.qq || i.id).trim().split('-')[1]}>`)
          break
        case 'image':
          image.push(await this.getImage(i?.url || i.file))
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
          button.push(i)
          break
        case 'ark':
        case 'markdown':
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

    switch (e.bot.config.markdown.type) {
      /** 关闭 */
      case 0:
      case '0':
        if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
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
        } else if (text.length) {
          Pieces.push([...(await this.markdown(e, [{ type: 'text', text: text.join('\n') }])), ...button])
        }
        button.length = 0
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
            if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
            if (image.length) message.push(image.shift())
            if (image.length) Pieces.push(...image)
          }
        } catch (error) {
          logger.error(error)
        }
        break
      /** 原样发送并遍历插件，自动补发一条按钮模板消息 */
      case 3:
      case '3':
        if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
        if (image.length) message.push(image.shift())
        if (image.length) Pieces.push(...image)
        /** 按钮模板 */
        try {
          const button = await this.button(e)
          if (button && button?.length) {
            const markdown = [
              {
                type: 'markdown',
                custom_template_id: e.bot.config.markdown.id,
                params: [{ key: e.bot.config.markdown.text || 'text_start', values: ['\u200B'] }]
              },
              ...button
            ]
            Pieces.push(markdown)
          }
        } catch (error) {
          logger.error(error)
        }
        break
      case 4:
      case '4':
        try {
          /** 返回数组，无需处理，直接发送即可 */
          if (image.length && text.length) {
            Pieces.push(...await Bot.Markdown(e, [{ type: 'text', text: text.join('\n') }, ...image]))
          } else if (image.length) {
            Pieces.push(...await Bot.Markdown(e, image))
          } else if (text.length) {
            Pieces.push(...await Bot.Markdown(e, [{ type: 'text', text: text.join('\n') }]))
          }
        } catch (_err) {
          console.error(_err)
          if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
          if (image.length) message.push(image.shift())
          if (image.length) Pieces.push(...image)
        }
        break
    }

    if (button.length) message.push(...button)

    /** 合并为一个数组 */
    return { Pieces: message.length ? [message, ...Pieces] : Pieces, reply }
  }

  /** 处理图片 */
  async getImage (file) {
    file = await Bot.FormatFile(file)
    const type = 'image'
    try {
      /** 自定义图床 */
      if (Bot?.imageToUrl) {
        const { width, height, url } = await Bot.imageToUrl(file)
        common.mark('Lain-plugin', `使用自定义图床发送图片：${url}`)
        return { type, file: url, width, height }
      } else if (Bot?.uploadFile) {
        /** 老接口，后续废除 */
        const url = await Bot.uploadFile(file)
        common.mark('Lain-plugin', `使用自定义图床发送图片：${url}`)
        const { width, height } = sizeOf(await Bot.Buffer(file))
        console.warn('[Bot.uploadFile]接口即将废除，请查看文档更换新接口！')
        return { type, file: url, width, height }
      }
    } catch (error) {
      logger.error('自定义服务器调用错误，已跳过')
      logger.error(error)
    }

    try {
      /** QQ图床 */
      const QQ = Bot[this.id].config.other.QQ
      if (QQ) {
        const { width, height, url } = await Bot.uploadQQ(file, QQ)
        common.mark('Lain-plugin', `QQ图床上传成功：${url}`)
        return { type, file: url, width, height }
      }
    } catch (error) {
      logger.error('QQ图床调用错误，已跳过：')
      logger.error(error)
    }

    /** 公网 */
    const { width, height, url } = await Bot.FileToUrl(file)
    common.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    return { type, file: url, width, height }
  }

  /** 处理视频 */
  async getVideo (file) {
    const type = 'video'
    try {
      /** 自定义接口 */
      if (Bot?.videoToUrl) {
        /** 视频接口 */
        const url = await Bot.videoToUrl(file)
        common.mark('Lain-plugin', `使用自定义服务器发送视频：${url}`)
        return { type, file: url }
      }
    } catch (error) {
      logger.error('自定义视频服务器调用错误，已跳过')
    }

    /** 现成url直接发 */
    if (/^http(s)?:\/\//.test(file)) {
      common.mark('Lain-plugin', `在线视频：${file}`)
      return { type, file }
    }

    /** 公网 */
    const { url } = await Bot.FileToUrl(file, type)
    common.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    return { type, file: url }
  }

  /** 处理语音 */
  async getAudio (file) {
    // return { type: 'audio', file: await Bot.audioToUrl(file) }
    const type = 'audio'
    const _path = Bot.lain._path + '/../resources/QQBotApi'
    const mp3 = path.join(_path, `${Date.now()}.mp3`)
    const pcm = path.join(_path, `${Date.now()}.pcm`)
    const silk = path.join(_path, `${Date.now()}.silk`)

    /** 保存为MP3文件 */
    fs.writeFileSync(mp3, await Bot.Buffer(file))
    /** mp3 转 pcm */
    await this.runFfmpeg(mp3, pcm)
    common.mark('Lain-plugin', 'mp3 => pcm 完成!')
    common.mark('Lain-plugin', 'pcm => silk 进行中!')

    /** pcm 转 silk */
    await encodeSilk(fs.readFileSync(pcm), 48000)
      .then((silkData) => {
        /** 转silk完成，保存 */
        fs.writeFileSync(silk, silkData?.data || silkData)
        /** 删除初始mp3文件 */
        fs.unlink(mp3, () => { })
        /** 删除pcm文件 */
        fs.unlink(pcm, () => { })
        common.mark('Lain-plugin', 'pcm => silk 完成!')
      })
      .catch((err) => {
        common.error('Lain-plugin', `转码失败${err}`)
        return { type: 'text', text: `转码失败${err}` }
      })

    try {
      /** 自定义语音接口 */
      if (Bot?.audioToUrl) {
        const url = await Bot.audioToUrl(`file://${silk}`)
        common.mark('Lain-plugin', `使用自定义服务器发送语音：${url}`)
        setTimeout(() => {
          fs.unlink(silk, err => { logger.error(err) })
        }, (Cfg.Server.InvalidTime || 30) * 1000)
        return { type, file: url }
      }
    } catch (error) {
      logger.error('自定义服务器调用错误，已跳过')
    }

    /** 公网 */
    const { url } = await Bot.FileToUrl(`file://${silk}`, type)
    common.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    setTimeout(() => {
      fs.unlink(silk, err => { logger.error(err) })
    }, (Cfg.Server.InvalidTime || 30) * 1000)
    return { type, file: url }
  }

  /** 转换为全局md */
  async markdown (e, data, Button = true) {
    let markdown = {
      type: 'markdown',
      custom_template_id: e.bot.config.markdown.id,
      params: []
    }

    for (let i of data) {
      switch (i.type) {
        case 'text':
          markdown.params.push({ key: e.bot.config.markdown.text || 'text_start', values: [i.text.replace(/\n/g, '\r')] })
          break
        case 'image':
          markdown.params.push({ key: e.bot.config.markdown.img_url || 'img_url', values: [i.file] })
          markdown.params.push({ key: e.bot.config.markdown.img_dec || 'img_dec', values: [`text #${i.width}px #${i.height}px`] })
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
      for (let p of Button) {
        for (let v of p.plugin.rule) {
          const regExp = new RegExp(v.reg)
          if (regExp.test(e.msg)) {
            const button = await p[v.fnc](e)
            /** 无返回不添加 */
            if (button) return [...(Array.isArray(button) ? button : [button])]
            return false
          }
        }
      }
    } catch (error) {
      common.error('Lain-plugin', error)
      return false
    }
  }

  /** 发送好友消息 */
  async sendFriendMsg (userId, data) {
    userId = userId.split('-')?.[1] || userId
    /** 构建一个普通e给按钮用 */
    let e = {
      bot: Bot[this.id],
      user_id: userId,
      message: common.array(data)
    }

    e.message.forEach(i => { if (i.type === 'text') e.msg = (e.msg || '') + (i.text || '').trim() })
    const { Pieces, reply } = await this.getQQBot(data, e)
    Pieces.forEach(i => {
      if (reply) i = Array.isArray(i) ? [...i, reply] : [i, reply]
      this.sdk.sendPrivateMessage(userId, i, this.sdk)
      logger.debug('发送主动好友消息：', JSON.stringify(i))
    })
  }

  /** 发送群消息 */
  async sendGroupMsg (groupID, data) {
    /** 获取正确的id */
    groupID = groupID.split('-')?.[1] || groupID
    /** 构建一个普通e给按钮用 */
    let e = {
      bot: Bot[this.id],
      group_id: groupID,
      user_id: 'QQBot',
      message: common.array(data)
    }

    e.message.forEach(i => { if (i.type === 'text') e.msg = (e.msg || '') + (i.text || '').trim() })
    const { Pieces, reply } = await this.getQQBot(data, e)
    Pieces.forEach(i => {
      if (reply) i = Array.isArray(i) ? [...i, reply] : [i, reply]
      this.sdk.sendGroupMessage(groupID, i, this.sdk)
      logger.debug('发送主动群消息：', JSON.stringify(i))
    })
  }

  /** 快速回复 */
  async sendReplyMsg (e, msg) {
    let res
    const { Pieces } = await this.getQQBot(msg, e)

    for (const i in Pieces) {
      /** 拷贝源消息 */
      const copyMsg = JSON.parse(JSON.stringify(Pieces[i]))
      if (!Pieces[i] || Object.keys(Pieces[i]).length === 0) continue
      let { ok, data } = await this.sendMsg(e, Pieces[i])
      if (ok) {
        res = data
        continue
      }

      /** 处理好文本以待发送 */
      if (data && data?.response) {
        data = `\n发送消息失败：\ncode:：${data.response.data.code}\nmessage：${data.response.data.message}`
      } else {
        data = data?.message || JSON.stringify(data)
      }

      /** 模板转普通消息 */
      if (Bot[this.id].config.markdown.type) {
        const message = []
        for (const item of copyMsg) {
          if (item.type !== 'markdown') continue
          item.params.forEach(obj => {
            switch (obj.key) {
              case 'text_start':
                message.push({ type: 'text', text: obj.values[0] })
                break
              case 'img_url':
                message.push({ type: 'image', file: obj.values[0] })
                break
              case 'img_dec':
              default:
                break
            }
          })
        }
        const val = await this.sendMsg(e, message)
        if (val.ok) continue
      }

      /** 发送错误消息告知用户 */
      const val = await this.sendMsg(e, data)
      res = val.data
    }

    res = {
      ...res,
      rand: 1,
      time: Date.now(),
      message_id: res?.msg_id
    }
    common.debug('Lain-plugin', res)
    return res
  }

  async sendMsg (e, msg) {
    try {
      logger.debug('发送回复消息：', JSON.stringify(msg))
      return { ok: true, data: await e.data.reply(msg) }
    } catch (err) {
      const error = err.message || err
      common.error(e.self_id, error)
      return { ok: false, data: error }
    }
  }
}

common.info('Lain-plugin', 'QQ群Bot适配器加载完成')
