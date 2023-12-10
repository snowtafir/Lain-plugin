import fs from 'fs'
import { randomUUID } from 'crypto'
import common from '../../model/common.js'
import api from './api.js'

export default class SendMsg {
  /** 传入基本配置 */
  constructor(id, isGroup = true) {
    /** 机器人uin */
    this.id = id
    /** 是否群聊 */
    this.isGroup = isGroup
    /** 机器人名称 */
    this.name = Bot?.[id]?.nickname || '未知'
  }

  /** 发送消息 */
  async message (data, id, quote = false) {
    /** 将云崽过来的消息统一为数组 */
    data = common.array(data)
    /** 转为shamrock可以使用的格式 */
    let { msg, CQ, node } = await this.msg(data)

    /** 引用消息 */
    if (quote && !node) msg.unshift({ type: 'reply', data: { id: quote } })
    if (node) CQ = ['[转发消息]']

    /** 发送消息 */
    return await this.sendMsg(id, msg, CQ, node)
  }

  /** 转为shamrock可以使用的格式 */
  async msg (data) {
    if (typeof data == 'string') data = [{ type: 'text', text: data }]
    if (!Array.isArray(data)) data = [data]
    const CQ = []
    let msg = []
    let node = false

    /** chatgpt-plugin */
    if (data?.[0]?.type === 'xml') data = data?.[0].msg

    for (let i of data) {
      if (i?.node) node = true
      switch (i.type) {
        case 'at':
          CQ.push(`{at:${Number(i.qq) == 0 ? i.id : i.qq}}`)
          msg.push({ type: 'at', data: { qq: Number(i.qq) == 0 ? i.id : i.qq } })
          break
        case 'face':
          CQ.push(`{face:${i.text}}`)
          msg.push({ type: 'face', data: { id: i.text } })
          break
        case 'text':
          CQ.push(i.text)
          msg.push({ type: 'text', data: { text: i.text } })
          break
        case 'file':
          break
        case 'record':
          CQ.push(`{record:${i.file}}`)
          try {
            const base64 = await this.getFile(i, 'record')
            /** 上传文件 */
            const { file } = await api.download_file(this.id, base64.data.file)
            msg.push({ type: 'record', data: { file: `file://${file}` } })
          } catch (err) {
            common.error(this.id, err)
            msg.push(await this.getFile(i, 'record'))
          }
          break
        case 'video':
          CQ.push(`{video:${i.file}}`)
          try {
            const base64 = await this.getFile(i, 'video')
            /** 上传文件 */
            const { file } = await api.download_file(this.id, base64.data.file)
            msg.push({ type: 'video', data: { file: `file://${file}` } })
          } catch (err) {
            common.error(this.id, err)
            msg.push(await this.getFile(i, 'video'))
          }
          break
        case 'image':
          CQ.push('{image:base64://...}')
          msg.push(await this.getFile(i, 'image'))
          break
        case 'poke':
          CQ.push(`[CQ:poke,id=${i.id}]`)
          msg.push({ type: 'poke', data: { type: i.id, id: 0, strength: i?.strength || 0 } })
          break
        case 'touch':
          CQ.push(`{poke:${i.id}}`)
          msg.push({ type: 'touch', data: { id: i.id } })
          break
        case 'weather':
          CQ.push(`[CQ=weather,${i.city ? ('city=' + i.city) : ('code=' + i.code)}]`)
          msg.push({ type: 'weather', data: { code: i.code, city: i.city } })
          break
        case 'json':
          let json = i.data
          if (typeof i.data !== 'string') json = JSON.stringify(i.data)
          CQ.push(`[CQ=json,data=${json}]`)
          msg.push({ type: 'json', data: { data: json } })
          break
        case 'music':
          CQ.push(`[CQ=music,type=${i.data.type},id=${i.data.id}]`)
          msg.push({ type: 'music', data: i.data })
          break
        case 'location':
          const { lat, lng: lon } = data
          CQ.push(`[CQ=json,lat=${lat},lon=${lon}]`)
          msg.push({ type: 'location', data: { lat, lon } })
          break
        case 'share':
          const { url, title, image, content } = data
          CQ.push(`[CQ=json,url=${url},title=${title},image=${image},content=${content}]`)
          msg.push({ type: 'share', data: { url, title, content, image } })
          break
        case 'forward':
          CQ.push(i.text)
          msg.push({ type: 'text', data: { text: i.text } })
          break
        case 'node':
          msg.push({ type: 'node', data: { ...i } })
          break
        default:
          CQ.push(JSON.stringify(i))
          msg.push({ type: 'text', data: { text: JSON.stringify(i) } })
          break
      }
    }

    /** 合并转发 */
    if (node) {
      const NodeMsg = []
      NodeMsg.push(...msg
        .filter(i => !(i.type == 'at' || i.type == 'record'))
        .map(i => ({
          type: 'node',
          data: {
            name: this.name,
            content: [i]
          }
        }))
      )
      msg = NodeMsg
    }

    return { msg, CQ, node }
  }

  /** 统一文件格式 */
  async getFile (i, type) {
    const res = common.getFile(i)
    const { file } = res
    switch (res.type) {
      case 'file':
        return { type, data: { file: 'base64://' + fs.readFileSync(file.replace(/^file:\/\//, '')).toString('base64') } }
      case 'buffer':
        return { type, data: { file: `base64://${Buffer.from(file).toString('base64')}` } }
      case 'base64':
        return { type, data: { file } }
      case 'http':
        return { type, data: { file } }
      default:
        return { type: 'text', data: { text: `无法处理此格式：${JSON.stringify(i)}` } }
    }
  }

  /** 发送消息 */
  async sendMsg (id, msg, CQ, node) {
    /** 打印日志 */
    common.info(this.id, `发送${this.isGroup ? '群' : '好友'}消息：[${id}]${CQ.join('')}`)

    /** 处理合并转发 */
    if (node) {
      if (this.isGroup) {
        return await api.send_group_forward_msg(this.id, id, msg)
      } else {
        return await api.send_private_forward_msg(this.id, id, msg)
      }
    }

    /** 非合并转发 */
    const bot = Bot.shamrock.get(String(this.id))
    if (!bot) return common.info(this.id, '不存在此Bot')

    const echo = randomUUID()
    /** 判断群聊、私聊 */
    const action = this.isGroup ? 'send_group_msg' : 'send_private_msg'
    const params = { [this.isGroup ? 'group_id' : 'user_id']: id, message: msg }
    /** 发送消息 */
    bot.socket.send(JSON.stringify({ echo, action, params }))

    /** 等待返回结果 */
    for (let i = 0; i < 1200; i++) {
      let data = await Bot.lain.on.get(echo)
      if (data) {
        Bot.lain.on.delete(echo)
        try {
          if (Object.keys(data?.data).length > 0 && data?.data) {
            const { message_id, time } = data.data

            /** 储存自身发送的消息 */
            await redis.set(`Shamrock:${this.id}:${message_id}`, JSON.stringify(data), { EX: 120 })
            return {
              time,
              message_id,
              seq: message_id,
              rand: 1
            }
          }
          return data
        } catch {
          return data
        }
      } else {
        await common.sleep(50)
      }
    }
    return '获取失败'
  }
}
