import lodash from 'lodash'
import { createOpenAPI, createWebsocket } from 'qq-guild-bot'
import MiaoCfg from '../../../../lib/config/config.js'
import loader from '../../../../lib/plugins/loader.js'
import common from '../../lib/common/common.js'
import Cfg from '../../lib/config/config.js'
import { faceMap } from '../../model/shamrock/face.js'
import { Blob, FormData } from 'node-fetch'

export default class adapterQQGuild {
  /** 传入基本配置 */
  constructor (config, add) {
    /** 兼容通用配置 */
    config.appID = config.appid
    /** 开发者id */
    this.id = `qg_${config.appid}`
    /** 沙盒模式 */
    this.sandbox = config.sandbox
    /** 是否接收全部消息 */
    this.allMsg = config.allMsg
    /** 当前机器人配置 */
    this.config = config
    /** 被动连接 */
    if (!add) this.StartBot()
    /** 私信会话 */
    this.friend = new Map()
  }

  /** 创建连接 */
  async StartBot () {
    /** 基础监听事件 */
    const intents = ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGE']
    /** 接收全部消息 */
    this.allMsg ? intents.push('GUILD_MESSAGES') : intents.push('PUBLIC_GUILD_MESSAGES')
    /** 添加监听事件 */
    this.config.intents = intents
    /** 创建 client */
    this.client = createOpenAPI(this.config)
    /** 创建 websocket 连接 */
    this.ws = createWebsocket(this.config)
    /** 监听事件 */
    for (const item of intents) this.ws.on(item, (data) => this.event(data))
    /** 连接成功打印日志 */
    common.info(this.id, 'QQ频道Bot连接成功，正在加载资源')

    /** 获取机器人自身信息 */
    let { data } = await this.client.meApi.me()
    const { avatar, username, id } = data
    /** 机器人的用户id 非开发者id */
    this.tiny_id = `qg_${id}`
    /** 机器人名称 */
    this.name = username
    /** 机器人头像 */
    this.avatar = avatar

    /** 构建基本参数 */
    Bot[this.id] = {
      ws: this.ws,
      adapter: 'QQGuild',
      config: this.config,
      client: this.client,
      fl: new Map(),
      gl: new Map(),
      tl: new Map(),
      gml: new Map(),
      guilds: new Map(),
      avatar,
      id,
      name: username,
      uin: this.id,
      tiny_id: id,
      nickname: username,
      stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
      apk: Bot.lain.adapter.QQGuild.apk,
      version: Bot.lain.adapter.QQGuild.version,
      pickMember: (group_id, user_id) => this.pickMember(group_id, user_id),
      pickUser: (user_id) => this.pickFriend(user_id),
      pickFriend: (user_id) => this.pickFriend(user_id),
      pickGroup: (group_id) => this.pickGroup(group_id),
      setEssenceMessage: async (msg_id) => await this.setEssenceMessage(msg_id),
      sendPrivateMsg: async (user_id, msg) => await this.sendFriendMsg(user_id, msg),
      getGroupMemberInfo: async (group_id, user_id, no_cache) => await this.getGroupMemberInfo(group_id, user_id, no_cache),
      removeEssenceMessage: async (msg_id) => await this.removeEssenceMessage(msg_id),
      makeForwardMsg: async (message) => await common.makeForwardMsg(message),
      getMsg: (msg_id) => '',
      quit: (group_id) => this.quit(group_id),
      getFriendMap: () => Bot[this.id].fl,
      getGroupList: () => Bot[this.id].gl,
      getGuildList: () => Bot[this.id].tl,
      getMuteList: async (group_id) => await this.getMuteList(group_id),
      getChannelList: async (guild_id) => await this.getChannelList(guild_id),
      readMsg: async () => common.recvMsg(this.id, 'QQGuild', true),
      MsgTotal: async (type) => common.MsgTotal(this.id, 'QQGuild', type, true)
    }

    /** 公域私域 */
    Bot[this.id].version.id = this.allMsg ? '私域' : '公域'
    /** 保存uin */
    if (!Bot.adapter.includes(this.id)) Bot.adapter.push(this.id)
    /** 获取一些基本信息 */
    this.LoadAll(this.id)
    /** 告知用户加载资源完成 */
    common.info(this.id, '加载资源完毕...')
    return `QQGuild：[${Bot[this.id].nickname}(${this.id})] 连接成功!`
  }

