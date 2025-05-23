import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import api from './api.js'
import common from '../../model/common.js'
import { fileTypeFromBuffer } from 'file-type'

export default class SendMsg {
  /** 传入基本配置 */
  constructor (id, data) {
    /** 开发者id */
    this.id = id
    const { group_id, detail_type, user_id } = data
    this.group_id = group_id
    this.user_id = user_id
    this.detail_type = detail_type
  }

  /** 发送消息 */
  async message (msg) {
    /** 将云崽过来的消息统一为数组 */
    msg = await common.array(msg)
    /** 发送 */
    return await this.wc_msg(msg)
  }

  /** 转换格式并发送消息 */
  async wc_msg (msg) {
    const content = []
    /** 单独存储多图片，严格按照图片顺序进行发送 */
    const ArrImg = []

    /** chatgpt-plugin */
    if (msg?.[0].type === 'xml') msg = msg?.[0].msg

    for (const i of msg) {
      /** 加个延迟防止过快 */
      await lain.sleep(200)
      switch (i.type) {
        case 'at':
          content.push({
            type: 'mention',
            data: { user_id: String(i.qq) == 0 ? i.id : i.qq }
          })
          break
        case 'face':
          content.push(`[emoji:${i.text}]`)
          break
        case 'text':
          content.push({
            type: 'text',
            data: { text: i.text.replace('<lora', 'lora') }
          })
          break
        case 'emoji':
          content.push({
            type: 'wx.emoji',
            data: { file_id: i.text }
          })
          break
        case 'file':
          break
        case 'record':
          break
        case 'video':
          break
        case 'image':
          // eslint-disable-next-line no-case-declarations
          const img = await this.get_file_id(i)
          if (img?.type === 'text') {
            content.push(img)
          } else {
            ArrImg.push(img)
          }
          break
        case 'forward':
          content.push({
            type: 'text',
            data: { text: content.length > 0 ? `\n${i.text.replace('<lora', 'lora')}` : i.text.replace('<lora', 'lora') }
          })
          break
        default:
          content.push(JSON.stringify(i))
          break
      }
    }

    /** 返回结果 */
    let res
    /** 发送消息 */
    if (content.length > 0) {
      res = await api.send_message(this.detail_type, this.group_id || this.user_id, content)
      try { await common.MsgTotal(this.id, 'ComWeChat') } catch { }
    }

    await lain.sleep(200)

    /** 发送图片 */
    if (ArrImg.length > 0) {
      res = await api.send_message(this.detail_type, this.group_id || this.user_id, ArrImg)
      try { await common.MsgTotal(this.id, 'ComWeChat', 'image') } catch { }
    }
    return res
  }

  /** 上传图片获取图片id */
  async get_file_id (i) {
    let name
    let type = 'data'
    let file = i.file

    if (i.file?.type === 'Buffer') {
      /** 特殊格式？... */
      file = `base64://${Buffer.from(i.file.data).toString('base64')}`
    } else if (i.file instanceof Uint8Array) {
      /** 将二进制的base64转字符串 防止报错 */
      file = `base64://${Buffer.from(i.file).toString('base64')}`
    } else if (i.file instanceof fs.ReadStream) {
      /** 天知道从哪里蹦出来的... */
      file = `./${i.file.path}`
    } else if (typeof i.file === 'string') {
      /** 去掉本地图片的前缀 */
      file = i.file.replace(/^file:\/\//, '') || i.url
      if (fs.existsSync(i.file.replace(/^file:\/\//, ''))) {
        file = i.file.replace(/^file:\/\//, '')
      } else if (fs.existsSync(i.file.replace(/^file:\/\/\//, ''))) {
        file = i.file.replace(/^file:\/\/\//, '')
      }
    }

    if (fs.existsSync(file)) {
      /** 本地文件 */
      name = path.basename(file)
      file = fs.readFileSync(file).toString('base64')
    } else if (/^base64:\/\//.test(file)) {
      /** base64 */
      file = file.replace(/^base64:\/\//, '')
      name = `${Date.now()}.${(await fileTypeFromBuffer(Buffer.from(file, 'base64'))).ext}`
    } else if (/^http(s)?:\/\//.test(file)) {
      /** url图片 */
      file = Buffer.from(await (await fetch(file)).arrayBuffer()).toString('base64')
      name = `${Date.now()}.${(await fileTypeFromBuffer(Buffer.from(file, 'base64'))).ext}`
    } else {
      lain.error(this.id, i)
      return { type: 'text', data: { text: JSON.stringify(i) } }
    }

    /** 上传文件 获取文件id */
    let file_id
    /** 如果获取为空 则进行重试 最多3次 */
    for (let retries = 0; retries < 3; retries++) {
      file_id = (await api.upload_file(type, name, file))?.file_id
      if (file_id) break
      else logger.error(`第${retries + 1}次上传文件失败，正在重试...`)
    }

    /** 处理文件id为空 */
    if (!file_id) return { type: 'text', data: { text: '图片上传失败...' } }

    /** 特殊处理表情包 */
    if (/.gif$/.test(name)) {
      return { type: 'wx.emoji', data: { file_id } }
    } else {
      return { type: 'image', data: { file_id } }
    }
  }
}
