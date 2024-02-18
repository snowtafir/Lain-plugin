import lodash from 'lodash'
import MiaoCfg from '../../../../lib/config/config.js'
import loader from '../../../../lib/plugins/loader.js'
import common from '../../lib/common/common.js'
import Cfg from '../../lib/config/config.js'
import { faceMap } from '../../model/shamrock/face.js'

export default class adapterQQGuild {
  /** 传入基本配置 */
  constructor (sdk) {
    /** sdk */
    this.sdk = sdk
    /** 基本配置 */
    this.config = sdk.config
    /** 开发者id */
    this.id = `qg_${this.config.appid}`
    /** 监听事件 */
    this.StartBot()
  }

  async StartBot () {
    this.sdk.on('message.guild', async (data) => {
      data = await this.GroupMessage(data)
      data && Bot.emit('message', data)
    })
    this.sdk.on('message.private.direct', async (data) => {
      data = await this.GroupMessage(data, 'friend')
      data && Bot.emit('message', data)
    })

    // 有点怪 先简单处理下
    let id, avatar, username
    try {
      const info = await this.sdk.getSelfInfo()
      id = info.id
      avatar = info.avatar
      username = info.username
    } catch {
      id = this.id
      avatar = 'https://cdn.jsdelivr.net/gh/Zyy955/imgs/img/202402020757587.gif'
      username = 'QQBot'
    }

    Bot[this.id] = {
      sdk: this.sdk,
      config: this.config,
      bkn: 0,
      avatar,
      adapter: 'QQGuild',
      uin: this.id,
      tiny_id: id,
      fl: new Map(),
      gl: new Map(),
      tl: new Map(),
      gml: new Map(),
      guilds: new Map(),
      nickname: username,
      stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
      apk: Bot.lain.adapter.QQGuild.apk,
      version: Bot.lain.adapter.QQGuild.version,
      getFriendMap: () => Bot[this.id].fl,
      getGroupList: () => Bot[this.id].gl,
      getGuildList: () => Bot[this.id].tl,
      readMsg: async () => common.recvMsg(this.id, 'QQGuild', true),
      MsgTotal: async (type) => common.MsgTotal(this.id, 'QQGuild', type, true),
      pickGroup: (groupID) => this.pickGroup(groupID),
      pickUser: (userId) => this.pickFriend(userId),
      pickFriend: (userId) => this.pickFriend(userId),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getGroupMemberInfo: (group_id, user_id) => Bot.getGroupMemberInfo(group_id, user_id)
    }

    if (!this.config.allMsg) Bot[this.id].version.id = '公域'
    if (!Bot.adapter.includes(String(this.id))) Bot.adapter.push(String(this.id))

    /** 重启 */
    await common.init('Lain:restart:QQGuild')
    return lain.info(this.id, `QQGuild：[${username}(${this.id})] 连接成功!`)
  }

  async gmlList (type = 'gl') {

  }

  async GroupMessage (e, friend) {
    let { self_id: _tiny_id, bot: _bot, ...data } = e
    const { guild_id, channel_id, member, author, src_guild_id } = e
    const { id: userId, username: nickname, avatar } = author

    const group_id = `qg_${guild_id}-${channel_id}`
    const user_id = `qg_${userId}`

    const is_owner = member.roles && (member.roles.includes('4') || false)
    const is_admin = member.roles && (member.roles.includes('2') || false)
    const role = is_owner ? 'owner' : (is_admin ? 'admin' : 'member')
    const group_name = await this.getGroupName(src_guild_id || guild_id, channel_id, friend)

    data.data = e
    data.adapter = 'QQGuild'
    data.user_id = user_id
    data.group_id = group_id
    data.sub_type = friend || 'normal'
    data.message_type = friend ? 'private' : 'group'
    data.time = data.timestamp
    data.atme = false
    data.atall = false
    data.self_id = this.id
    /** 这些字段还需要补充 */
    data.group_name = group_name
    data.group = { ...this.pickGroup(group_id) }
    data.sender = {
      ...data.sender,
      user_id,
      nickname,
      sub_id: 0,
      card: '',
      sex: 'unknown',
      age: 0,
      area: '',
      level: 1,
      role,
      title: ''
    }
    data.reply = async (msg, quote) => await this.sendReplyMsg(data, msg, quote)
    data.member = {
      card: '', // 名片
      client: '', // 客户端对象
      dm: false, // 是否是私聊
      group: { ...this.pickGroup(group_id) },
      group_id, // 群号
      info: { ...data.sender }, // 群员资料
      is_admin, // 是否是管理员
      is_friend: false, // 是否是好友
      is_owner, // 是否是群主
      mute_left: 0, // 禁言剩余时间
      target: user_id, // 目标
      title: '', // 头衔
      user_id, // 用户ID
      getAvatarUrl: () => avatar,
      kick: async () => await this.kick(),
      mute: async () => await this.mute(),
      recallMsg: async () => await data.recall(),
      sendMsg: async (msg, quote) => await data.reply(msg, quote),
      setAdmin: async () => await this.setAdmin()
    }
    let { message, raw_message, log_message, ToString } = await this.getMessage(data.message)
    data.message = message

    /** 过滤事件 */
    let priority = true
    if (e.group_id && raw_message) {
      raw_message = this.hasAlias(raw_message, e, false)
      raw_message = raw_message.replace(/^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/, '#星铁')
    }

    for (let v of loader.priority) {
      let p = new v.class(data)
      p.e = data
      /** 判断是否启用功能 */
      if (!this.checkDisable(data, p, raw_message)) {
        priority = false
        return false
      }
    }

    if (!priority) return false

    if (Bot[this.id].config.other.Prefix) {
      data.message.some(msg => {
        if (msg.type === 'text') {
          msg.text = this.hasAlias(msg.text, data)
          return true
        }
        return false
      })
    }

    data.raw_message = raw_message
    data.toString = () => ToString

    lain.info(this.id, `<${friend ? '私信' : '频道'}:${group_name}(${group_id})><用户:${nickname}(${user_id})> -> ${log_message}`)
    return data
  }

