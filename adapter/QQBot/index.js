import { exec } from 'child_process'
import fs from 'fs'
import sizeOf from 'image-size'
import path from 'path'
import QQBot from 'qq-group-bot'
import qrcode from 'qrcode'
import { encode as encodeSilk } from 'silk-wasm'
import Yaml from 'yaml'
import moment from 'moment'
import { fileTypeFromBuffer } from 'file-type'

import common from '../../model/common.js'
import Button from './plugins.js'
import { DAU, getDAU } from './DAU.js'


export default class StartQQBot {
  /** 传入基本配置 */
  constructor(config) {
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

  async StartBot() {
    this.bot = new QQBot.Bot(this.config)
    // 群聊被动回复
    this.bot.on("message.group", async (e) => {
      Bot[this.id].stat.recv_msg_cnt++
      Bot.em("message.group", await this.msg(e, true))
    })
    // 私聊被动回复
    this.bot.on("message.private", async (e) => {
      Bot[this.id].stat.recv_msg_cnt++
      return Bot.em("message.private", await this.msg(e, false))
    })

    /** 开始链接 */
    await this.bot.start()

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
      stat: { start_time: parseInt(Date.now() / 1000), recv_msg_cnt: 0 },
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
    if (!Bot.adapter.includes(this.id)) Bot.adapter.push(this.id)
    /** 读取旧DAU */
    DAU[this.id] = await getDAU(this.id)

    /** 重启 */
    await common.init('Lain:restart:QQBot')
  }

  /** 修改一下日志 */
  msgLog(e) {
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
  async gmlList(type = 'gl') {
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
  pickGroup(groupID) {
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
  pickFriend(userId) {
    return {
      sendMsg: async (msg) => await this.sendFriendMsg(userId, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      getAvatarUrl: async (size = 0, userID) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID || this.id}`
    }
  }

  pickMember(groupID, userID) {
    return {
      member: this.member(groupID, userID),
      getAvatarUrl: (size = 0, userID) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID || this.id}`
    }
  }

  member(group_id, user_id) {
    const member = {
      info: {
        group_id,
        user_id,
        nickname: "",
        last_sent_time: ""
      },
      group_id,
      is_admin: false,
      is_owner: false,
      /** 获取头像 */
      getAvatarUrl: (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`,
      mute: async (time) => ""
    }
    return member
  }

  /** 发送好友消息 */
  async sendFriendMsg(userId, msg) {
    /** 转换格式 */
    const { message, image, reply } = await this.message(msg)
    let ret
    ret = this.bot.sendPrivateMessage(userId, message, this.bot)
    common.mark(this.id, `发送返回：${JSON.stringify(ret)}`)
    /** 分片发送图片 */
    if (image.length > 0) {
      image.forEach(async i => {
        ret = this.bot.sendPrivateMessage(userId, reply ? [i, reply] : i)
        common.mark(this.id, `发送返回：${JSON.stringify(ret)}`)
      })
    }

    /** 计算发送DAU */
    DAU[this.id].send_count++
    const time = moment(Date.now()).add(2, "days").format("YYYY-MM-DD 00:00:00")
    let now = moment().format('YYYY-MM-DD')
    const EX = Math.round(
      (new Date(time).getTime() - new Date().getTime()) / 1000
    )
    redis.set(`QQBotDAU:${now}:send_count:${this.id}`, DAU[this.id].send_count * 1, { EX })
  }

  /** 发送群消息 */
  async sendGroupMsg(groupID, msg) {
    /** 转换格式 */
    const { message, image, reply } = await this.message(msg)
    let ret
    ret = this.bot.sendGroupMessage(groupID, message, this.bot)
    common.mark(this.id, `发送返回：${JSON.stringify(ret)}`)
    /** 分片发送图片 */
    if (image.length > 0) {
      image.forEach(async i => {
        ret = this.bot.sendGroupMessage(groupID, reply ? [i, reply] : i)
        common.mark(this.id, `发送返回：${JSON.stringify(ret)}`)
      })
    }

    /** 计算发送DAU */
    DAU[this.id].send_count++
    const time = moment(Date.now()).add(2, "days").format("YYYY-MM-DD 00:00:00")
    let now = moment().format('YYYY-MM-DD')
    const EX = Math.round(
      (new Date(time).getTime() - new Date().getTime()) / 1000
    )
    redis.set(`QQBotDAU:${now}:send_count:${this.id}`, DAU[this.id].send_count * 1, { EX })
  }

  /** 转换格式给云崽处理 */
  async msg(data, isGroup) {
    let { self_id: tinyId, ...e } = data
    e.tiny_id = tinyId
    e.self_id = e.bot.config.appid
    e.sendMsg = data.reply
    e.data = data
    e.bot = Bot[this.id]

    if (Bot.lain.cfg.QQBotPrefix) {
      e.message.some(msg => {
        if (msg.type === 'text') {
          msg.text = msg.text.trim().replace(/^\//, '#')
        }
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
        if (!Bot[this.id].gl.get(e.group_id)) Bot[this.id].gl.set(e.group_id, { group_id: e.group_id })
        /** 缓存群列表 */
        if (await redis.get(`lain:QQBot:gl:${e.group_id}`)) redis.set(`lain:QQBot:gl:${e.group_id}`, JSON.stringify({ group_id: e.group_id }))
        /** 防倒卖崽 */
        if (Bot.lain.cfg.QQBotTips) await this.QQBotTips(data, e.group_id)
      } catch { }

      e.member = this.member(e.group_id, e.user_id)
      e.group_name = `${this.id}-${e.group_id}`
      e.group = this.pickGroup(e.group_id)
    } else {
      e.friend = this.pickFriend(e.user_id)
    }

    /** 添加适配器标识 */
    e.adapter = "QQBot"
    e.sender.nickname = e.sender.user_id || `${this.id}-${e.user_id}`

    /** 缓存好友列表 */
    if (!Bot[e.self_id].fl.get(e.user_id)) Bot[e.self_id].fl.set(e.user_id, { user_id: e.user_id })
    if (await redis.get(`lain:fl:${e.self_id}:${e.user_id}`)) redis.set(`lain:fl:${e.self_id}:${e.user_id}`, JSON.stringify({ user_id: e.user_id }))

    /** 计算接收DAU */
    let needSetRedis = false
    DAU[this.id].msg_count++
    if (data.group_id && !DAU[this.id].group_cache[data.group_id]) {
      DAU[this.id].group_cache[data.group_id] = 1
      DAU[this.id].group_count++
      needSetRedis = true
    }
    if (data.user_id && !DAU[this.id].user_cache[data.user_id]) {
      DAU[this.id].user_cache[data.user_id] = 1
      DAU[this.id].user_count++
      needSetRedis = true
    }
    const time = moment(Date.now()).add(2, "days").format("YYYY-MM-DD 00:00:00")
    let now = moment().format('YYYY-MM-DD')
    const EX = Math.round(
      (new Date(time).getTime() - new Date().getTime()) / 1000
    )
    redis.set(`QQBotDAU:${now}:msg_count:${this.id}`, DAU[this.id].msg_count * 1, { EX })
    if (needSetRedis) redis.set(`QQBotDAU:${now}:${this.id}`, JSON.stringify(DAU[this.id]), { EX })

    /** 保存消息次数 */
    try { common.recvMsg(e.self_id, e.adapter) } catch { }
    return e
  }

  /** 小兔崽子 */
  async QQBotTips(data, groupId) {
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

  /** 统一传入的格式并上传 */
  async Upload(i, type) {
    let { file } = common.getFile(i)
    /** 转换图片类型为png */
    // 动态导入
    const sharp = (await import("sharp")).default
    if (sharp && type == "image") {
      let file2 = await common.base64(segment.image(file))
      let filetype = await fileTypeFromBuffer(file2)
      logger.mark(common.nickname(this.id), "[原类型]", filetype)
      if (!["jpg", "png"].includes(filetype?.ext)) {
        file = await sharp(file2).jpeg({ quality: Bot.lain.cfg.quality }).toBuffer()
        logger.mark(common.nickname(this.id), "[转换后类型]", await fileTypeFromBuffer(file))
      }
    }

    /** 自定义图床、语音、视频 */
    try {
      if (Bot?.uploadFile) {
        /** 老接口，后续废除 */
        const url = await Bot.uploadFile(file, type)
        common.mark('Lain-plugin', `使用自定义图床发送文件：${url}`)
        let image = ""
        if (type == "image") {
          const { width, height } = sizeOf(await Bot.Buffer(file))
          image = { width, height }
        }
        console.warn('[Bot.uploadFile]接口即将废除!')
        return { type, file: url, ...image }
      } else if (type === 'image' && Bot?.imageToUrl) {
        /** 新接口 */
        const { width, height, url } = await Bot.imageToUrl(file)
        common.mark('Lain-plugin', `使用自定义图床发送图片：${url}`)
        return { type, file: url, width, height }
      } else if (type === 'audio' && Bot?.audioToUrl) {
        /** 语音接口 */
        const url = await Bot.audioToUrl(file)
        common.mark('Lain-plugin', `使用自定义服务器发送语音：${url}`)
        return { type, file: url }
      } else if (type === 'video' && Bot?.videoToUrl) {
        /** 视频接口 */
        const url = await Bot.videoToUrl(file)
        common.mark('Lain-plugin', `使用自定义服务器发送视频：${url}`)
        return { type, file: url }
      }
    } catch (error) {
      logger.error('自定义服务器调用错误，已跳过：', error)
    }

    /** QQ图床 */
    try {
      if (type === 'image' && Bot.lain.cfg.QQBotUin) {
        const { width, height, url } = await Bot.uploadQQ(file, Bot.lain.cfg.QQBotUin)
        common.mark('Lain-plugin', `QQ图床上传成功：${url}`)
        /** 图片多返回两个宽高 */
        return type === 'image' ? { type, file: url, width, height } : { type, file: url }
      }
    } catch (error) {
      logger.error('QQ图床调用错误，已跳过：', error)
    }

    /** 公网 */
    const { width, height, url } = await Bot.FileToUrl(file, type)
    common.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    /** 图片多返回两个宽高 */
    return type === 'image' ? { type, file: url, width, height } : { type, url }
  }

  /** 处理语音... */
  async get_audio(i) {
    let { type, file } = common.getFile(i)
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
          fs.writeFileSync(silk, silkData?.data || silkData)
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
      return await this.Upload(`file://${silk}`, 'audio')
    } else {
      common.error('QQBotApi', '文件保存失败：' + silk)
      return { type: 'text', text: '文件保存失败...' }
    }
  }

  /** ffmpeg转码 转为pcm */
  async runFfmpeg(input, output) {
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
  execSync(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }

  /** 转换整个文本为二维码 */
  async ConversionLink(data) {
    const form = new FormData();
    form.append('format', 'url');
    form.append('content', data);
    // form.append('lexer', 'text')
    form.append('expiry_days', '7')
    form.append('expiry_seconds', '0')
    form.append('private', 'false')

    const res = await fetch('https://paste.mozilla.org/api/', {
      method: 'POST',
      body: form
    });
    const url = (await res.text()).trim()
    if (res.status != 200) {
      common.warn(this.id, res.headers)
      return false
    }
    return "base64://" + (await qrcode.toBuffer(url, { errorCorrectionLevel: 'H', type: 'png', margin: 4, text: url })).toString("base64")
  }

  /** 转换文本中的URL为图片 */
  async HandleURL(msg) {
    const message = []
    if (msg?.text) msg = msg.text
    if (typeof msg !== 'string') return msg
    /** 白名单url */
    const whitelistUrl = Bot.lain.cfg.whitelist_Url

    /** 需要处理的url */
    let urls = await common.getUrls(msg) || []

    if (urls.length > 1 || msg.length > 500) {
      let base64 = await this.ConversionLink(msg)
      if (base64) {
        const Uint8Array = await common.rendering(base64, msg)
        message.push(await this.Upload({ type: 'image', file: Uint8Array }, 'image'))
        return message
      }
    }
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

  /** 转换message */
  async message(data) {
    data = common.array(data)
    let reply
    const image = []
    const message = []

    for (let i in data) {
      try {
        switch (data[i].type) {
          case 'at':
            break
          case 'image':
            image.push(await this.Upload(data[i], 'image'))
            break
          case 'video':
            message.push(await this.Upload(data[i], 'video'))
            break
          case 'record':
            message.push(await this.get_audio(data[i], 'audio'))
            break
          case 'text':
          case 'forward':
            if (data[i].text.trim()) {
              (await this.HandleURL(data[i])).forEach(msg => msg.type === 'image' ? image.push(msg) : message.push(msg.text))
            }
            break
          case 'reply':
            reply = data[i]
            message.push(data[i])
            break
          default:
            message.push(data[i])
            break
        }
      } catch (err) {
        common.error('Lain-plugin', err)
        message.push(data[i])
      }
    }

    if (image.length > 0) {
      message.push(image[0])
      image.splice(0, 1)
      try { await common.MsgTotal(this.id, 'QQBot', 'image') } catch { }
    } else {
      try { await common.MsgTotal(this.id, 'QQBot') } catch { }
    }

    return { message, image, reply }
  }

  /** 快速回复 */
  async reply(e, msg) {
    let res, newMsg = []
    const allMsg = []
    let { message, image } = await this.message(msg)

    if (e.bot.config?.markdown) {
      if (e.bot.config?.super_markdown) {
        if (image.length) message = [...message, ...image]
        allMsg.push(...await this.markdown(e, message))
      } else {
        for (let i = 0; i < message.length; i += 10)
          newMsg.push(message.slice(i, i + 10))
        message = newMsg
        if (image.length) message.push(...image.map(i => [i]))
        for (const i of message) allMsg.push(...await this.markdown(e, i))
      }
    } else {
      for (let i = 0; i < message.length; i += 10) {
        let split_msg = message.slice(i, i + 10)
        split_msg.unshift("\n")
        newMsg.push(split_msg)
      }
      message = newMsg
      if (image.length) message.push(...image.map(i => [i]))
      allMsg.push(...message)
    }

    for (let i of allMsg) {
      try {
        if (!i || (Array.isArray(i) && !i.length)) continue
        res = await e.sendMsg.call(e.data, i)
      } catch (error) {
        common.error(e.self_id, JSON.stringify(error))
        let data = error?.response?.data
        if (data) {
          data = `\n发送消息失败：\ncode:：${error.response.data.code}\nmessage：${error.response.data.message}`
        } else {
          data = error?.message || error
        }
        res = await e.sendMsg.call(e.data, data)
      }
    }

    res = {
      ...res,
      rand: 1,
      time: Date.now(),
      message_id: res?.msg_id
    }
    common.debug('Lain-plugin', res)

    /** 计算发送时DAU */
    DAU[this.id].send_count++
    const time = moment(Date.now()).add(2, "days").format("YYYY-MM-DD 00:00:00")
    let now = moment().format('YYYY-MM-DD')
    const EX = Math.round(
      (new Date(time).getTime() - new Date().getTime()) / 1000
    )
    redis.set(`QQBotDAU:${now}:send_count:${this.id}`, DAU[this.id].send_count * 1, { EX })

    return res
  }

  /** 转换为全局md */
  async markdown(e, data) {
    const custom_template_id = e.bot.config.markdown
    const message = []
    let markdown = {
      type: 'markdown',
      custom_template_id,
      params: []
    }

    for (let i of data) {
      switch (i.type) {
        case 'text':
          markdown.params.push({ key: Bot.lain.cfg.QQBotMD.text || 'text_start', values: [i.text.replace(/\n/g, '\r')] })
          break
        case 'image':
          markdown.params.push({ key: Bot.lain.cfg.QQBotMD.image || 'img_url', values: [i.file] })
          markdown.params.push({ key: Bot.lain.cfg.QQBotMD.ImageSize || 'img_dec', values: [`text #${i.width}px #${i.height}px`] })
          break
        default:
          message.push(i)
          break
      }
    }
    if (!markdown.params.length) return [message]
    markdown = [markdown]
    /** 按钮 */
    const button = await this.button(e)
    if (button && button?.length) markdown.push(...button)
    return message.length ? [markdown, message] : [markdown]
  }

  /** 按钮添加 */
  async button(e) {
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
    }
  }
}
