import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import QQBot from 'qq-group-bot'
import qrcode from 'qrcode'
import { encode as encodeSilk } from 'silk-wasm'
import Yaml from 'yaml'
import common from '../../model/common.js'

export default class StartQQBot {
  /** 传入基本配置 */
  constructor (config) {
    /** 开发者id */
    this.id = config.appid
    /** 基本配置 */
    this.config = config
    /** 重试次数 */
    this.config.maxRetry = 10
    /** 禁止移除at */
    this.config.removeAt = false
    /** 监听事件 */
    this.config.intents = ['GROUP_AT_MESSAGE_CREATE', 'C2C_MESSAGE_CREATE']
    /** 日志等级 */
    this.config.logLevel = Bot.lain.BotCfg.log_level
    /** 启动当前Bot */
    this.StartBot()
  }

  async StartBot () {
    this.bot = new QQBot.Bot(this.config)
    // 群聊被动回复
    this.bot.on('message.group', async (e) => Bot.emit('message', await this.msg(e, true)))
    // 私聊被动回复
    this.bot.on('message.private', async (e) => await Bot.emit('message', await this.msg(e, true)))

    /** 开始链接 */
    await this.bot.start()
    /** 重启 */
    await common.init('Lain:restart')

    this.bot.logger = {
      info: log => this.msgLog(log),
      trace: log => common.trace(this.id, log),
      debug: log => common.debug(this.id, log),
      mark: log => common.mark(this.id, log),
      warn: log => common.warn(this.id, log),
      error: log => common.error(this.id, log),
      fatal: log => common.fatal(this.id, log)
    }
    const { id, avatar, username } = await this.bot.getSelfInfo()

    Bot[this.id] = {
      ...this.bot,
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
      readMsg: async () => await common.recvMsg(this.id, 'QQBot', true),
      MsgTotal: async (type) => await common.MsgTotal(this.id, 'QQBot', type, true),
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
  }

  /** 修改一下日志 */
  msgLog (e) {
    if (typeof e !== 'string') return common.info(this.id, e)
    e = e.trim()
    try {
      if (/^recv from Group/.test(e)) {
        e = e.replace(/^recv from Group\([^)]+\): /, `群消息：[${e.match(/\(([^)]+)\)/)[1]}]`)
      } else if (/^send to Group/.test(e)) {
        e = e.replace(/^send to Group\([^)]+\): /, `发送群消息：[${e.match(/\(([^)]+)\)/)[1]}]`)
      }
    } catch { }
    return common.info(this.id, e)
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
      sendMsg: async (msg) => await this.sendGroupMsg(groupID, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      pickMember: (userID) => this.pickMember(groupID, userID),
      /** 戳一戳 */
      pokeMember: async (operatorId) => '',
      /** 禁言 */
      muteMember: async (groupId, userId, time) => '',
      /** 全体禁言 */
      muteAll: async (type) => '',
      getMemberMap: async () => '',
      /** 退群 */
      quit: async () => '',
      /** 设置管理 */
      setAdmin: async (qq, type) => '',
      /** 踢 */
      kickMember: async (qq, rejectAddRequest = false) => '',
      /** 头衔 **/
      setTitle: async (qq, title, duration) => '',
      /** 修改群名片 **/
      setCard: async (qq, card) => ''
    }
  }

  /** 好友对象 */
  pickFriend (userId) {
    return {
      sendMsg: async (msg, msgId) => await this.sendFriendMsg(userId, msg, msgId),
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

  /** 发送好友消息 */
  async sendFriendMsg (userId, msg, msgId) {
    /** 转换格式 */
    const { message, image } = await this.message(msg)
    if (msgId) message.push({ type: 'reply', id: msgId })
    this.bot.sendPrivateMessage(userId, message)
    /** 分片发送图片 */
    if (image.length > 0) {
      image.forEach(async i => {
        i = [i, { type: 'reply', id: msgId }]
        this.bot.sendPrivateMessage(userId, i)
      })
    }
  }

  /** 发送群消息 */
  async sendGroupMsg (groupID, msg, msgId) {
    /** 转换格式 */
    const { message, image } = await this.message(msg)
    if (msgId) message.push({ type: 'reply', id: msgId })
    this.bot.sendGroupMessage(groupID, message)
    /** 分片发送图片 */
    if (image.length > 0) {
      image.forEach(async i => {
        i = [i, { type: 'reply', id: msgId }]
        this.bot.sendGroupMessage(groupID, i)
      })
    }
  }

  /** 转换格式给云崽处理 */
  async msg (data, isGroup) {
    let { self_id: tinyId, ...e } = data
    e.tiny_id = tinyId
    e.self_id = e.bot.config.appid
    e.sendMsg = data.reply
    e.data = data

    if (Bot.lain.cfg.QQBotPrefix) {
      e.message.some(msg => {
        if (msg.type === 'text') {
          msg.text = msg.text.trim().replace(/^\//, '#')
          return true
        }
        return false
      })
    }

    /** 构建快速回复消息 */
    e.reply = async (msg, quote) => await this.reply(e, msg, quote)
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
    e.sender.user_id = `${this.id}-${e.sender.user_id}`

    /** 缓存好友列表 */
    if (!Bot[e.self_id].fl.get(e.user_id)) Bot[e.self_id].fl.set(e.user_id, { user_id: e.user_id })
    if (await redis.get(`lain:fl:${e.self_id}:${e.user_id}`)) redis.set(`lain:fl:${e.self_id}:${e.user_id}`, JSON.stringify({ user_id: e.user_id }))

    /** 保存消息次数 */
    try { common.recvMsg(e.self_id, e.adapter) } catch { }
    return e
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

  /** 转换message */
  async message (e) {
    if (!Array.isArray(e)) e = [e]
    e = common.array(e)
    let text = []
    const image = []
    const message = []

    for (let i in e) {
      try {
        switch (e[i].type) {
          case 'at':
            break
          case 'image':
            image.push(await this.Upload(e[i], 'image'))
            break
          case 'video':
          case 'record':
            message.push(await this.Upload(e[i], e[i].type === 'video' ? 'video' : 'audio'))
            break
          case 'text':
          case 'forward':
            (await this.HandleURL(e[i])).forEach(msg => {
              if (msg.type === 'image') {
                image.push(msg)
              } else {
                text.push(msg.text)
              }
            })
            break
          default:
            message.push(e[i])
            break
        }
      } catch (err) {
        common.error('Lain-plugin', err)
        message.push(e[i])
      }
    }

    if (image.length) {
      if (text.length) message.push({ type: 'text', text: text.join('\n') })
      message.push(image[0])
      image.splice(0, 1)
      try { await common.MsgTotal(this.id, 'QQBot', 'image') } catch { }
    } else {
      try { await common.MsgTotal(this.id, 'QQBot') } catch { }
      if (text.length) message.push({ type: 'text', text: text.join('\n') })
    }

    return { message, image }
  }

  /** 快速回复 */
  async reply (e, msg) {
    let res
    const { message, image } = await this.message(msg)
    try {
      res = await e.sendMsg.call(e.data, message)
    } catch (error) {
      common.error(e.self_id, `发送消息失败：${error?.data || error?.message || error}`)
      common.debug(e.self_id, error)
      res = await e.sendMsg.call(e.data, `发送消息失败：${error?.data || error?.message || error}`)
    }

    /** 分片发送图片 */
    if (image.length > 0) {
      image.forEach(async i => {
        try {
          res = await e.sendMsg.call(e.data, i)
        } catch (error) {
          common.error(e.self_id, `发送消息失败：${error?.data || error?.message || error}`)
          common.debug(e.self_id, error)
          res = await e.sendMsg.call(e.data, `发送消息失败：${error?.data || error?.message || error}`)
        }
      })
    }

    return {
      seq: res?.group_code,
      rand: 1,
      time: Date.now(),
      message_id: res?.group_code
    }
  }

  /** 统一传入的格式并上传 */
  async Upload (i, uploadType) {
    const { type, file } = await this.getFile(i, uploadType)
    /** 语音特殊处理 需要转码 */
    if (uploadType === 'audio') {
      return await this.get_audio(type, file)
    } else if (type === 'http') {
      /** url直接返回即可 */
      return { type: uploadType, file }
    } else if (type === 'file' && fs.existsSync(file)) {
      /** 文件上传 */
      return await this.Upload_File(file, uploadType)
    } else {
      /** 这种情况都能碰到？ */
      common.error('QQBotApi', '文件保存失败：' + i)
      return { type: 'text', text: JSON.stringify(i) }
    }
  }

  /** 处理语音... */
  async get_audio (type, file) {
    const filePath = process.cwd() + '/plugins/Lain-plugin/resources/QQBotApi'
    const pcm = path.join(filePath, `${Date.now()}.pcm`)
    const silk = path.join(filePath, `${Date.now()}.silk`)

    if (type === 'http') {
      const fileMp3 = `${filePath}/${Date.now()}${path.extname(file) || '.mp3'}`
      try {
        /** 下载 */
        const res = await fetch(file)
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          fs.writeFileSync(fileMp3, Buffer.from(buffer))
          common.mark('Lain-plugin', `语音文件下载成功：${file}`)
        } else {
          common.error('Lain-plugin', `语音文件下载失败：${res.status}，${res.statusText}`)
          return { type: 'text', text: `语音文件下载失败：${res.status}，${res.statusText}` }
        }
      } catch (error) {
        common.error('Lain-plugin', error.message, 'errror')
        return { type: 'text', text: `语音文件下载失败：${error?.message || error}` }
      }
      file = fileMp3
    }

    if (fs.existsSync(file)) {
      try {
        /** mp3 转 pcm */
        await this.runFfmpeg(file, pcm)
      } catch (error) {
        console.error('执行错误:', error)
        return { type: 'text', text: `语音转码失败：${error}` }
      }
      /** pcm 转 silk */
      await encodeSilk(fs.readFileSync(pcm), 48000)
        .then((silkData) => {
          /** 转silk完成，保存 */
          fs.writeFileSync(silk, silkData.data)
          /** 删除初始mp3文件 */
          fs.unlink(file, () => { })
          /** 删除pcm文件 */
          fs.unlink(pcm, () => { })
          common.mark('Lain-plugin', `silk转码完成：${silk}`)
        })
        .catch((err) => {
          common.error('Lain-plugin', `转码失败${err}`)
          return { type: 'text', text: `转码失败${err}` }
        })
    } else {
      common.error('Lain-plugin', '本地文件不存在：' + file)
      return { type: 'text', text: '本地文件不存在...' }
    }

    // 返回名称
    if (fs.existsSync(silk)) {
      return await this.Upload_File(silk, 'audio')
    } else {
      common.error('QQBotApi', '文件保存失败：' + silk)
      return { type: 'text', text: '文件保存失败...' }
    }
  }

  /** ffmpeg转码 转为pcm */
  async runFfmpeg (input, output) {
    return new Promise(async (resolve, reject) => {
      let cm
      let ret = await this.execSync('ffmpeg -version')
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
        common.mark('Lain-plugin', `ffmpeg转码完成：${input} => ${output}`)
        resolve()
      }
      )
    })
  }

  /** 读取环境变量 */
  execSync (cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }

  /** 上传文件返回url */
  async Upload_File (filePath, type) {
    const { FigureBed, port, QQBotImgIP, QQBotPort, QQBotImgToken } = Bot.lain.cfg
    let url = `http://${QQBotImgIP}:${QQBotPort || port}/api/QQBot?token=${QQBotImgToken}&name=${path.basename(filePath)}`

    /** 先判断是否配置公网 */
    if (QQBotImgIP && QQBotImgIP != '127.0.0.1') {
      common.info('QQBotApi', `[生成文件-公网] url：${url}`)
      await common.sleep(100)
      return { type, file: url }
    }
    /** 未配置公网则按需调用 */
    try {
      /** 调用默认图床 */
      if (FigureBed) {
        const res = await common.uploadFile(filePath, FigureBed)
        if (res.ok) {
          const { result } = await res.json()
          url = FigureBed.replace('/uploadimg', '') + result.path
          common.info('Lain-plugin', `[上传文件成功] ${url}`)
          await common.sleep(100)
          return { type, file: url }
        } else {
          const data = await res.json()
          common.error('Lain-plugin', `QQBot默认图床发生错误，将调用下一个方法：${data}`)
        }
      } else if (type === 'image') {
        /** 调用QQ图床 */
        const botList = Bot.adapter.filter(item => typeof item === 'number')
        if (botList.length > 0) {
          url = await common.uploadQQ(filePath, botList[0])
          await common.sleep(100)
          return { type, file: url }
        } else {
          common.error('Lain-plugin', `未发现可使用的QQ图床，默认返回公网：${url}`)
          await common.sleep(100)
          return { type, file: url }
        }
      } else {
        common.error('Lain-plugin', `默认图床和QQ图床调用失败，默认返回公网：${url}`)
        await common.sleep(100)
        return { type, file: url }
      }
    } catch {
      common.error('Lain-plugin', `默认图床和QQ图床调用失败，默认返回公网：${url}`)
      await common.sleep(100)
      return { type, file: url }
    }
  }

  /** 转换文本中的URL为图片 */
  async HandleURL (msg) {
    const message = []
    if (msg?.text) msg = msg.text
    if (typeof msg !== 'string') return msg
    /** 白名单url */
    const whitelistUrl = Bot.lain.cfg.whitelist_Url

    /** 需要处理的url */
    let urls = await common.getUrls(msg) || []

    if (urls.length > 0) {
      /** 检查url是否包含在白名单中的任何一个url */
      urls = urls.filter(url => {
        return !whitelistUrl.some(whitelistUrl => url.includes(whitelistUrl))
      })

      let promises = urls.map(i => {
        return new Promise((resolve, reject) => {
          common.mark('Lain-plugin', `url替换：${i}`)
          qrcode.toBuffer(i, {
            errorCorrectionLevel: 'H',
            type: 'png',
            margin: 4,
            text: i
          }, async (err, buffer) => {
            if (err) reject(err)
            const base64 = 'base64://' + buffer.toString('base64')
            const Uint8Array = await common.rendering(base64, i)
            message.push(await this.Upload({ type: 'image', file: Uint8Array }, 'image'))
            msg = msg.replace(i, '[链接(请扫码查看)]')
            msg = msg.replace(i.replace(/^http:\/\//g, ''), '[链接(请扫码查看)]')
            msg = msg.replace(i.replace(/^https:\/\//g, ''), '[链接(请扫码查看)]')
            resolve()
          })
        })
      })

      await Promise.all(promises)
      message.unshift({ type: 'text', text: msg })
      return message
    }
    return [{ type: 'text', text: msg }]
  }

  /** 统一文件格式 */
  async getFile (i, type) {
    const res = common.getFile(i)
    const { file } = res

    let extname = '.jpg'
    if (type == 'audio') extname = '.mp3'
    else if (type == 'video') extname = '.mp4'

    /** 统一使用时间戳命名，无后缀，根据类型补后缀 */
    let filePath = `${process.cwd()}/plugins/Lain-plugin/resources/QQBotApi/${Date.now()}`

    switch (res.type) {
      case 'file':
        filePath = filePath + path.extname(file)
        fs.copyFileSync(file.replace(/^file:\/\//, ''), filePath)
        return { type: 'file', file: filePath }
      case 'buffer':
        filePath = filePath + extname
        fs.writeFileSync(filePath, Buffer.from(file))
        return { type: 'file', file: filePath }
      case 'base64':
        filePath = filePath + extname
        fs.writeFileSync(filePath, file.replace(/^base64:\/\//, ''), 'base64')
        return { type: 'file', file: filePath }
      case 'http':
        return { type: 'http', file }
      default:
        return { type: 'error', file }
    }
  }
}