  /** 加载资源 */
  async LoadAll () {
    /** 机器人当前的频道列表 */
    const meGuilds = await this.client.meApi.meGuilds()
    for (const guild of meGuilds.data) {
      try {
        /** 获取子频道列表 */
        let { data } = await this.client.channelApi.channels(guild.id)
        /** 缓存 */
        Bot[this.id].guilds.set(`qg_${guild.id}`, data)
        for (const channel of data) {
          const group_id = `qg_${guild.id}-${channel.id}`
          const value = { ...channel, group_name: `${guild.name}-${channel.name}`, uin: this.id }
          /** 一个子频道为一个群 */
          Bot.gl.set(group_id, value)
          Bot[this.id].gl.set(group_id, value)
        }
      } catch (error) {
        common.warn(this.id, `QQGuild获取子频道列表错误，跳过频道：${guild.name}(${guild.id})`)
      }
      common.init('Lain:restart:QQGuild')
    }
  }

  /** 根据对应事件进行对应处理 */
  async event (data) {
    switch (data.eventType) {
      /** 私域 */
      case 'MESSAGE_CREATE':
        data = await this.ICQQEvent(data)
        data && await Bot.emit('message', data)
        break
      /** 私信 */
      case 'DIRECT_MESSAGE_CREATE':
        data = await this.ICQQEvent(data, 'friend')
        data && await Bot.emit('message', data)
        break
      /** 公域事件 仅接收@机器人消息 */
      case 'AT_MESSAGE_CREATE':
        data = await this.ICQQEvent(data)
        data && await Bot.emit('message', data)
        break
      /** 其他事件不需要给云崽、直接单独处理即可 */
      default:
        await this.otherEvent(data)
        break
    }
  }

  /** 私信需要先创建会话才可进行处理 */
  async friendMessage (guild_id, user_id) {
    const key = `qg_${guild_id}-${user_id}`
    /** 先找下缓存 */
    const data = this.friend.get(key)
    if (data) return data
    /** 私信结构体 */
    const dmObj = {
      source_guild_id: guild_id,
      recipient_id: user_id
    }
    let friend = await this.client.directMessageApi.createDirectMessage(dmObj)
    friend = friend.data
    /** 缓存 */
    this.friend.set(key, friend)
    return friend
  }