  /** 获取群名称 */
  async getGroupName (guildId, channelId, friend) {
    const group_id = `qg_${guildId}-${channelId}`
    let group_name = Bot.gl.get(group_id)
    if (group_name) return group_name.group_name
    const guild = await this.sdk.getGuildInfo(guildId)
    group_name = guild.guild_name
    if (friend) {
      group_name = `来自"${group_name}"频道`

      /** 一个子频道为一个群 */
      Bot.gl.set(group_id, { group_name })
      Bot[this.id].gl.set(group_id, { group_name })
    } else {
      let data = await this.sdk.getChannelInfo(channelId)
      group_name = `${group_name}-${data.channel_name}`

      /** 一个子频道为一个群 */
      Bot.gl.set(group_id, { ...data, group_name })
      Bot[this.id].gl.set(group_id, { ...data, group_name })
    }

    return group_name
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
      sendMsg: async (group_id, msg) => await this.sendFriendMsg(group_id, userId, msg),
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

  /** 处理消息事件 */
  async getMessage (data) {
    const message = []
    const ToString = []
    const raw_message = []
    const log_message = []

    data.forEach(i => {
      switch (i.type) {
        case 'text':
          message.push(i)
          raw_message.push(i.text)
          log_message.push(i.text)
          ToString.push(i.text)
          break
        case 'image':
          message.push(i)
          raw_message.push('[图片]')
          log_message.push(`<图片:${i.url}>`)
          ToString.push(`{image:${i.url}}`)
          break
        case 'face':
          message.push(i)
          raw_message.push(`[${faceMap[Number(i)] || '动画表情'}]`)
          log_message.push(`<${faceMap[Number(i)] || `动画表情:${i}`}>`)
          ToString.push(`{face:${i}}`)
          break
        case 'link':
          message.push(i)
          raw_message.push('[link]')
          log_message.push(`<link:${i.channel_id}>`)
          ToString.push(`{link:${i.channel_id}}`)
          break
        case 'at':
          message.push({ ...i, qq: `qg_${i.user_id}`, text: i.username })
          raw_message.push(`@${i.username}`)
          log_message.push(`<提及:qg_${i.user_id}(${i.username})>`)
          ToString.push(`{at:qg_${i.user_id}}`)
          break
        case 'markdown':
          raw_message.push('[markdown]')
          log_message.push(`<markdown:${JSON.stringify(i)}>`)
          ToString.push(`{markdown:${JSON.stringify(i)}}`)
          break
        case 'button':
          raw_message.push('[按钮]')
          log_message.push(`<按钮:${JSON.stringify(i?.buttons || i)}>`)
          ToString.push(`{button:${JSON.stringify(i?.buttons || i)}}`)
          break
        case 'ark':
          raw_message.push(JSON.stringify(i))
          log_message.push(`<ark:${JSON.stringify(i)}>`)
          ToString.push(JSON.stringify(i))
          break
        default:
          raw_message.push(JSON.stringify(i))
          log_message.push(JSON.stringify(i))
          ToString.push(JSON.stringify(i))
          break
      }
    })

    return { message, raw_message: raw_message.join(''), log_message: log_message.join(''), ToString: ToString.join('') }
  }

  /** 处理回复消息 */
  async sendReplyMsg (data, msg, quote) {
    let { Pieces, messageLog } = await this.getQQGuild(msg)
    const info = data.message_type === 'group' ? '频道' : '私信'
    lain.info(this.id, `<回复${info}:${data.group_name}(${data.group_id})> => ${messageLog}`)
    for (const item of Pieces) {
      try {
        lain.debug(`发送回复${info}消息：`, JSON.stringify(item))
        let res = await data.data.reply(item, quote)
        res.message_id = res.id
        lain.debug(`回复${info}消息返回：`, res)
      } catch (error) {
        console.error(error)
      }
    }
  }

  /** 转换message为sdk可接收的格式 */
  async getQQGuild (data) {
    data = common.array(data)
    let reply
    const text = []
    const image = []
    const message = []
    const Pieces = []
    const messageLog = []

    for (let i of data) {
      switch (i.type) {
        case 'text':
        case 'forward':
          if (String(i.text).trim()) {
            messageLog.push(i.text)
            for (let item of (await Bot.HandleURL(i.text.trim()))) {
              item.type === 'image' ? image.push(item) : text.push(item.text)
            }
          }
          break
        case 'at':
          i.user_id = (i.qq || i.id).replace('qg_', '')
          message.push(i)
          messageLog.push(`<@:${i.qq || i.id}>`)
          break
        case 'image':
          i.file = await Bot.FormatFile(i.url || i.file)
          image.push(i)
          messageLog.push(`<图片:${typeof i.file === 'string' ? i.file.replace(/base64:\/\/.*/, 'base64://...') : 'base64://...'}>`)
          break
        case 'video':
          break
        case 'record':
          break
        case 'reply':
          reply = i
          break
        case 'ark':
        case 'button':
        case 'markdown':
          message.push(i)
          break
        default:
          message.push(i)
          messageLog.push(`<未知:${JSON.stringify(i)}>`)
          break
      }
    }

    if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
    if (image.length) message.push(image.shift())
    if (image.length) Pieces.push(...image)

    /** 合并为一个数组 */
    return { Pieces: message.length ? [message, ...Pieces] : Pieces, reply, messageLog: messageLog.join('') }
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

  /** 转换message */
  async getQQBot (data, e) {
    data = common.array(data)
    let reply
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
          if ([1, '1', 4, '4'].includes(e.bot.config.markdown.type)) text.push(`<@${(i.qq || i.id).trim().split('-')[1]}>`)
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
        case 'ark':
        case 'button':
        case 'markdown':
          message.push(i)
          break
        default:
          message.push(i)
          break
      }
    }

    /** 消息次数 */
    if (text.length) try { common.MsgTotal(this.id, 'QQGuild') } catch { }
    if (image.length) try { common.MsgTotal(this.id, 'QQGuild', 'image') } catch { }

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
          Pieces.push(await this.markdown(e, text.length ? [{ type: 'text', text: text.join('\n') }, image.shift()] : [image.shift()]))
          if (image.length) Pieces.push(await this.markdown(e, [...image]))
        } else if (text.length) {
          Pieces.push(await this.markdown(e, [{ type: 'text', text: text.join('\n') }]))
        }
        break
      /** 正则模式，遍历插件，按需替换发送 */
      case 2:
      case '2':
        try {
          /** 先走一遍按钮正则，匹配到按钮则修改为markdown */
          const button = await this.button(e)
          if (button && button?.length) {
            const markdown = []
            /** 返回数组，拆出来和按钮合并 */
            if (image.length) {
              markdown.push(...await this.markdown(e, text.length ? [{ type: 'text', text: text.join('\n') }, image.shift()] : [image.shift()], false))
              if (image.length) markdown.push(...await this.markdown(e, [...image]))
            } else if (text.length) {
              markdown.push(...await this.markdown(e, [{ type: 'text', text: text.join('\n') }], false))
            }
            /** 加入按钮 */
            Pieces.push([...markdown, ...button])
          } else {
            /** 返回数组，无需处理，直接发送即可 */
            if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
            if (text.length) Pieces.push(...text)
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

    /** 合并为一个数组 */
    return { Pieces: message.length ? [message, ...Pieces] : Pieces, reply }
  }

  /** 发送主动私信消息 */
  async sendFriendMsg (group_id, user_id, data) {
    /** 暂时屏蔽下 */
    if (!(group_id || user_id || data)) {
      throw new Error('不存在此频道，正确请求格式：Bot.pickFriend(user_id).sendMsg(group_id, msg)')
    }

    user_id = user_id.replace('qg_', '')
    const guild_id = group_id.replace('qg_', '').split('-')[0]
    let { Pieces, messageLog, reply } = await this.getQQGuild(data)
    lain.info(this.id, `<发送主动私信消息:${group_id})> => ${messageLog}`)
    /** 先创建私信会话 */
    const directData = await this.sdk.createDirectSession(guild_id, user_id)
    for (let item of Pieces) {
      try {
        if (reply) item = Array.isArray(item) ? [reply, ...item] : [reply, item]
        let res = await this.sdk.sendDirectMessage(directData.guild_id, item)
        res.message_id = res.id
        return res
      } catch (error) {
        logger.error('发送主动私信消息息失败：', error)
      }
    }
  }

  /** 发送主动群消息 */
  async sendGroupMsg (groupID, data) {
    const channel_id = groupID.replace('qg_', '').split('-')[1]
    let { Pieces, messageLog, reply } = await this.getQQGuild(data)
    lain.info(this.id, `<发送主动频道消息:${groupID})> => ${messageLog}`)
    for (let item of Pieces) {
      try {
        if (reply) item = Array.isArray(item) ? [reply, ...item] : [reply, item]
        let res = await this.sdk.sendGuildMessage(channel_id, item)
        res.message_id = res.id
        return res
      } catch (error) {
        logger.error('发送频道主动消息失败：', error)
      }
    }
  }
}

common.info('Lain-plugin', 'QQ群Bot适配器加载完成')
