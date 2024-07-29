import lodash from 'lodash'
import fs from 'node:fs'
import MiaoCfg from '../../../../lib/config/config.js'
import common from '../../lib/common/common.js'
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
      Bot.emit('message', await this.GroupMessage(data))
    })
    this.sdk.on('message.private.direct', async (data) => {
      Bot.emit('message', await this.GroupMessage(data, 'friend'))
    })

    // 有点怪 先简单处理下
    let id = this.id
    let avatar
    let username = 'QQGuild'
    try {
      const info = await this.sdk.getSelfInfo()
      id = info.id
      avatar = info.avatar
      username = info.username
    } catch (err) {
      lain.warn(this.id, err)
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
      getGroupMemberInfo: (group_id, user_id) => Bot.getGroupMemberInfo(group_id, user_id),
      /** 消息存储，用于检测撤回以及回复消息 */
      MsgSave: new Map()
    }

    /** 加载缓存中的群列表 */
    this.gmlList('gl')
    /** 加载缓存中的好友列表 */
    this.gmlList('fl')

    if (!Bot[this.id].config.allMsg) Bot[this.id].version.id = '私域'
    if (!Bot.adapter.includes(String(this.id))) Bot.adapter.push(String(this.id))

    /** 重启 */
    await common.init('Lain:restart:QQGuild')
    return lain.info(this.id, `QQGuild：<${username}(${this.id})> 连接成功!`)
  }

  /** 加载缓存中的群、好友列表 */
  async gmlList (type = 'gl') {
    try {
      const List = await redis.keys(`lain:guild:${type}:${this.id}:*`)
      List.forEach(async i => {
        const info = JSON.parse(await redis.get(i))
        info.uin = this.id
        lain.debug(this.id, '<读取缓存群，好友列表>', type, info)
        if (type === 'gl') {
          Bot[this.id].gl.set(info.group_id, info)
        } else {
          Bot[this.id].fl.set(info.user_id, info)
        }
      })
    } catch (err) {
      lain.warn(this.id, err)
    }
  }

  async GroupMessage (e, friend) {
    let { self_id: _tiny_id, ...data } = e
    const { guild_id, channel_id, member, author, src_guild_id } = e
    const { id: userId, username: nickname, avatar } = author

    const group_id = `qg_${guild_id}${!friend ? `-${channel_id}` : ''}`
    const user_id = `qg_${userId}`

    /** 存储消息用于回复以及检测撤回 */
    this.SaveMsg(e, friend, group_id, user_id)

    // 保存用户信息至云崽
    await this.saveInfo(friend, group_id, src_guild_id || guild_id, channel_id, user_id).catch(error => lain.error(this.id, `Bot无法在频道 ${src_guild_id || guild_id} 中获取信息，请给予权限...错误信息：`, error))

    const is_owner = member.roles && (member.roles.includes('4') || false)
    const is_admin = member.roles && (member.roles.includes('2') || member.roles.includes('5') || false)
    const role = is_owner ? 'owner' : (is_admin ? 'admin' : 'member')
    const group_name = Bot[this.id][friend ? 'fl' : 'gl'].get(friend ? user_id : group_id)?.group_name || "未知"

    data.data = e
    data.uin = this.id // ???鬼知道哪来的这玩意，icqq都没有...
    data.bot = Bot[this.id]
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
    if (friend) {
      data.friend = this.pickFriend(user_id)
    } else {
      data.group = this.pickGroup(group_id)
      data.member = {
        card: '', // 名片
        client: '', // 客户端对象
        dm: friend, // 是否是私聊
        group: this.pickGroup(group_id),
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
        setAdmin: async () => Promise.reject(new Error('QQ频道未支持'))
      }
    }
    let { message, raw_message, log_message, ToString } = await this.getMessage(data.message, data.guild_id, data.channel_id, friend)
    data.message = message

    if (data?.source?.id) {
      const info = Bot[this.id].MsgSave.get(data.source.id)
      if (info?.author) {
        data.source.time = info.time
        data.source.message = info.raw_message
        data.source.user_id = info.author.id
      }
    }

    lain.info(this.id, `<${friend ? '私信' : '频道'}:${group_name}(${group_id})><用户:${nickname}(${user_id})> -> ${log_message}`)

    /** 处理前缀 */
    if (e.group_id && raw_message) {
      raw_message = this.hasAlias(raw_message, e, false)
      raw_message = raw_message.replace(/^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/, '#星铁')
    }

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

    return data
  }

  /** 存储消息用于回复以及检测撤回 */
  SaveMsg(e, friend, group_id, user_id) {
    let {
      event_id,
      channel_id,
      guild_id,
      message_id,
      message,
      raw_message,
      author,
      timestamp
    } = e

    if (!Bot[this.id].MsgSave.get(message_id)) {
      Bot[this.id].MsgSave.set(message_id, {
        event_id,
        channel_id,
        guild_id,
        message_id,
        message,
        raw_message,
        author,
        timestamp,
        time: timestamp
      })
      setTimeout(() => Bot[this.id].MsgSave.delete(message_id), 1 * 24 * 60 * 60)
    }
  }

  /** 保存用户信息至云崽 */
  async saveInfo (friend, group_id, guild_id, channel_id, user_id) {
    const guild = await this.sdk.getGuildInfo(guild_id)
    const user = await this.sdk.getGuildMemberInfo(guild_id, user_id.replace('qg_', ''))
    let channel = {}
    let group_name

    if (!friend) {
      /** 频道 */
      channel = await this.sdk.getChannelInfo(channel_id)
      group_name = `${guild.guild_name}-${channel.channel_name}`

      redis.set(`lain:guild:gl:${this.id}:${group_id}`, JSON.stringify({ user_id, group_id, guild_id, channel_id, uin: this.id }))

      Bot[this.id].gl.set(group_id, {
        uin: this.id,
        ...Bot[this.id].fl.get(group_id),
        ...guild,
        ...channel,
        ...user,
        group_id,
        group_name,
        group_avatar: guild.icon,
        guild_id: group_id.replace('qg_', ''),
        channel_id
      })
    } else {
      /** 用户 */
      group_name = `来自"${guild.guild_name}"频道`

      redis.set(`lain:guild:fl:${this.id}:${user_id}`, JSON.stringify({ user_id, group_id, guild_id, uin: this.id }))
    }

    /** 用户 */
    Bot[this.id].fl.set(user_id, {
      uin: this.id,
      ...Bot[this.id].fl.get(user_id),
      ...guild,
      ...channel,
      ...user,
      group_id,
      group_name,
      group_avatar: guild.icon,
      guild_id: group_id.replace('qg_', ''),
      channel_id
    })
  }

  /** 群对象 */
  pickGroup (groupID) {
    let info = Bot[this.id].gl.get(groupID)
    return {
      is_admin: false,
      is_owner: false,
      recallMsg: async (msgId) => await this.recallMsg(groupID, msgId, false),
      sendMsg: async (msg) => await this.sendGroupMsg(groupID, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      pickMember: async (userID) => await this.pickMember(groupID, userID),
      /** 戳一戳 */
      pokeMember: async (operatorId) => '',
      /** 禁言 */
      muteMember: async (groupId, userId, time) => Promise.reject(new Error('QQ频道未支持')),
      /** 全体禁言 */
      muteAll: async (type) => Promise.reject(new Error('QQ频道未支持')),
      getMemberMap: async () => Promise.reject(new Error('QQ频道未支持')),
      /** 退群 */
      quit: async () => Promise.reject(new Error('QQ频道未支持')),
      /** 设置管理 */
      setAdmin: async (qq, type) => Promise.reject(new Error('QQ频道未支持')),
      /** 踢 */
      kickMember: async (qq, rejectAddRequest = false) => Promise.reject(new Error('QQ频道未支持')),
      /** 头衔 **/
      setTitle: async (qq, title, duration) => Promise.reject(new Error('QQ频道未支持')),
      /** 修改群名片 **/
      setCard: async (qq, card) => Promise.reject(new Error('QQ频道未支持')),
      /** 获取群头像链接 */
      getAvatarUrl: () => info?.group_avatar || '',
      ...info
    }
  }

  /** 好友对象 */
  pickFriend (userId) {
    const info = Bot[this.id].fl.get(userId)
    return {
      recallMsg: async (msgId) => await this.recallMsg(userId, msgId, true),
      sendMsg: async (msg) => await this.sendFriendMsg(userId, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      getAvatarUrl: () => info?.avatar || '',
      ...info
    }
  }

  async pickMember (groupID, userID) {
    const info = await this.member(groupID, userID)
    return {
      info,
      getAvatarUrl: () => info?.avatar || '',
      ...info
    }
  }

  async member (groupID, userID) {
    let ret = {}
    try {
      let data = await this.sdk.getGuildMemberInfo(groupID.replace('qg_', '').split('-')[0], userID.replace('qg_', ''))
      ret.data = data
    } catch (error) {
      lain.error(this.id, error)
      return ret
    }

    if (ret?.data?.member_id) {
      ret.user_id = ret.data.member_id
      ret.open_id = ret.data.union_openid

      ret.is_owner = ret.data.roles && (ret.data.roles.includes('4') || false)
      ret.is_admin = ret.data.roles && (ret.data.roles.includes('2') || ret.data.roles.includes('5') || false)
      ret.role = ret.is_owner ? 'owner' : (ret.is_admin ? 'admin' : 'member')

      ret.card = ret.data.card
      ret.nickname = ret.data.nickname
      ret.avatar = ret.data.avatar

      ret.join_time = ret.data.join_time
    }

    return ret
  }

  /** 撤回消息 */
  async recallMsg(id, msg_id, friend) {
    let info = Bot[this.id].MsgSave.get(msg_id)
    const user = Bot[this.id][friend ? 'fl' : 'gl'].get(id)
    /** 先打印日志 */
    try {
      if (!info) {
        try {
          if (!friend && user?.channel_id) {
            const data = await this.sdk.getGuildMessage(user.channel_id, msg_id);
            info = data;
          }
        } catch (error) {
          lain.warn(this.id, error.message);
        }
      }

      let msg = [
        '撤回消息:',
        `频道ID：${info?.guild_id || user?.guild_id || '未知频道id'}`,
        `子频道ID：${info?.channel_id || user?.channel_id || '未知子频道id'}`,
        `详细信息：`,
        `时间：${info?.timestamp || user?.timestamp || parseInt(Date.now() / 1000)}`,
        `用户ID：${info?.author?.id || user?.author?.id || '未知用户id'}`,
        `用户昵称：${info?.author?.username || user?.author?.author || '未知昵称'}`,
        `用户是否为机器人：${info?.author?.bot || user?.author?.bot || '否'}`,
        `消息内容：${info?.raw_message || user?.raw_message || '未知内容'}`
      ]

      /** 打印日志 */
      lain.info(this.id, msg.join('\n'))
    } catch (error) {
      lain.error(this.id, error)
    }

    /** 撤回消息 */
    if (friend && user?.guild_id) return await this.sdk.recallDirectMessage(user.guild_id, msg_id).catch(error => lain.warn(this.id, error.message))
    else if (user?.channel_id) return await this.sdk.recallGuildMessage(user.channel_id, msg_id).catch(error => lain.warn(this.id, error.message))
  }

  /** 处理消息事件 */
  async getMessage (data, guildId, channelId, friend) {
    const message = []
    const ToString = []
    const raw_message = []
    const log_message = []

    for (let i of data) {
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
        case 'reply':
          let info = Bot[this.id].MsgSave.get(i.message_id)
          if (!info) {
            try {
              if (!friend) {
                const data = await this.sdk.getGuildMessage(channelId, i.id);
                info = data;
              }
            } catch (error) {
              lain.warn(this.id, error.message);
            }
          }

          message.unshift({ type: 'reply', id: i.id })
          log_message.unshift(`<回复:${info?.author?.username || i.id}>`)
          ToString.unshift(`{reply:${info?.author?.username || i.id}}`)
          break
        case 'markdown':
          raw_message.push('[markdown]')
          log_message.push(`<markdown:${JSON.stringify(i)}>`)
          ToString.push(`{markdown:${JSON.stringify(i)}}`)
          break
        case 'embed':
          raw_message.push(JSON.stringify(i))
          log_message.push(`<embed:${JSON.stringify(i)}>`)
          ToString.push(JSON.stringify(i))
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
    }

    return { message, raw_message: raw_message.join(''), log_message: log_message.join(''), ToString: ToString.join('') }
  }

  /** 处理回复消息 */
  async sendReplyMsg (data, msg, quote) {
    let { Pieces, messageLog, reply } = await this.getQQGuild(msg)
    const info = data.message_type === 'group' ? '频道' : '私信'
    lain.info(this.id, `<回复${info}:${data.group_name}(${data.group_id})> => ${messageLog}`)
    let result = { res: [], err: [] }
    for (let item of Pieces) {
      try {
        lain.debug(`发送回复${info}消息：`, JSON.stringify(item))

        if (reply) item = Array.isArray(item) ? [reply, ...item] : [reply, item]
        else if (quote) item = Array.isArray(item) ? [{ type: 'reply', id: data.message_id }, ...item] : [{ type: 'reply', id: data.message_id }, item]

        let res = await data.data.reply(item)
        res.message_id = res.id
        lain.debug(this.id, `回复${info}消息返回：`, res)
        result.res.push(res)
      } catch (error) {
        lain.error(this.id, error)
        result.err.push(error)
      }
    }
    return result
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
            if (i.type === 'forward') {
              lain.debug(this.id, '<解析转发消息>', i)
              for (let i2 of i.text) {
                if (i2?.type == 'image') {
                  image.push(i2)
                  messageLog.push(`<图片:${typeof i2.file === 'string' ? i2.file.replace(/base64:\/\/.*/, 'base64://...') : 'base64://...'}>`)
                } else if (i2?.type == 'button') {
                  message.push(i2)
                  messageLog.push('<button>')
                } else if (String(i2).trim()) {
                  for (let p of (await Bot.HandleURL(i2))) {
                    if (p.type === 'image') {
                      image.push(p)
                      messageLog.push(`<图片:${typeof p.file === 'string' ? p.file.replace(/base64:\/\/.*/, 'base64://...') : 'base64://...'}>`)
                    } else {
                      text.push(p.text)
                      messageLog.push(p.text.substring(0, 1000).trim())
                    }
                  }
                }
              }
              break
            }

            for (let p of (await Bot.HandleURL(i))) {
              if (p.type === 'image') {
                image.push(p)
                messageLog.push(`<图片:${typeof p.file === 'string' ? p.file.replace(/base64:\/\/.*/, 'base64://...') : 'base64://...'}>`)
              } else {
                text.push(p.text)
                messageLog.push(p.text.substring(0, 1000).trim())
              }
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
        case 'embed':
          message.push(i)
          messageLog.push(`<${i.type}>`)
          break
        case 'markdown':
          message.push(i)
          messageLog.push(`<markdown:${i.content ? `content=${i.content}` : `template_id=${i.custom_template_id}`}>`)
          break
        default:
          message.push(i)
          messageLog.push(`<未知(${i.type}):${JSON.stringify(i)}>`)
          break
      }
    }

    if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
    if (image.length) message.push(image.shift())
    if (image.length) Pieces.push(...image)

    /** 合并为一个数组 */
    return { Pieces: message.length ? [message, ...Pieces] : Pieces, reply, messageLog: messageLog.join('') }
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
          if ([1, '1', 4, '4'].includes(Bot[this.id].config.markdown.type)) text.push(`<@${(i.qq || i.id).trim().split('_')[1]}>`)
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

    switch (Bot[this.id].config.markdown.type) {
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
          lain.error(this.id, error)
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
  async sendFriendMsg (user_id, data) {
    /** 暂时屏蔽下 */
    if (!(user_id || data)) {
      throw new Error('不存在此频道，正确请求格式：Bot.pickFriend(user_id).sendMsg(msg)')
    }

    const { group_id, guild_id } = Bot[this.id].fl.get(user_id)
    user_id = user_id.replace('qg_', '')
    let { Pieces, messageLog, reply } = await this.getQQGuild(data)
    lain.info(this.id, `<发送主动私信消息:${group_id})> => ${messageLog}`)
    /** 先创建私信会话 */
    const directData = await this.sdk.createDirectSession(guild_id, user_id)
    let result = { res: [], err: [] }
    for (let item of Pieces) {
      try {
        if (reply) item = Array.isArray(item) ? [reply, ...item] : [reply, item]
        let res = await this.sdk.sendDirectMessage(directData.guild_id, item)
        res.message_id = res.id
        result.res.push(res)
      } catch (error) {
        lain.error(this.id, '发送主动私信消息息失败：', error)
        result.err.push(error)
      }
    }
    return result
  }

  /** 发送主动群消息 */
  async sendGroupMsg (groupID, data) {
    const channel_id = groupID.replace('qg_', '').split('-')[1]
    let { Pieces, messageLog, reply } = await this.getQQGuild(data)
    lain.info(this.id, `<发送主动频道消息:${groupID})> => ${messageLog}`)
    let result = { res: [], err: [] }
    for (let item of Pieces) {
      try {
        if (reply) item = Array.isArray(item) ? [reply, ...item] : [reply, item]
        let res = await this.sdk.sendGuildMessage(channel_id, item)
        res.message_id = res.id
        result.res.push(res)
      } catch (error) {
        lain.error(this.id, '发送频道主动消息失败：', error)
        result.err.push(error)
      }
    }
    return result
  }
}

lain.info('Lain-plugin', 'QQ频道适配器加载完成')