  /** 转为icqq标准 */
  async ICQQEvent (data, friend) {
    data = data.msg
    const { src_guild_id, author, guild_id, channel_id, member, timestamp } = data
    let { id: user_id, username: nickname, avatar } = author
    user_id = `qg_${user_id}`
    let is_owner = !friend && member.roles.includes('4')
    let is_admin = !friend && member.roles.includes('2')
    let role = is_owner ? 'owner' : (is_admin ? 'admin' : 'member')
    const group_id = `qg_${guild_id}-${channel_id}`
    const group_name = await this.getGroupName(src_guild_id || guild_id, channel_id, friend)
    const time = this.getTime(timestamp)

    /** 构建e */
    let e = {
      adapter: 'QQGuild',
      author,
      channel_id,
      group_id,
      guild_id,
      group_name,
      mentions: data.mentions,
      message_id: data.id,
      post_type: 'message',
      sub_type: friend || 'normal',
      message_type: friend ? 'private' : 'group',
      self_id: this.id,
      seq: data.seq,
      time,
      uin: this.id,
      user_id,
      sender: {
        user_id,
        nickname,
        sub_id: 521220816,
        card: nickname,
        sex: 'female',
        age: 0,
        area: '广东',
        level: 1,
        role,
        title: '1234'
      }
    }

    /** 头像 */
    e.getAvatarUrl = () => avatar

    /** 构建member */
    e.member = {
      info: { ...e.sender },
      group_id,
      group_name,
      is_admin,
      is_owner,
      is_friend: false,
      /** 获取头像 */
      getAvatarUrl: () => avatar,
      /** 禁言 */
      mute: async (time) => await this.muteMember(guild_id, user_id, time),
      /** 踢 */
      kick: async () => await this.kickMember(guild_id, user_id)
    }

    /** 缓存一下 */
    Bot[this.id].gml.set(group_id, e.member)

    /** 构建message */
    let { message, raw_message, log_message, ToString } = await this.getMessage(data)

    /** 移除首个at 需要为公域 */
    if (!this.allMsg) {
      const index = message.findIndex(i => i.type === 'at' && i.qq === this.tiny_id)
      if (index !== -1) message.splice(index, 1)
    }

    /** 构建场景对应的方法 */
    if (friend) {
      /** 私聊消息 */
      e.friend = {
        sendMsg: async (msg) => await this.sendFriendMsg(user_id, msg, false),
        recallMsg: async (msg_id) => await this.recall(channel_id, msg_id, friend),
        makeForwardMsg: async (message) => await common.makeForwardMsg(message),
        getAvatarUrl: () => avatar,
        getChatHistory: async (msg_id) => this.getChatHistory(channel_id, msg_id)
      }
      log_message && common.info(this.id, `<私信:${group_name}(${group_id})><用户:${nickname}(${user_id})> -> ${log_message}`)
    } else {
      e.group = { ...this.pickGroup(group_id), is_admin, is_owner }
      log_message && common.info(this.id, `<频道:${group_name}(${group_id})><用户:${nickname}(${user_id})> -> ${log_message}`)
    }

    /** 快速撤回 */
    e.recall = async () => this.recall(channel_id, data.id, friend)
    /** 快速回复 */
    e.reply = async (msg, quote) => await this.sendReplyMsg(e, friend, msg, quote)
    /** 引用消息 */
    if (data?.message_reference) {
      e.source = await this.getReply(channel_id, data.id)
    }

    e.message = message

    /** 过滤事件 */
    let priority = true
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

    e.raw_message = raw_message
    e.toString = () => ToString

    return e
  }

  /** 处理消息事件 */
  async getMessage (data) {
    const message = []
    const ToString = []
    const raw_message = []
    const log_message = []
    /** 图片 */
    if (data.attachments && data.attachments.length) {
      data.attachments.forEach(i => {
        i.file = i.filename
        i.url = 'https://' + i.url
        message.push({ type: 'image', i })
        raw_message.push('[图片]')
        log_message.push(`<图片:${i.url}>`)
        ToString.push(`{image:${i.url}}`)
      })
    }

    /** 文本 表情包 at */
    if (data.content) {
      /** 先对消息进行分割 */
      const content = data.content.match(/@everyone|<@([^>]+)>|<emoji:([^>]+)>|[^<>]+/g)
      /** at数组转对象 */
      if (data.mentions) data.mentions = data.mentions.reduce((obj, item) => ({ ...obj, [item.id]: item }), {})

      content.forEach(i => {
        if (i === '@everyone') {
          message.push({ type: 'at', qq: 'all' })
          raw_message.push('[at:all]')
          log_message.push('<@全体成员>')
          ToString.push('{at:all}')
        } else if (i.startsWith('<@')) {
          i = i.slice(3, -1)
          const name = data.mentions[i].username
          i = 'qg_' + i
          message.push({ type: 'at', qq: i, text: name })
          raw_message.push(`{at:${i}}`)
          log_message.push(`<at:${name}(${i})>`)
          ToString.push(`{at:${i}}`)
        } else if (i.startsWith('<emoji:')) {
          i = i.slice(7, -1)
          message.push({ type: 'face', id: i })
          raw_message.push(`[${faceMap[Number(i)] || '动画表情'}]`)
          log_message.push(`<${faceMap[Number(i)] || `动画表情:${i}`}>`)
          ToString.push(`{face:${i}}`)
        } else {
          message.push({ type: 'text', text: i })
          raw_message.push(i)
          log_message.push(i)
          ToString.push(i)
        }
      })
    }

    return { message, raw_message: raw_message.join(''), log_message: log_message.join(''), ToString: ToString.join('') }
  }

