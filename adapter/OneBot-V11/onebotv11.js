/** The core code comes from： https://github.com/TimeRainStarSky/Yunzai
 * thanks for TimeRainStarSky!! https://github.com/TimeRainStarSky/
 * license: GPL-3.0
 * Ported the code by snowtafir https://github.com/snowtafir
 */
import path from "node:path"
import { ulid } from "ulid"
import { WebSocketServer } from 'ws'
import fs from 'fs/promises'

class OneBotv11Adapter {
  constructor(socket, request) {
    this.id = "QQ"
    this.name = "OneBotv11"
    this.path = this.name
    this.echo = {}
    this.timeout = 60000
    /** 存一下 */
    //bot.request = request
    /** 机器人QQ号 */
    this.self_id = Number(request.headers['x-self-id'])
    this.user_agent = request.headers['user-agent']
    /** ws */
    this.ws = socket
    /** 监听事件 */
    this.ws.on('message', (data) => this.message(data, this.ws));
    /** 监听连接关闭事件 */
    this.ws.on('close', () => logger.warn(`[Lain-plugin] [OneBotV11] : ${this.self_id} 连接已断开`))
  }

  /**
   * 生成日志信息
   * @param {string} msg - 日志信息
   * @returns {string} - 处理后的日志信息
   */
  makeLog(msg) {
    let logMsg = this.BotString(msg);
    logMsg.replace(/base64:\/\/.*?(,|]|")/g, "base64://...$1");
    if (logMsg.length > 200) {
      logMsg = logMsg.substring(0, 200) + '...';
    }
    return logMsg
  }

  /**
   * 通过WebSocket发送消息
   * @param {string|Buffer} msg - 消息内容
   * @param {WebSocket} ws - WebSocket实例
   * @returns {Promise<void>}
   */
  wsSendMsg(msg, ws) {
    if (!Buffer.isBuffer(msg)) msg = this.BotString(msg)
    lain.debug(this.self_id, ["消息", this.makeLog(msg)], `Bot: [${this.self_id}] => 客户端： [${this.user_agent}]`)
    return ws.send(msg)
  }

  /**
   * 发送API请求
   * @param {Object} data - 请求数据
   * @param {WebSocket} ws - WebSocket实例
   * @param {string} action - 操作名称
   * @param {Object} [params={}] - 参数
   * @returns {Promise<Object>} - 返回Promise对象
   */
  sendApi(data, ws, action, params = {}) {
    const echo = ulid()
    const request = { action, params, echo }
    this.wsSendMsg(request, ws)
    const error = Error()
    return new Promise((resolve, reject) =>
      this.echo[echo] = {
        request, resolve, reject, error,
        timeout: setTimeout(() => {
          reject(Object.assign(error, request, { timeout: this.timeout }))
          delete this.echo[echo]
          lain.error(this.self_id, ["请求超时", `${this.makeLog(request)}`], data.self_id)
          ws.terminate()
        }, this.timeout),
      }
    )
  }

  /**
   * 处理文件消息
   * @param {string|Buffer} file - 文件内容
   * @returns {Promise<string>} - 返回处理后的文件内容
   */
  async makeFile(file, opts) {
    // 如果 file 是 Uint8Array 类型，则转换为 Buffer 类型
    if (file instanceof Uint8Array) {
      file = Buffer.from(file);
    }
    file = await this.Buffer(file, { http: true, ...opts })
    if (Buffer.isBuffer(file))
      file = `base64://${file.toString("base64")}`
    return file
  }

  /** 异步获取文件状态的函数
   * @param {string} path - 文件路径
   * @param {Object} opts - 选项
   * @returns {Promise<fs.Stats|false>} - 返回文件状态或false（如果发生错误）
   */
  async fsStat(path, opts) {
    try {
      return await fs.stat(path, opts)
    } catch (err) {
      lain.error(this.self_id, ["获取", path, "状态错误", err])
      return false
    }
  }

  /** 
   * 将数据转换为Buffer对象的函数
   * @param {string|Buffer} data - 数据
   * @param {Object} [opts={}] - 选项
   * @returns {Promise<Buffer>} - 返回处理后的Buffer对象
  */
  async Buffer(data, opts = {}) {
    if (Buffer.isBuffer(data)) return data
    data = this.BotString(data)

    if (data.startsWith("base64://"))
      return Buffer.from(data.replace("base64://", ""), "base64")
    else if (data.match(/^https?:\/\//))
      return opts.http ? data : Buffer.from(await (await fetch(data, opts)).arrayBuffer())
    else if (await this.fsStat(data.replace(/^file:\/\//, "")))
      return opts.file ? `file://${path.resolve(data.replace(/^file:\/\//, ""))}` : Buffer.from(await fs.readFile(data))
    return data
  }

  /**
   * 生成消息
   * @param {Array|Object} msg - 消息内容
   * @returns {Promise<Array>} - 返回处理后的消息内容
   */
  async makeMsg(msg) {
    if (!Array.isArray(msg))
      msg = [msg]
    const msgs = []
    const forward = []
    for (let i of msg) {
      if (typeof i !== "object")
        i = { type: "text", data: { text: i } }
      else if (!i.data)
        i = { type: i.type, data: { ...i, type: undefined } }

      switch (i.type) {
        case "at":
          i.data.qq = String(i.data.qq)
          break
        case "reply":
          i.data.id = String(i.data.id)
          break
        case "button":
          continue
        case "node":
          forward.push(...i.data)
          continue
        case "raw":
          i = i.data
          break
      }

      if (i.data.file)
        i.data.file = await this.makeFile(i.data.file)

      msgs.push(i)
    }
    return [msgs, forward]
  }

  /**
   * 发送消息
   * @param {Array|Object} msg - 消息内容
   * @param {Function} send - 发送消息的函数
   * @param {Function} sendForwardMsg - 发送转发消息的函数
   * @returns {Promise<Object>} - 返回处理后的消息内容
   */
  async sendMsg(msg, send, sendForwardMsg) {
    const [message, forward] = await this.makeMsg(msg)
    const ret = []

    if (forward.length) {
      const data = await sendForwardMsg(forward)
      if (Array.isArray(data))
        ret.push(...data)
      else
        ret.push(data)
    }

    if (message.length)
      ret.push(await send(message))
    if (ret.length === 1) return ret[0]

    const message_id = []
    for (const i of ret) if (i?.message_id)
      message_id.push(i.message_id)
    return { data: ret, message_id }
  }

  /**
   * 发送好友消息
   * @param {Object} data - 数据
   * @param {Array|Object} msg - 消息内容
   * @returns {Promise<Object>} - 返回处理后的消息内容
   */
  sendFriendMsg(data, msg) {
    return this.sendMsg(msg, message => {
      lain.info(this.self_id, `发送好友消息：${this.makeLog(message)}`, `Bot: [${data.self_id}] => 好友： [${data.user_id}]`)
      return data.bot.sendApi("send_msg", {
        user_id: data.user_id,
        message,
      })
    }, msg => this.sendFriendForwardMsg(data, msg))
  }

  /**
   * 发送群消息
   * @param {Object} data - 数据
   * @param {Array|Object} msg - 消息内容
   * @returns {Promise<Object>} - 返回处理后的消息内容
   */
  sendGroupMsg(data, msg) {
    return this.sendMsg(msg, message => {
      lain.info(this.self_id, `发送群消息：${this.makeLog(message)}`, `Bot: [${data.self_id}] => 群：[${data.group_id}]`)
      return data.bot.sendApi("send_msg", {
        group_id: data.group_id,
        message,
      })
    }, msg => this.sendGroupForwardMsg(data, msg))
  }

  /**
   * 发送频道消息
   * @param {Object} data - 数据
   * @param {Array|Object} msg - 消息内容
   * @returns {Promise<Object>} - 返回处理后的消息内容
   */
  sendGuildMsg(data, msg) {
    return this.sendMsg(msg, message => {
      lain.info(this.self_id, `发送频道消息：${this.makeLog(message)}`, `Bot: [${data.self_id}] => 频道： [${data.guild_id}-${data.channel_id}]`)
      return data.bot.sendApi("send_guild_channel_msg", {
        guild_id: data.guild_id,
        channel_id: data.channel_id,
        message,
      })
    }, msg => Bot.sendForwardMsg(msg => this.sendGuildMsg(data, msg), msg))
  }

  /**
   * 撤回消息
   * @param {Object} data - 数据
   * @param {string|Array} message_id - 消息ID
   * @returns {Promise<Array>} - 返回处理后的消息内容
   */
  async recallMsg(data, message_id) {
    lain.info(this.self_id, `撤回消息：${message_id}`, data.self_id)
    if (!Array.isArray(message_id))
      message_id = [message_id]
    const msgs = []
    for (const i of message_id) {
      msgs.push(await data.bot.sendApi("delete_msg", { message_id: i }).catch(i => i))
    }
    return msgs
  }

  /**
   * 解析消息
   * @param {Array|Object} msg - 消息内容
   * @returns {Array} - 返回解析后的消息内容
   */
  parseMsg(msg) {
    const array = []
    for (const i of Array.isArray(msg) ? msg : [msg])
      if (typeof i === "object")
        array.push({ ...i.data, type: i.type })
      else
        array.push({ type: "text", text: String(i) })
    return array
  }

  /**
   * 获取消息
   * @param {Object} data - 数据
   * @param {string} message_id - 消息ID
   * @returns {Promise<Object>} - 返回消息内容
   */
  async getMsg(data, message_id) {
    const msg = (await data.bot.sendApi("get_msg", { message_id })).data
    if (msg?.message)
      msg.message = this.parseMsg(msg.message)
    return msg
  }

  /**
   * 获取群消息历史
   * @param {Object} data - 数据
   * @param {number} message_seq - 消息序列号
   * @param {number} count - 消息数量
   * @returns {Promise<Array>} - 返回消息历史内容
   */
  async getGroupMsgHistory(data, message_seq, count) {
    const msgs = (await data.bot.sendApi("get_group_msg_history", {
      group_id: data.group_id,
      message_seq,
      count,
    })).data?.messages

    for (const i of Array.isArray(msgs) ? msgs : [msgs])
      if (i?.message)
        i.message = this.parseMsg(i.message)
    return msgs
  }

  /**
   * 获取转发消息
   * @param {Object} data - 数据
   * @param {string} message_id - 消息ID
   * @returns {Promise<Array>} - 返回转发消息内容
   */
  async getForwardMsg(data, message_id) {
    const msgs = (await data.bot.sendApi("get_forward_msg", {
      message_id,
    })).data?.messages

    for (const i of Array.isArray(msgs) ? msgs : [msgs])
      if (i?.message)
        i.message = this.parseMsg(i.message || i.content)
    return msgs
  }

  /**
   * 生成转发消息
   * @param {Array} msg - 消息内容
   * @returns {Promise<Array>} - 返回处理后的转发消息内容
   */
  async makeForwardMsg(msg) {
    const msgs = []
    for (const i of msg) {
      const [content, forward] = await this.makeMsg(i.message)
      if (forward.length)
        msgs.push(...await this.makeForwardMsg(forward))
      if (content.length)
        msgs.push({
          type: "node", data: {
            name: i.nickname || "匿名消息",
            uin: String(Number(i.user_id) || 80000000),
            content,
            time: i.time,
          }
        })
    }
    return msgs
  }

  /**
   * 发送好友转发消息
   * @param {Object} data - 数据
   * @param {Array} msg - 消息内容
   * @returns {Promise<Object>} - 返回处理后的消息内容
   */
  async sendFriendForwardMsg(data, msg) {
    lain.info(this.self_id, `发送好友转发消息：${this.makeLog(msg)}`, `${data.self_id} => ${data.user_id}`)
    return data.bot.sendApi("send_private_forward_msg", {
      user_id: data.user_id,
      messages: await this.makeForwardMsg(msg),
    })
  }

  /**
   * 发送群转发消息
   * @param {Object} data - 数据
   * @param {Array} msg - 消息内容
   * @returns {Promise<Object>} - 返回处理后的消息内容
   */
  async sendGroupForwardMsg(data, msg) {
    lain.info(this.self_id, `发送群转发消息：${this.makeLog(msg)}`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("send_group_forward_msg", {
      group_id: data.group_id,
      messages: await this.makeForwardMsg(msg),
    })
  }

  /**
   * 获取好友列表数组
   * @param {Object} data - 包含bot实例的数据对象
   * @returns {Promise<Array>} - 好友列表数组
   */
  async getFriendArray(data) {
    return (await data.bot.sendApi("get_friend_list")).data || []
  }

  /**
   * 获取好友ID列表
   * @param {Object} data - 包含bot实例的数据对象
   * @returns {Promise<Array>} - 好友ID列表
   */
  async getFriendList(data) {
    const array = []
    for (const { user_id } of await this.getFriendArray(data))
      array.push(user_id)
    return array
  }

  /**
   * 获取好友信息映射
   * @param {Object} data - 包含bot实例的数据对象
   * @returns {Promise<Map>} - 好友信息映射
   */
  async getFriendMap(data) {
    const map = new Map
    for (const i of await this.getFriendArray(data))
      map.set(i.user_id, i)
    data.bot.fl = map
    return map
  }

  /**
   * 获取陌生好友信息
   * @param {Object} data - 包含bot实例和用户ID的数据对象
   * @returns {Promise<Object>} - 好友信息
   */
  getFriendInfo(data) {
    return data.bot.sendApi("get_stranger_info", {
      user_id: data.user_id,
    })
  }

  /**
   * 获取群组列表数组
   * @param {Object} data - 包含bot实例的数据对象
   * @returns {Promise<Array>} - 群组列表数组
   */
  async getGroupArray(data) {
    const array = (await data.bot.sendApi("get_group_list")).data
    try {
      for (const guild of await this.getGuildArray(data))
        for (const channel of await this.getGuildChannelArray({
          ...data,
          guild_id: guild.guild_id,
        }))
          array.push({
            guild,
            channel,
            group_id: `${guild.guild_id}-${channel.channel_id}`,
            group_name: `${guild.guild_name}-${channel.channel_name}`,
          })
    } catch (err) {
      //lain.error(this.self_id, ["获取频道列表错误", err])
    }
    return array
  }

  /**
   * 获取群组ID列表
   * @param {Object} data - 包含bot实例的数据对象
   * @returns {Promise<Array>} - 群组ID列表
   */
  async getGroupList(data) {
    const array = []
    for (const { group_id } of await this.getGroupArray(data))
      array.push(group_id)
    return array
  }

  /**
   * 获取群组信息映射
   * @param {Object} data - 包含bot实例的数据对象
   * @returns {Promise<Map>} - 群组信息映射
   */
  async getGroupMap(data) {
    const map = new Map
    for (const i of await this.getGroupArray(data))
      map.set(i.group_id, i)
    data.bot.gl = map
    return map
  }

  /**
   * 获取群组信息
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @returns {Promise<Object>} - 群组信息
   */
  getGroupInfo(data) {
    return data.bot.sendApi("get_group_info", {
      group_id: data.group_id,
    })
  }

  /**
   * 获取群组成员列表数组
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @returns {Promise<Array>} - 群组成员列表数组
   */
  async getMemberArray(data) {
    return (await data.bot.sendApi("get_group_member_list", {
      group_id: data.group_id,
    })).data || []
  }

  /**
   * 获取群组成员ID列表
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @returns {Promise<Array>} - 群组成员ID列表
   */
  async getMemberList(data) {
    const array = []
    for (const { user_id } of await this.getMemberArray(data))
      array.push(user_id)
    return array
  }

  /**
   * 获取群组成员信息映射
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @returns {Promise<Map>} - 群组成员信息映射
   */
  async getMemberMap(data) {
    const map = new Map
    for (const i of await this.getMemberArray(data))
      map.set(i.user_id, i)
    data.bot.gml.set(data.group_id, map)
    return map
  }

  /**
   * 获取群组成员信息映射（遍历所有群组）
   * @param {Object} data - 包含bot实例的数据对象
   */
  async getGroupMemberMap(data) {
    for (const [group_id, group] of await this.getGroupMap(data)) {
      if (group.guild) continue
      await this.getMemberMap({ ...data, group_id })
    }
  }

  /**
   * 获取群组成员信息
   * @param {Object} data - 包含bot实例、群组ID和用户ID的数据对象
   * @returns {Promise<Object>} - 群组成员信息
   */
  getMemberInfo(data) {
    return data.bot.sendApi("get_group_member_info", {
      group_id: data.group_id,
      user_id: data.user_id,
    })
  }

  /**
   * 获取频道列表数组
   * @param {Object} data - 包含bot实例的数据对象
   * @returns {Promise<Array>} - 频道列表数组
   */
  async getGuildArray(data) {
    return (await data.bot.sendApi("get_guild_list")).data || []
  }

  /**
   * 获取频道信息
   * @param {Object} data - 包含bot实例和频道ID的数据对象
   * @returns {Promise<Object>} - 频道信息
   */
  getGuildInfo(data) {
    return data.bot.sendApi("get_guild_meta_by_guest", {
      guild_id: data.guild_id,
    })
  }

  /**
   * 获取频道子频道列表数组
   * @param {Object} data - 包含bot实例和频道ID的数据对象
   * @returns {Promise<Array>} - 频道子频道列表数组
   */
  async getGuildChannelArray(data) {
    return (await data.bot.sendApi("get_guild_channel_list", {
      guild_id: data.guild_id,
    })).data || []
  }

  /**
   * 获取频道子频道信息映射
   * @param {Object} data - 包含bot实例和频道ID的数据对象
   * @returns {Promise<Map>} - 频道子频道信息映射
   */
  async getGuildChannelMap(data) {
    const map = new Map
    for (const i of await this.getGuildChannelArray(data))
      map.set(i.channel_id, i)
    return map
  }

  /**
   * 获取频道成员列表数组
   * @param {Object} data - 包含bot实例和频道ID的数据对象
   * @returns {Promise<Array>} - 频道成员列表数组
   */
  async getGuildMemberArray(data) {
    const array = []
    let next_token = ""
    while (true) {
      const list = (await data.bot.sendApi("get_guild_member_list", {
        guild_id: data.guild_id,
        next_token,
      })).data
      if (!list) break

      for (const i of list.members)
        array.push({
          ...i,
          user_id: i.tiny_id,
        })
      if (list.finished) break
      next_token = list.next_token
    }
    return array
  }

  /**
   * 获取频道成员ID列表
   * @param {Object} data - 包含bot实例和频道ID的数据对象
   * @returns {Promise<Array>} - 频道成员ID列表
   */
  async getGuildMemberList(data) {
    const array = []
    for (const { user_id } of await this.getGuildMemberArray(data))
      array.push(user_id)
    return array.push
  }

  /**
   * 获取频道成员信息映射
   * @param {Object} data - 包含bot实例和频道ID的数据对象
   * @returns {Promise<Map>} - 频道成员信息映射
   */
  async getGuildMemberMap(data) {
    const map = new Map
    for (const i of await this.getGuildMemberArray(data))
      map.set(i.user_id, i)
    data.bot.gml.set(data.group_id, map)
    return map
  }

  /**
   * 获取频道成员信息
   * @param {Object} data - 包含bot实例、频道ID和用户ID的数据对象
   * @returns {Promise<Object>} - 频道成员信息
   */
  getGuildMemberInfo(data) {
    return data.bot.sendApi("get_guild_member_profile", {
      guild_id: data.guild_id,
      user_id: data.user_id,
    })
  }

  /**
   * 设置个人资料
   * @param {Object} data - 包含bot实例的数据对象
   * @param {Object} profile - 个人资料对象
   * @returns {Promise<Object>} - 设置结果
   */
  setProfile(data, profile) {
    lain.info(this.self_id, `设置资料：${this.BotString(profile)}`, data.self_id)
    return data.bot.sendApi("set_qq_profile", profile)
  }

  /**
   * 设置头像
   * @param {Object} data - 包含bot实例的数据对象
   * @param {string} file - 头像文件路径
   * @returns {Promise<Object>} - 设置结果
   */
  async setAvatar(data, file) {
    lain.info(this.self_id, `设置头像：${file}`, data.self_id)
    return data.bot.sendApi("set_qq_avatar", {
      file: await this.makeFile(file),
    })
  }

  /**
   * 发送点赞
   * @param {Object} data - 包含bot实例和用户ID的数据对象
   * @param {number} times - 点赞次数
   * @returns {Promise<Object>} - 发送结果
   */
  sendLike(data, times) {
    lain.info(this.self_id, `点赞：${times}次`, `${data.self_id} => ${data.user_id}`)
    return data.bot.sendApi("send_like", {
      user_id: data.user_id,
      times,
    })
  }

  /**
   * 设置群名
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @param {string} group_name - 新群名
   * @returns {Promise<Object>} - 设置结果
   */
  setGroupName(data, group_name) {
    lain.info(this.self_id, `设置群名：${group_name}`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("set_group_name", {
      group_id: data.group_id,
      group_name,
    })
  }

  /**
   * 设置群头像
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @param {string} file - 头像文件路径
   * @returns {Promise<Object>} - 设置结果
   */
  async setGroupAvatar(data, file) {
    lain.info(this.self_id, `设置群头像：${file}`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("set_group_portrait", {
      group_id: data.group_id,
      file: await this.makeFile(file),
    })
  }

  /**
   * 设置群管理员
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @param {number} user_id - 用户ID
   * @param {boolean} enable - 是否设置为管理员
   * @returns {Promise<Object>} - 设置结果
   */
  setGroupAdmin(data, user_id, enable) {
    lain.info(this.self_id, `${enable ? "设置" : "取消"}群管理员：${user_id}`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("set_group_admin", {
      group_id: data.group_id,
      user_id,
      enable,
    })
  }

  /**
   * 设置群名片
   * @param {Object} data - 包含bot实例、群组ID和用户ID的数据对象
   * @param {number} user_id - 用户ID
   * @param {string} card - 新名片
   * @returns {Promise<Object>} - 设置结果
   */
  setGroupCard(data, user_id, card) {
    lain.info(this.self_id, `设置群名片：${card}`, `${data.self_id} => ${data.group_id}, ${user_id}`)
    return data.bot.sendApi("set_group_card", {
      group_id: data.group_id,
      user_id,
      card,
    })
  }

  /**
   * 设置群头衔
   * @param {Object} data - 包含bot实例、群组ID和用户ID的数据对象
   * @param {number} user_id - 用户ID
   * @param {string} special_title - 新头衔
   * @param {number} duration - 头衔持续时间
   * @returns {Promise<Object>} - 设置结果
   */
  setGroupTitle(data, user_id, special_title, duration) {
    lain.info(this.self_id, `设置群头衔：${special_title} ${duration}`, `${data.self_id} => ${data.group_id}, ${user_id}`)
    return data.bot.sendApi("set_group_special_title", {
      group_id: data.group_id,
      user_id,
      special_title,
      duration,
    })
  }

  /**
   * 发送群打卡
   * @param {Object} data - 包含bot实例和群组ID的数据对象
   * @returns {Promise<Object>} - 发送结果
   */
  sendGroupSign(data) {
    lain.info(this.self_id, "群打卡", `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("send_group_sign", {
      group_id: data.group_id,
    })
  }

  /**
   * 禁言群成员
   * @param {Object} data - 包含bot实例、群组ID和用户ID的数据对象
   * @param {number} user_id - 用户ID
   * @param {number} duration - 禁言时长（秒）
   * @returns {Promise<Object>} - 禁言结果
   */
  setGroupBan(data, user_id, duration) {
    lain.info(this.self_id, `禁言群成员：${duration}秒`, `${data.self_id} => ${data.group_id}, ${user_id}`)
    return data.bot.sendApi("set_group_ban", {
      group_id: data.group_id,
      user_id,
      duration,
    })
  }
  /**
   * 设置全员禁言
   * @param {Object} data - 数据对象
   * @param {boolean} enable - 是否开启全员禁言
   * @returns {Promise} - API调用返回的Promise
   */
  setGroupWholeKick(data, enable) {
    lain.info(this.self_id, `${enable ? "开启" : "关闭"}全员禁言`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("set_group_whole_ban", {
      group_id: data.group_id,
      enable,
    })
  }

  /**
   * 踢出群成员
   * @param {Object} data - 数据对象
   * @param {number} user_id - 用户ID
   * @param {boolean} reject_add_request - 是否拒绝再次加群
   * @returns {Promise} - API调用返回的Promise
   */
  setGroupKick(data, user_id, reject_add_request) {
    lain.info(this.self_id, `踢出群成员${reject_add_request ? "拒绝再次加群" : ""}`, `${data.self_id} => ${data.group_id}, ${user_id}`)
    return data.bot.sendApi("set_group_kick", {
      group_id: data.group_id,
      user_id,
      reject_add_request,
    })
  }

  /**
   * 设置群离开
   * @param {Object} data - 数据对象
   * @param {boolean} is_dismiss - 是否解散群
   * @returns {Promise} - API调用返回的Promise
   */
  setGroupLeave(data, is_dismiss) {
    lain.info(this.self_id, is_dismiss ? "解散" : "退群", `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("set_group_leave", {
      group_id: data.group_id,
      is_dismiss,
    })
  }

  /**
   * 下载文件
   * @param {Object} data - 数据对象
   * @param {string} url - 文件URL
   * @param {number} thread_count - 线程数
   * @param {Object} headers - 请求头
   * @returns {Promise} - API调用返回的Promise
   */
  downloadFile(data, url, thread_count, headers) {
    return data.bot.sendApi("download_file", {
      url,
      thread_count,
      headers,
    })
  }

  /**
   * 发送好友文件
   * @param {Object} data - 数据对象
   * @param {string} file - 文件路径
   * @param {string} [name=path.basename(file)] - 文件名
   * @returns {Promise} - API调用返回的Promise
   */
  async sendFriendFile(data, file, name = path.basename(file)) {
    lain.info(this.self_id, `发送好友文件：${name}(${file})`, `${data.self_id} => ${data.user_id}`)
    return data.bot.sendApi("upload_private_file", {
      user_id: data.user_id,
      file: await this.makeFile(file, { file: true }),
      name,
    })
  }

  /**
   * 发送群文件
   * @param {Object} data - 数据对象
   * @param {string} file - 文件路径
   * @param {string} folder - 文件夹路径
   * @param {string} [name=path.basename(file)] - 文件名
   * @returns {Promise} - API调用返回的Promise
   */
  async sendGroupFile(data, file, folder, name = path.basename(file)) {
    lain.info(this.self_id, `发送群文件：${folder || ""}/${name}(${file})`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("upload_group_file", {
      group_id: data.group_id,
      folder,
      file: await this.makeFile(file, { file: true }),
      name,
    })
  }

  /**
   * 删除群文件
   * @param {Object} data - 数据对象
   * @param {string} file_id - 文件ID
   * @param {number} busid - 文件BUSID
   * @returns {Promise} - API调用返回的Promise
   */
  deleteGroupFile(data, file_id, busid) {
    lain.info(this.self_id, `删除群文件：${file_id}(${busid})`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("delete_group_file", {
      group_id: data.group_id,
      file_id,
      busid,
    })
  }

  /**
   * 创建群文件夹
   * @param {Object} data - 数据对象
   * @param {string} name - 文件夹名称
   * @returns {Promise} - API调用返回的Promise
   */
  createGroupFileFolder(data, name) {
    lain.info(this.self_id, `创建群文件夹：${name}`, `${data.self_id} => ${data.group_id}`)
    return data.bot.sendApi("create_group_file_folder", {
      group_id: data.group_id,
      name,
    })
  }

  /**
   * 获取群文件系统信息
   * @param {Object} data - 数据对象
   * @returns {Promise} - API调用返回的Promise
   */
  getGroupFileSystemInfo(data) {
    return data.bot.sendApi("get_group_file_system_info", {
      group_id: data.group_id,
    })
  }

  /**
   * 获取群文件列表
   * @param {Object} data - 数据对象
   * @param {string} [folder_id] - 文件夹ID
   * @returns {Promise} - API调用返回的Promise
   */
  getGroupFiles(data, folder_id) {
    if (folder_id)
      return data.bot.sendApi("get_group_files_by_folder", {
        group_id: data.group_id,
        folder_id,
      })
    return data.bot.sendApi("get_group_root_files", {
      group_id: data.group_id,
    })
  }

  /**
   * 获取群文件URL
   * @param {Object} data - 数据对象
   * @param {string} file_id - 文件ID
   * @param {number} busid - 文件BUSID
   * @returns {Promise} - API调用返回的Promise
   */
  getGroupFileUrl(data, file_id, busid) {
    return data.bot.sendApi("get_group_file_url", {
      group_id: data.group_id,
      file_id,
      busid,
    })
  }

  /**
   * 获取群文件系统操作对象
   * @param {Object} data - 数据对象
   * @returns {Object} - 文件系统操作对象
   */
  getGroupFs(data) {
    return {
      upload: (file, folder, name) => this.sendGroupFile(data, file, folder, name),
      rm: (file_id, busid) => this.deleteGroupFile(data, file_id, busid),
      mkdir: name => this.createGroupFileFolder(data, name),
      df: () => this.getGroupFileSystemInfo(data),
      ls: folder_id => this.getGroupFiles(data, folder_id),
      download: (file_id, busid) => this.getGroupFileUrl(data, file_id, busid),
    }
  }

  /**
   * 设置好友添加请求
   * @param {Object} data - 数据对象
   * @param {string} flag - 请求标识
   * @param {boolean} approve - 是否同意
   * @param {string} [remark] - 备注
   * @returns {Promise} - API调用返回的Promise
   */
  setFriendAddRequest(data, flag, approve, remark) {
    return data.bot.sendApi("set_friend_add_request", {
      flag,
      approve,
      remark,
    })
  }

  /**
   * 设置群添加请求
   * @param {Object} data - 数据对象
   * @param {string} flag - 请求标识
   * @param {string} sub_type - 子类型
   * @param {boolean} approve - 是否同意
   * @param {string} [reason] - 理由
   * @returns {Promise} - API调用返回的Promise
   */
  setGroupAddRequest(data, flag, sub_type, approve, reason) {
    return data.bot.sendApi("set_group_add_request", {
      flag,
      sub_type,
      approve,
      reason,
    })
  }

  /**
   * 选择好友
   * @param {Object} data - 数据对象
   * @param {number} user_id - 用户ID
   * @returns {Object} - 好友操作对象
   */
  pickFriend(data, user_id) {
    const i = {
      ...data.bot.fl.get(user_id),
      ...data,
      user_id,
    }
    return {
      ...i,
      sendMsg: msg => this.sendFriendMsg(i, msg),
      getMsg: message_id => this.getMsg(i, message_id),
      recallMsg: message_id => this.recallMsg(i, message_id),
      getForwardMsg: message_id => this.getForwardMsg(i, message_id),
      sendForwardMsg: msg => this.sendFriendForwardMsg(i, msg),
      sendFile: (file, name) => this.sendFriendFile(i, file, name),
      getInfo: () => this.getFriendInfo(i),
      getAvatarUrl: () => i.avatar || `https://q.qlogo.cn/g?b=qq&s=0&nk=${user_id}`,
      thumbUp: times => this.sendLike(i, times),
    }
  }

  /**
   * 选择群成员
   * @param {Object} data - 数据对象
   * @param {number|string} group_id - 群ID或频道ID
   * @param {number} user_id - 用户ID
   * @returns {Object} - 群成员操作对象
   */
  pickMember(data, group_id, user_id) {
    if (typeof group_id === "string" && group_id.match("-")) {
      const guild_id = group_id.split("-")
      const i = {
        ...data,
        guild_id: guild_id[0],
        channel_id: guild_id[1],
        user_id,
      }
      return {
        ...this.pickGroup(i, group_id),
        ...i,
        getInfo: () => this.getGuildMemberInfo(i),
        getAvatarUrl: async () => (await this.getGuildMemberInfo(i)).avatar_url,
      }
    }

    const i = {
      ...data.bot.fl.get(user_id),
      ...data.bot.gml.get(group_id)?.get(user_id),
      ...data,
      group_id,
      user_id,
    }
    return {
      ...this.pickFriend(i, user_id),
      ...i,
      getInfo: () => this.getMemberInfo(i),
      getAvatarUrl: () => i.avatar || `https://q.qlogo.cn/g?b=qq&s=0&nk=${user_id}`,
      poke: () => this.sendGroupMsg(i, { type: "poke", qq: user_id }),
      mute: duration => this.setGroupBan(i, i.user_id, duration),
      kick: reject_add_request => this.setGroupKick(i, i.user_id, reject_add_request),
      get is_friend() { return data.bot.fl.has(user_id) },
      get is_owner() { return i.role === "owner" },
      get is_admin() { return i.role === "admin" || this.is_owner },
    }
  }

  /**
   * 选择群
   * @param {Object} data - 数据对象
   * @param {number|string} group_id - 群ID或频道ID
   * @returns {Object} - 群操作对象
   */
  pickGroup(data, group_id) {
    if (typeof group_id === "string" && group_id.match("-")) {
      const guild_id = group_id.split("-")
      const i = {
        ...data.bot.gl.get(group_id),
        ...data,
        guild_id: guild_id[0],
        channel_id: guild_id[1],
      }
      return {
        ...i,
        sendMsg: msg => this.sendGuildMsg(i, msg),
        getMsg: message_id => this.getMsg(i, message_id),
        recallMsg: message_id => this.recallMsg(i, message_id),
        getForwardMsg: message_id => this.getForwardMsg(i, message_id),
        getInfo: () => this.getGuildInfo(i),
        getChannelArray: () => this.getGuildChannelArray(i),
        getChannelList: () => this.getGuildChannelList(i),
        getChannelMap: () => this.getGuildChannelMap(i),
        getMemberArray: () => this.getGuildMemberArray(i),
        getMemberList: () => this.getGuildMemberList(i),
        getMemberMap: () => this.getGuildMemberMap(i),
        pickMember: user_id => this.pickMember(i, group_id, user_id),
      }
    }

    const i = {
      ...data.bot.gl.get(group_id),
      ...data,
      group_id,
    }
    return {
      ...i,
      sendMsg: msg => this.sendGroupMsg(i, msg),
      getMsg: message_id => this.getMsg(i, message_id),
      recallMsg: message_id => this.recallMsg(i, message_id),
      getForwardMsg: message_id => this.getForwardMsg(i, message_id),
      sendForwardMsg: msg => this.sendGroupForwardMsg(i, msg),
      sendFile: (file, name) => this.sendGroupFile(i, file, undefined, name),
      getInfo: () => this.getGroupInfo(i),
      getAvatarUrl: () => i.avatar || `https://p.qlogo.cn/gh/${group_id}/${group_id}/0`,
      getChatHistory: (seq, cnt) => this.getGroupMsgHistory(i, seq, cnt),
      getMemberArray: () => this.getMemberArray(i),
      getMemberList: () => this.getMemberList(i),
      getMemberMap: () => this.getMemberMap(i),
      pickMember: user_id => this.pickMember(i, group_id, user_id),
      pokeMember: qq => this.sendGroupMsg(i, { type: "poke", qq }),
      setName: group_name => this.setGroupName(i, group_name),
      setAvatar: file => this.setGroupAvatar(i, file),
      setAdmin: (user_id, enable) => this.setGroupAdmin(i, user_id, enable),
      setCard: (user_id, card) => this.setGroupCard(i, user_id, card),
      setTitle: (user_id, special_title, duration) => this.setGroupTitle(i, user_id, special_title, duration),
      sign: () => this.sendGroupSign(i),
      muteMember: (user_id, duration) => this.setGroupBan(i, user_id, duration),
      muteAll: enable => this.setGroupWholeKick(i, enable),
      kickMember: (user_id, reject_add_request) => this.setGroupKick(i, user_id, reject_add_request),
      quit: is_dismiss => this.setGroupLeave(i, is_dismiss),
      fs: this.getGroupFs(i),
      get is_owner() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "owner" },
      get is_admin() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "admin" || this.is_owner},
    }
  }

  /**
   * 连接方法
   * @param {Object} data - 连接数据
   * @param {WebSocket} ws - WebSocket对象
   * @returns {void}
   */
  async connect(data, ws) {
    Bot[data.self_id] = {
      adapter: this,
      ws: ws,
      sendApi: (action, params) => this.sendApi(data, ws, action, params),
      stat: {
        start_time: data.time,
        stat: {},
        get lost_pkt_cnt() { return this.stat.packet_lost },
        get lost_times() { return this.stat.lost_times },
        get recv_msg_cnt() { return this.stat.message_received },
        get recv_pkt_cnt() { return this.stat.packet_received },
        get sent_msg_cnt() { return this.stat.message_sent },
        get sent_pkt_cnt() { return this.stat.packet_sent },
      },
      model: "OneBotV11WS ",

      info: {},
      get uin() { return this.info.user_id },
      get nickname() { return this.info.nickname },
      get avatar() { return `https://q.qlogo.cn/g?b=qq&s=0&nk=${this.uin}` },

      setProfile: profile => this.setProfile(data, profile),
      setNickname: nickname => this.setProfile(data, { nickname }),
      setAvatar: file => this.setAvatar(data, file),

      pickFriend: user_id => this.pickFriend(data, user_id),
      get pickUser() { return this.pickFriend },
      getFriendArray: () => this.getFriendArray(data),
      getFriendList: () => this.getFriendList(data),
      getFriendMap: () => this.getFriendMap(data),
      fl: new Map,

      pickMember: (group_id, user_id) => this.pickMember(data, group_id, user_id),
      pickGroup: group_id => this.pickGroup(data, group_id),
      getGroupArray: () => this.getGroupArray(data),
      getGroupList: () => this.getGroupList(data),
      getGroupMap: () => this.getGroupMap(data),
      getGroupMemberMap: () => this.getGroupMemberMap(data),
      gl: new Map,
      gml: new Map,

      request_list: [],
      getSystemMsg: () => data.bot.request_list,
      setFriendAddRequest: (flag, approve, remark) => this.setFriendAddRequest(data, flag, approve, remark),
      setGroupAddRequest: (flag, sub_type, approve, reason) => this.setGroupAddRequest(data, flag, sub_type, approve, reason),
      cookies: {},
      getCookies(domain) { return this.cookies[domain] },
      getCsrfToken() { return this.bkn },
    }
    data.bot = Bot[data.self_id]

    // 确保 Bot.uin 是一个数组
    if (!Array.isArray(Bot.uin)) {
      Bot.uin = [];
    }

    if (!Bot.uin.includes(data.self_id))
      Bot.uin.push(data.self_id)

    data.bot.sendApi("_set_model_show", {
      model: data.bot.model,
      model_show: data.bot.model,
    }).catch(() => { })

    data.bot.info = (await data.bot.sendApi("get_login_info").catch(i => i.error)).data
    data.bot.guild_info = (await data.bot.sendApi("get_guild_service_profile").catch(i => i.error)).data
    data.bot.clients = (await data.bot.sendApi("get_online_clients").catch(i => i.error)).clients
    data.bot.version = {
      ...(await data.bot.sendApi("get_version_info").catch(i => i.error)).data,
      id: this.id,
      name: this.name,
      get version() {
        return this.app_full_name || `${this.app_name} v${this.app_version}`
      },
    }

    for (const i of ["aq", "connect", "docs", "game", "gamecenter", "haoma", "id", "kg", "mail", "mma", "office", "openmobile", "qqweb", "qun", "qzone", "ti", "v", "vip", "y"]) {
      const domain = `${i}.qq.com`
      if (!(data.bot.cookies[domain] = (
        await data.bot.sendApi("get_cookies", { domain }).catch(i => i.error)
      ).cookies)) break
    }
    data.bot.bkn = (await data.bot.sendApi("get_csrf_token").catch(i => i.error)).token
    data.bot.getFriendMap()
    data.bot.getGroupMemberMap()

    lain.mark(this.self_id, `${this.name}(${this.id}) ${data.bot.version.version} 已连接`, data.self_id)
    Bot.em(`connect.${data.self_id}`, data)
  }

  /**
   * 解析消息方法
   * @param {Object} data - 消息数据
   * @returns {void}
   */
  async makeMessage(data) {
    data.message = this.parseMsg(data.message)
    switch (data.message_type) {
      case "private": {
        const name = data.sender.card || data.sender.nickname || data.bot.fl.get(data.user_id)?.nickname
        lain.info(this.self_id, `好友消息：${name ? `[${name}] ` : ""}${data.raw_message}`, `Bot: [${data.self_id}] <= 好友： [${data.user_id}]`)
        break
      } case "group": {
        const group_name = data.group_name || data.bot.gl.get(data.group_id)?.group_name
        let user_name = data.sender.card || data.sender.nickname
        if (!user_name) {
          const user = data.bot.gml.get(data.group_id)?.get(data.user_id) || data.bot.fl.get(data.user_id)
          if (user) user_name = user?.card || user?.nickname
        }
        lain.info(this.self_id, `群消息：${user_name ? `[${group_name ? `${group_name}, ` : ""}${user_name}] ` : ""}${data.raw_message}`, `Bot: [${data.self_id}] <= 群：[ ${data.group_id} ]: ${data.user_id}`)
        break
      } case "guild":
        data.message_type = "group"
        data.group_id = `${data.guild_id}-${data.channel_id}`
        lain.info(this.self_id, `频道消息：[${data.sender.nickname}] ${this.BotString(data.message)}`, `Bot: [${data.self_id}] <= 群： [${data.group_id}]: ${data.user_id}`)
        Object.defineProperty(data, "friend", { get() { return this.member || {} } })
        break
      default:
        lain.warn(this.self_id, `未知消息：${logger.magenta(data.raw)}`, data.self_id)
    }
    let e = data
    e.reply = (msg) => this.sendReplyMsg(e, msg)
    Bot.em(`${data.post_type}.${data.message_type}.${data.sub_type}`, data)
  }

  /**
* 回被动消息
* @param {object} e - 接收的e - 喵崽格式
* @param {string|object|array} msg - 消息内容
*/
  async sendReplyMsg(e, msg) {
    if (e.group_id) return await this.sendGroupMsg(e, msg)
    return await this.sendFriendMsg(e, msg)
  }

  /**
   * 解析通知方法
   * @param {Object} data - 通知数据
   * @returns {void}
   */
  async makeNotice(data) {
    switch (data.notice_type) {
      case "friend_recall":
        lain.info(this.self_id, `好友消息撤回：${data.message_id}`, `Bot: [${data.self_id}] <= 好友： [${data.user_id}]`)
        break
      case "group_recall":
        lain.info(this.self_id, `群消息撤回：${data.operator_id} => 用户： [${data.user_id}]: ${data.message_id}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]`)
        break
      case "group_increase":
        lain.info(this.self_id, `群成员增加：${data.operator_id} => 用户： [${data.user_id}]: ${data.sub_type}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]`)
        if (data.user_id === data.self_id)
          data.bot.getGroupMemberMap()
        else
          data.bot.pickGroup(data.group_id).getMemberMap()
        break
      case "group_decrease":
        lain.info(this.self_id, `群成员减少：${data.operator_id} => 用户： [${data.user_id}]: ${data.sub_type}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]`)
        if (data.user_id === data.self_id)
          data.bot.getGroupMemberMap()
        else
          data.bot.pickGroup(data.group_id).getMemberMap()
        break
      case "group_admin":
        lain.info(this.self_id, `群管理员变动：${data.sub_type}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]: ${data.user_id}`)
        data.set = data.sub_type === "set"
        break
      case "group_upload":
        lain.info(this.self_id, `群文件上传：${this.BotString(data.file)}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]: ${data.user_id}`)
        Bot.em("message.group.normal", {
          ...data,
          post_type: "message",
          message_type: "group",
          sub_type: "normal",
          message: [{ ...data.file, type: "file" }],
          raw_message: `[文件：${data.file.name}]`,
        })
        break
      case "group_ban":
        lain.info(this.self_id, `群禁言：${data.operator_id} => 用户： [${data.user_id}]: ${data.sub_type} ${data.duration}秒`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]`)
        break
      case "friend_add":
        lain.info(this.self_id, "好友添加", `Bot: [${data.self_id}] <= 用户：[${data.user_id}]`)
        data.bot.getFriendMap()
        break
      case "notify":
        if (data.group_id)
          data.notice_type = "group"
        else
          data.notice_type = "friend"
        switch (data.sub_type) {
          case "poke":
            data.operator_id = data.user_id
            if (data.group_id)
              lain.info(this.self_id, `群戳一戳：${data.operator_id} => ${data.target_id}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]`)
            else
              lain.info(this.self_id, `好友戳一戳：${data.operator_id} => ${data.target_id}`, data.self_id)
            break
          case "honor":
            lain.info(this.self_id, `群荣誉：${data.honor_type}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]: ${data.user_id}`)
            break
          case "title":
            lain.info(this.self_id, `群头衔：${data.title}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]: ${data.user_id}`)
            break
          default:
            lain.warn(this.self_id, `未知通知：${logger.magenta(data.raw)}`, data.self_id)
        }
        break
      case "group_card":
        lain.info(this.self_id, `群名片更新：${data.card_old} => ${data.card_new}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]: ${data.user_id}`)
        break
      case "offline_file":
        lain.info(this.self_id, `离线文件：${this.BotString(data.file)}`, `Bot: [${data.self_id}] <= ${data.user_id}`)
        Bot.em("message.private.friend", {
          ...data,
          post_type: "message",
          message_type: "private",
          sub_type: "friend",
          message: [{ ...data.file, type: "file" }],
          raw_message: `[文件：${data.file.name}]`,
        })
        break
      case "client_status":
        lain.info(this.self_id, `客户端${data.online ? "上线" : "下线"}：${this.BotString(data.client)}`, data.self_id)
        data.clients = (await data.bot.sendApi("get_online_clients")).clients
        data.bot.clients = data.clients
        break
      case "essence":
        data.notice_type = "group_essence"
        lain.info(this.self_id, `群精华消息：${data.operator_id} => ${data.sender_id} ${data.sub_type} ${data.message_id}`, `Bot: [${data.self_id}] <= 群：[${data.group_id}]`)
        break
      case "guild_channel_recall":
        lain.info(this.self_id, `频道消息撤回：${data.operator_id} => ${data.user_id} ${data.message_id}`, `Bot: [${data.self_id}] <= 频道：[${data.guild_id}-${data.channel_id}]`)
        break
      case "message_reactions_updated":
        data.notice_type = "guild_message_reactions_updated"
        lain.info(this.self_id, `频道消息表情贴：${data.message_id} ${this.BotString(data.current_reactions)}`, `Bot: [${data.self_id}] <= 频道：[${data.guild_id}-${data.channel_id}, ${data.user_id}]`)
        break
      case "channel_updated":
        data.notice_type = "guild_channel_updated"
        lain.info(this.self_id, `子频道更新：${this.BotString(data.old_info)} => ${this.BotString(data.new_info)}`, `Bot: [${data.self_id}] <= 频道：[${data.guild_id}-${data.channel_id}, ${data.user_id}]`)
        break
      case "channel_created":
        data.notice_type = "guild_channel_created"
        lain.info(this.self_id, `子频道创建：${this.BotString(data.channel_info)}`, `Bot: [${data.self_id}] <= 频道：[${data.guild_id}-${data.channel_id}, ${data.user_id}]`)
        data.bot.getGroupMap()
        break
      case "channel_destroyed":
        data.notice_type = "guild_channel_destroyed"
        lain.info(this.self_id, `子频道删除：${this.BotString(data.channel_info)}`, `Bot: [${data.self_id}] <= 频道：[${data.guild_id}-${data.channel_id}, ${data.user_id}]`)
        data.bot.getGroupMap()
        break
      default:
        lain.warn(this.self_id, `未知通知：${logger.magenta(data.raw)}`, data.self_id)
    }

    let notice = data.notice_type.split("_")
    data.notice_type = notice.shift()
    notice = notice.join("_")
    if (notice)
      data.sub_type = notice

    if (data.guild_id && data.channel_id) {
      data.group_id = `${data.guild_id}-${data.channel_id}`
      Object.defineProperty(data, "friend", { get() { return this.member || {} } })
    }

    Bot.em(`${data.post_type}.${data.notice_type}.${data.sub_type}`, data)
  }

  /**
   * 处理请求
   * @param {Object} data - 请求数据
   */
  makeRequest(data) {
    switch (data.request_type) {
      case "friend":
        lain.info(this.self_id, `加好友请求：${data.comment}(${data.flag})`, `${data.self_id} <= ${data.user_id}`)
        data.sub_type = "add"
        data.approve = approve => data.bot.setFriendAddRequest(data.flag, approve)
        break
      case "group":
        lain.info(this.self_id, `加群请求：${data.sub_type} ${data.comment}(${data.flag})`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`)
        data.approve = approve => data.bot.setGroupAddRequest(data.flag, data.sub_type, approve)
        break
      default:
        lain.warn(this.self_id, `未知请求：${logger.magenta(data.raw)}`, data.self_id)
    }

    data.bot.request_list.push(data)
    Bot.em(`${data.post_type}.${data.request_type}.${data.sub_type}`, data)
  }

  /**
   * 处理心跳
   * @param {Object} data - 心跳数据
   */
  heartbeat(data) {
    if (data.status)
      lain.debug('Lain-plugin', `<OneBotV11> QQ ${this.id} 收到心跳：${JSON.stringify(data.status, null, 2)}`)
  }

  /**
   * 处理元数据
   * @param {Object} data - 元数据
   * @param {Object} ws - WebSocket对象
   */
  makeMeta(data, ws) {
    switch (data.meta_event_type) {
      case "heartbeat":
        this.heartbeat(data)
        break
      case "lifecycle":
        this.connect(data, ws)
        break
      default:
        lain.warn(this.self_id, `未知消息：${logger.magenta(data.raw)}`, data.self_id)
    }
  }

  /**
   * 处理消息
   * @param {Object|String} data - 消息数据
   * @param {Object} ws - WebSocket对象
   */
  async message(data, ws) {
    let dataString;
    if (Buffer.isBuffer(data)) {
      dataString = data.toString('utf-8'); // 将Buffer转换成String
    } else {
      dataString = data; // 如果已经是String，则直接使用
    }
    try {
      data = {
        ...JSON.parse(dataString),
        raw: this.BotString(data),
      }
    } catch (err) {
      return lain.error(this.self_id, ["解码数据失败", data, err])
    }

    if (data.post_type) {
      if (data.meta_event_type !== "lifecycle" && !Bot.uin.includes(data.self_id)) {
        lain.warn(this.self_id, `找不到对应Bot，忽略消息：${logger.magenta(data.raw)}`, data.self_id)
        return false
      }
      data.bot = Bot[data.self_id]

      switch (data.post_type) {
        case "meta_event":
          this.makeMeta(data, ws)
          break
        case "message":
          this.makeMessage(data)
          break
        case "notice":
          this.makeNotice(data)
          break
        case "request":
          this.makeRequest(data)
          break
        case "message_sent":
          data.post_type = "message"
          this.makeMessage(data)
          break
        default:
          lain.warn(this.self_id, `未知消息：${logger.magenta(data.raw)}`, data.self_id)
      }
    } else if (data.echo && this.echo[data.echo]) {
      if (![0, 1].includes(data.retcode))
        this.echo[data.echo].reject(Object.assign(
          this.echo[data.echo].error,
          this.echo[data.echo].request,
          { error: data },
        ))
      else
        this.echo[data.echo].resolve(data.data ? new Proxy(data, {
          get: (target, prop) => target.data[prop] ?? target[prop],
        }) : data)
      clearTimeout(this.echo[data.echo].timeout)
      delete this.echo[data.echo]
    } else {
      lain.warn(this.self_id, `未知消息：${logger.magenta(data.raw)}`, data.self_id)
    }
  }

  /**
   * 将数据转换为字符串或返回"[object null]"
   * @param {Object} data - 数据
   * @returns {String} - 转换后的字符串
   */
  StringOrNull(data) {
    if (typeof data === "object" && typeof data.toString !== "function")
      return "[object null]"
    return String(data)
  }

  /**
   * 将数据转换为字符串或Buffer
   * @param {Object} data - 数据
   * @param {Boolean} base64 - 是否使用base64编码
   * @returns {String|Buffer} - 转换后的字符串或Buffer
   */
  StringOrBuffer(data, base64) {
    const string = String(data)
    return string.includes("\ufffd") ? (base64 ? `base64://${data.toString("base64")}` : data) : string
  }

  /**
   * 获取循环替换器
   * @returns {Function} - 循环替换器函数
   */
  getCircularReplacer() {
    const _this_ = this, ancestors = []
    return function (key, value) {
      switch (typeof value) {
        case "function":
          return String(value)
        case "object":
          if (value === null)
            return null
          if (value instanceof Map || value instanceof Set)
            return Array.from(value)
          if (value instanceof Error)
            return value.stack
          if (value.type === "Buffer" && Array.isArray(value.data)) try {
            return _this_.StringOrBuffer(Buffer.from(value), true)
          } catch { }
          break
        default:
          return value
      }
      while (ancestors.length > 0 && ancestors.at(-1) !== this)
        ancestors.pop()
      if (ancestors.includes(value))
        return `[Circular ${_this_.StringOrNull(value)}]`
      ancestors.push(value)
      return value
    }
  }

  /**
   * 将数据转换为Bot字符串
   * @param {Object} data - 数据
   * @param {Object} opts - 选项
   * @returns {String} - 转换后的字符串
   */
  BotString(data, opts) {
    switch (typeof data) {
      case "string":
        return data
      case "function":
        return String(data)
      case "object":
        if (data instanceof Error)
          return data.stack
        if (Buffer.isBuffer(data))
          return this.StringOrBuffer(data, true)
    }

    try {
      return JSON.stringify(data, this.getCircularReplacer(), opts) || this.StringOrNull(data)
    } catch (err) {
      return this.StringOrNull(data)
    }
  }
}

/** OneBotV11的WebSocket服务器实例 */
const OneBotV11WS = new WebSocketServer({ noServer: true })

/** 连接 */
OneBotV11WS.on('connection', async (socket, request) => new OneBotv11Adapter(socket, request))

/** 捕获错误 */
OneBotV11WS.on('error', async error => logger.error(error))

export default OneBotV11WS

lain.info('Lain-plugin', 'OneBotV11适配器加载完成')