  /** 处理引用回复 */
  async getReply (channelID, messageID) {
    let { data } = await this.client.messageApi.message(channelID, messageID)
    const { raw_message } = await this.getMessage(data.message)
    const source = {
      rand: 1,
      time: this.getTime(data.message.timestamp),
      seq: data.message.id,
      user_id: data.message.author.id,
      message: raw_message
    }
    return source
  }

  /** ISO8601标准时间转Unix时间戳 */
  getTime (time) {
    return parseInt(Date.parse(time) / 1000)
  }

  /** 获取群名称 */
  async getGroupName (guildId, channelId, friend) {
    const group_id = `qg_${guildId}-${channelId}`
    let group_name = Bot.gl.get(group_id)
    if (group_name) return group_name.group_name
    const guild = await this.client.guildApi.guild(guildId)
    group_name = guild.data.name
    if (friend) {
      group_name = `来自"${group_name}"频道`

      /** 一个子频道为一个群 */
      Bot.gl.set(group_id, { group_name, uin: this.id })
      Bot[this.id].gl.set(group_id, { group_name, uin: this.id })
    } else {
      let { data } = await this.client.channelApi.channel(channelId)
      group_name = `${group_name}-${data.name}`

      /** 一个子频道为一个群 */
      Bot.gl.set(group_id, { ...data, group_name, uin: this.id })
      Bot[this.id].gl.set(group_id, { ...data, group_name, uin: this.id })
    }

    return group_name
  }

  /** 获取用户头像 */
  async getAvatarUrl (guildId, userId) {
    let { data } = await this.client.guildApi.guildMember(guildId, userId)
    return data
  }

  /** 禁言 */
  async muteMember (guildId, userId, time) {
    return await this.client.muteApi.muteMember(guildId, userId, { seconds: time })
  }

  /** 全体禁言 */
  async muteAllMember (guildId, seconds) {
    seconds = seconds ? '886400' : '0'
    return await this.client.muteApi.muteAll(guildId, { seconds })
  }

  /** 踹俩脚 */
  async kickMember (guildId, userId) {
    return await this.client.guildApi.deleteGuildMember(guildId, userId)
  }

  /** 撤回消息 */
  async recall (channelId, msgId, friend) {
    /** wiki没写公域无权，暂时屏蔽 */
    if (friend || !this.allMsg) return {}
    return await this.client.messageApi.deleteMessage(channelId, msgId, false)
  }

  /** 群对象 */
  pickGroup (group_id) {
    const [guild_id, channel_id] = group_id.replace('qg_', '').trim().split('-')
    const name = Bot[this.id].gl.get(group_id)?.group_name || group_id
    const is_admin = Bot[this.id].gml.get(group_id)?.is_admin || false
    const is_owner = Bot[this.id].gml.get(group_id)?.is_owner || false
    return {
      name,
      is_admin: is_owner || is_admin,
      is_owner,
      /** 发送消息 */
      sendMsg: async (msg) => await this.sendGroupMsg(group_id, msg),
      /** 撤回消息 */
      recallMsg: async (msg_id) => await this.recall(channel_id, msg_id),
      /** 制作转发 */
      makeForwardMsg: async (message) => await common.makeForwardMsg(message),
      /** 戳一戳 */
      pokeMember: async () => '',
      /** 禁言 */
      muteMember: async (user_id, time) => await this.muteMember(guild_id, user_id, time),
      /** 全体禁言 */
      muteAll: async (time) => await this.muteAllMember(guild_id, time),
      /** 设置管理 */
      setAdmin: async (qq, type) => '',
      /** 踢 */
      kickMember: async (qq) => await this.kickMember(guild_id, qq),
      /** 头衔 **/
      setTitle: async () => '',
      pickMember: (id) => this.pickMember(group_id, id),
      /** 获取群成员列表 */
      getMemberMap: async () => '',
      /** 设置精华 */
      setEssenceMessage: async (msg_id) => await this.setEssenceMessage(channel_id, msg_id),
      /** 移除群精华消息 **/
      removeEssenceMessage: async (msg_id) => await this.removeEssenceMessage(channel_id, msg_id),
      /** 获取聊天记录 */
      getChatHistory: async (msg_id) => await this.getChatHistory(channel_id, msg_id)
    }
  }

  /** 私信对象 */
  pickFriend (user_id) {
    return {
      sendMsg: async (msg) => await this.sendFriendMsg(user_id, msg, false),
      recallMsg: async (msg_id) => await this.recall(msg_id),
      makeForwardMsg: async (message) => await this.makeForwardMsg(message),
      getAvatarUrl: (size = 0) => '',
      getChatHistory: async (msg_id) => await this.getChatHistory(user_id, msg_id)
    }
  }

  /** 群员对象 */
  pickMember (group_id, user_id) {
    return { error: 'pickMember暂未实现' }
  }

  /** 获取聊天记录 官方接口目前只能获取指定msg_id的消息，后续看看有时间自己实现一下 */
  async getChatHistory (channel_id, msg_id) {
    let { data } = await this.client.messageApi.message(channel_id, msg_id)
    return [await this.ICQQEvent(data.message)]
  }

  /** 设置精华 */
  async setEssenceMessage (channelId, messageId) {
    return await this.client.pinsMessageApi.putPinsMessage(channelId, messageId)
  }

  /** 取消精华 */
  async removeEssenceMessage (channelId, messageId) {
    return await this.client.pinsMessageApi.deletePinsMessage(channelId, messageId)
  }

  /** 判断频道黑白名单 */
  checkBlack (guild_id, channel_id) {
    const config = Cfg.getQQGuild(guild_id)
    /** 过白名单频道 */
    if (Array.isArray(config.whiteGuild) && config.whiteGuild.length > 0) {
      return config.whiteGuild.includes(String(guild_id))
    }
    /** 过黑名单频道 */
    if (Array.isArray(config.blackGuild) && config.blackGuild.length > 0) {
      return !config.blackGuild.includes(String(guild_id))
    }

    /** 过白名单子频道 */
    if (Array.isArray(config.whiteChannel) && config.whiteChannel.length > 0) {
      return config.whiteChannel.includes(String(channel_id)) || config.whiteChannel.includes(Number(channel_id))
    }
    /** 过黑名单子频道 */
    if (Array.isArray(config.blackChannel) && config.blackChannel.length > 0) {
      return !config.blackChannel.includes(String(channel_id)) || !config.blackChannel.includes(Number(channel_id))
    }
    return true
  }

  /** 判断是否启用功能 */
  checkDisable (e, p, raw_message) {
    let groupCfg = Cfg.getGroup(this.id.replace('qg_', ''))
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

  /** 回复消息 被动 */
  async sendReplyMsg (e, friend, message, quote) {
    const { guild_id, channel_id } = e
    message = common.array(message)
    message.push({ type: 'reply', id: e.message_id })
    message = await this.QQGuildMessage(message, quote)
    let data
    for (const item of message) {
      try {
        common.info(this.id, `<发频道:${e.group_name}(${e.group_id})> => ${this.sendMsgtoString(item)}`)
        if (friend) {
          data = await this.client.directMessageApi.postDirectMessage(guild_id, item)
        } else {
          data = await this.client.messageApi.postMessage(channel_id, item)
        }
        data = data.data
      } catch (error) {
        common.error(this.id, '发送错误：', error)
      }
    }
    return {
      ...data,
      message_id: data?.id
    }
  }

  /** 发送主动消息 */
  async sendGroupMsg (group_id, message) {
    const guild = group_id.replace('qg_', '').trim().split('-')
    message = await this.QQGuildMessage(message)
    let data
    for (const item of message) {
      try {
        common.info(this.id, `<发频道:${group_id}> => ${this.sendMsgtoString(item)}`)
        data = await this.client.messageApi.postMessage(guild[1], item)
        data = data.data
      } catch (error) {
        common.error(this.id, '发送错误：', error)
      }
    }
    return {
      ...data,
      message_id: data?.id
    }
  }

  /** 主动私信消息 */
  async sendFriendMsg (guild_id, user_id, message) {
    let friend = await this.friendMessage((guild_id, user_id.replace('qg_', '')))
    guild_id = friend.guild_id
    message = await this.QQGuildMessage(message)
    let data
    for (const item of message) {
      try {
        common.info(this.id, `<发私信:${guild_id}-${user_id}> => ${this.sendMsgtoString(item)}`)
        data = await this.client.directMessageApi.postDirectMessage(guild_id, item)
        data = data.data
      } catch (error) {
        common.error(this.id, '发送错误：', error)
      }
    }
    return {
      ...data,
      message_id: data?.id
    }
  }

  /** 转换message为sdk可以使用的 */
  async QQGuildMessage (data, quote) {
    data = common.array(data)

    let reply
    const Pieces = []
    const image = []
    const text = []

    /** chatgpt-plugin */
    if (data?.[0].type === 'xml') data = data?.[0].msg

    for (const i of data) {
      switch (i.type) {
        case 'at':
          text.push(`<@${(i.qq || i.id).replace('qg_', '')}>`)
          break
        case 'face':
          text.push(`<emoji:${i.id}>`)
          break
        case 'forward':
        case 'text':
          if (String(i.text).trim()) {
            for (let item of (await Bot.HandleURL(i.text.trim()))) {
              item.type === 'image' ? image.push(item.file) : text.push(item.text)
            }
          }
          break
        case 'image':
          image.push(await Bot.Buffer(await Bot.FormatFile(i.url || i.file)))
          break
        case 'video':
          text.push('[视频消息]')
          break
        case 'record':
          text.push('[语音消息]')
          break
        case 'reply':
          reply = i
          break
        case 'ark':
        case 'button':
        case 'markdown':
          text.push('[高阶能力暂未支持]')
          break
        default:
          text.push(JSON.stringify(i))
          break
      }
    }

    /** 如果有图片就需要走文件上传接口 */
    if (image.length) {
      const File = new FormData()
      /** 文本类的消息 */
      if (text.length) File.set('content', text.length > 4 ? text.join('\n') : text.join(''))
      /** 被动消息id */
      if (reply) File.set('msg_id', reply.id)
      /** 处理第一张图 */
      if (image.length) File.set('file_image', new Blob([image.shift()]))

      /** 处理完成保存 */
      Pieces.push(File)

      /** 剩余图片另外处理 */
      if (image.length) {
        image.forEach(i => {
          const imageFile = new FormData()
          imageFile.set('file_image', new Blob([i]))
          /** 被动消息id */
          if (reply) imageFile.set('msg_id', reply.id)
          Pieces.push(imageFile)
        })
      }
    } else {
      let msg = {}
      /** 引用消息 */
      if (quote) {
        msg.message_quote = {
          message_id: quote,
          ignore_get_message_error: true
        }
      }
      /** 被动消息 */
      if (reply) msg.msg_id = reply.id
      msg.content = text.length > 4 ? text.join('\n') : text.join('')
      Pieces.push(msg)
    }
    return Pieces
  }

  /** 发送消息可视化 */
  sendMsgtoString (data) {
    if (data instanceof FormData) {
      const content = []
      Array.from(data.entries()).map(([key, value]) => ({ type: key, file: value })).forEach(i => {
        if (i.type === 'file_image') content.push('[图片]')
        else if (i.type === 'content') content.push(i.file)
        else content.push(JSON.stringify(i))
      })
      return content.join('')
    }
    /** 普通文本 */
    if (data.content) return data.content
  }

  /** 其他事件 */
  async otherEvent (data) {
    let msg = data.msg
    switch (data.eventType) {
      /** 机器人被加入频道 */
      case 'GUILD_CREATE':
        try {
          await common.sleep(2000)
          await this.LoadAll()
          return common.info(this.id, `[${msg.name}(qg_${msg.id})] 机器人加入频道，操作人：${await this.guildMember(msg.id, msg.op_user_id)})`)
        } catch {
          return common.info(this.id, `[${msg.name}(qg_${msg.id})] 机器人加入频道，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
        }
      /** 频道信息变更 */
      case 'GUILD_UPDATE':
        return common.info(this.id, `[${msg.name}(${msg.id})] 频道信息变更，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
      /** 机器人被移除频道 */
      case 'GUILD_DELETE':
        return common.info(this.id, `[${msg.name}(${msg.id})] 机器人被移除频道，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
      /** 子频道被创建 */
      case 'CHANNEL_CREATE':
        return common.info(this.id, `[${msg.name}(${msg.id})] 子频道被创建，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
      /** 子频道信息变更 */
      case 'CHANNEL_UPDATE':
        return common.info(this.id, `[${msg.name}(${msg.id})] 子频道信息变更，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
      /** 子频道被删除 */
      case 'CHANNEL_DELETE':
        return common.info(this.id, `[${msg.name}(${msg.id})] 子频道被删除，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
      /** 新增用户、机器人 */
      case 'GUILD_MEMBER_ADD':
        await common.sleep(2000)
        if (msg.user.bot) {
          return common.info(this.id, `[${await this.guild(msg.guild_id)}] 频道新增机器人：${msg.user.username}(${msg.user.id})，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
        } else {
          return common.info(this.id, `[${await this.guild(msg.guild_id)}] 新用户加入频道：${msg.user.username}(${msg.user.id})`)
        }
      /** 用户属性发生变化 */
      case 'GUILD_MEMBER_UPDATE':
        return common.debug(this.id, JSON.stringify(data))
      /** 用户退出频道 */
      case 'GUILD_MEMBER_REMOVE':
        if (msg.op_user_id === msg.user.id) {
          return common.info(this.id, `[${await this.guild(msg.guild_id)})] 用户退出频道：${msg.user.username}(${msg.user.id})`)
        } else {
          return common.info(this.id, `[${await this.guild(msg.guild_id)})] 用户被移除频道：${msg.user.username}(${msg.user.id})，操作人：${await this.guildMember(msg.id, msg.op_user_id)}`)
        }
      /** 添加表情动态 */
      case 'MESSAGE_REACTION_ADD':
        return common.info(this.id, `[qg_${msg.guild_id}-${msg.channel_id}] 为消息 ${msg.target.id} 添加表情emoji：${msg.emoji.id}`)
      /** 取消表情动态 */
      case 'MESSAGE_REACTION_REMOVE':
        return common.info(this.id, `[qg_${msg.guild_id}-${msg.channel_id}] 为消息 ${msg.target.id} 删除表情emoji：${msg.emoji.id}`)
      /** 私域、公域撤回消息 */
      case 'MESSAGE_DELETE':
      case 'PUBLIC_MESSAGE_DELETE':
        if (msg.op_user.id === msg.message.author.id) {
          const { author, channel_id, guild_id, id } = msg.message
          return common.info(this.id, `<频道:qg_${guild_id}-${channel_id}><用户:${author.username}(${author.id})> => 撤回消息：${id}`)
        } else {
          const { author, channel_id, guild_id, id } = msg.message
          return common.info(this.id, `<频道:qg_${guild_id}-${channel_id}><用户:${author.username}(${author.id})> => 管理员撤回消息：${id}，操作人：${await this.guildMember(guild_id, msg.op_user.id)}`)
        }
      /** 私信撤回消息 */
      case 'DIRECT_MESSAGE_DELETE':
        if (msg) {
          const { author, channel_id, src_guild_id, id } = msg.message
          return common.info(this.id, `<私信:qg_${src_guild_id}-${channel_id}><用户:${author.username}(${author.id})> => 撤回消息：${id}`)
        }
    }
  }

  /** 获取频道详情 */
  async guild (guildId) {
    try {
      let { data } = await this.client.guildApi.guild(guildId)
      return `${data.name}(${data.id})`
    } catch {
      return guildId
    }
  }

  /** 获取操作人信息 */
  async guildMember (guild_id, user_id) {
    try {
      let { data } = await this.client.guildApi.guildMember(guild_id, user_id.replace('qg_', ''))
      return `${data.nick}(${user_id})`
    } catch {
      return user_id
    }
  }
}

common.info('Lain-plugin', 'QQ频道Bot适配器加载完成')
