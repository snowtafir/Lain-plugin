import sizeOf from 'image-size'
import QrCode from 'qrcode'
import get_urls from 'get-urls'
import fs from 'fs'
import fetch from 'node-fetch'
import crypto from 'crypto'
import common from '../../lib/common/common.js'
import Cfg from '../../lib/config/config.js'
import { fileTypeFromBuffer } from 'file-type'

/**
* 传入文件，返回Buffer
* 可以是http://、file://、base64://、buffer
* @param {file://|base64://|http://|buffer} file
* @param {object} data
  - { http:true } 原样返回http
  - { file:true } 原样返回file
  - { base:true } 原样返回Base
  - { buffer:true } 原样返回Buffer
* @param {Promise<Buffer>} Buffer
*/
Bot.Buffer = async function (file, data) {
  if (Buffer.isBuffer(file) || file instanceof Uint8Array) {
    if (data?.buffer) return file
    return file
  } else if (file instanceof fs.ReadStream) {
    return await Bot.Stream(file)
  } else if (fs.existsSync(file.replace(/^file:\/\//, ''))) {
    if (data?.file) return file
    return fs.readFileSync(file.replace(/^file:\/\//, ''))
  } else if (fs.existsSync(file.replace(/^file:\/\/\//, ''))) {
    if (data?.file) return file.replace(/^file:\/\/\//, 'file://')
    return fs.readFileSync(file.replace(/^file:\/\/\//, ''))
  } else if (file.startsWith('base64://')) {
    if (data?.base) return file
    return Buffer.from(file.replace(/^base64:\/\//, ''), 'base64')
  } else if (/^http(s)?:\/\//.test(file)) {
    if (data?.http) return file
    let res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      return Buffer.from(await res.arrayBuffer())
    }
  } else {
    throw new Error('传入的文件类型不符合规则，只接受url、buffer、file://路径或者base64编码的图片')
  }
}

/**
 * 传入文件，返回不带base64://格式的字符串
 * 可以是http://、file://、base64://、buffer
 * @param {file://|base64://|http://|buffer} file
 * @param {object} data
  - { http:true } 原样返回http
  - { file:true } 原样返回file
  - { base:true } 原样返回Base
  - { buffer:true } 原样返回Buffer
 * @returns {Promise<string>} base64字符串
 */
Bot.Base64 = async function (file, data) {
  if (Buffer.isBuffer(file) || file instanceof Uint8Array) {
    if (data?.buffer) return file
    return file.toString('base64')
  } else if (file instanceof fs.ReadStream) {
    return await Bot.Stream(file, { base: true })
  } else if (fs.existsSync(file.replace(/^file:\/\//, ''))) {
    if (data?.file) return file
    return fs.readFileSync(file.replace(/^file:\/\//, '')).toString('base64')
  } else if (fs.existsSync(file.replace(/^file:\/\/\//, ''))) {
    if (data?.file) return file.replace(/^file:\/\/\//, 'file://')
    return fs.readFileSync(file.replace(/^file:\/\/\//, '')).toString('base64')
  } else if (file.startsWith('base64://')) {
    if (data?.base) return file
    return file.replace(/^base64:\/\//, '')
  } else if (/^http(s)?:\/\//.test(file)) {
    if (data?.http) return file
    let res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      return Buffer.from(await res.arrayBuffer()).toString('base64')
    }
  } else {
    throw new Error('传入的文件类型不符合规则，只接受url、buffer、file://路径或者base64编码的图片')
  }
}

/**
 * 传入可读流，返回buffer、base64://
 * @param {ReadStream} file - 可读流
 * @param {object} data - 可选，默认返回buffer
  - { buffer:true } 返回buffer
  - { base:true } 返回Base://
 * @returns {Promise<string|Buffer>} buffer或base64字符串
 */
Bot.Stream = async function (file, data) {
  return new Promise((resolve, reject) => {
    const chunks = []
    file.on('data', (chunk) => chunks.push(chunk))
    file.on('end', () => data?.base ? resolve(Buffer.concat(chunks).toString('base64')) : resolve(Buffer.concat(chunks)))
    file.on('error', (err) => reject(err))
  })
}

/**
* QQ图床
* 支持http://、file://、base64://、buffer
* @param file  * 处理传入的图片文件，转为url
* @param uin botQQ 可选，未传入则调用Bot.uin
* @returns {Promise<Object>} 包含以下属性的对象：
*   - {number} width - 图片宽度
*   - {number} height - 图片高度
*   - {string} url - QQ图床url
*   - {string} md5 - 文件的MD5哈希值
*/
Bot.uploadQQ = async function (file, uin = Bot.uin) {
  uin = Number(uin)
  const buffer = await Bot.Buffer(file)
  try {
    await Bot[uin].pickGroup(Math.floor(Math.random() * 10000 + 1)).sendMsg([segment.image(buffer)])
  } catch (e) {
    throw new Error('上传图片失败', e)
  }
  const { width, height } = sizeOf(buffer)
  const md5 = crypto.createHash('md5').update(buffer).digest('hex').toUpperCase()
  const url = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${md5}/0?term=2`
  return { width, height, url, md5 }
}

/**
* 传入文件，转为服务器公网url
* 可以是http://、file://、base64://、buffer
* @param {string|Buffer} file - 传入的图片文件
* @param {image|audio|video} type - 可选，不传为图片
* @returns {Promise<Object>} 包含以下属性的对象：
*   - {number} width - 图片宽度
*   - {number} height - 图片高度
*   - {string} url - 服务器后的公网URL
*   - {string} md5 - 文件的MD5哈希值
*/
Bot.FileToUrl = async function (file, type = 'image') {
  /** 转为buffer */
  const buffer = await Bot.Buffer(file)
  /** 算下md5 */
  const md5 = crypto.createHash('md5').update(buffer).digest('hex').toUpperCase()
  /** 计算大小 */
  const size = Buffer.byteLength(buffer) / 1024

  let File = {
    md5,
    type,
    width: 0,
    height: 0,
    size
  }

  /** 图片需要计算多两个参数 */
  if (type === 'image') {
    const { width, height } = sizeOf(buffer)
    File.width = width
    File.height = height
  }

  /** 语音类型 */
  if (type === 'audio') {
    File.mime = 'audio/silk'
    File.type = 'silk'
  } else {
    /** 其他类型 */
    try {
      const { mime, ext } = await fileTypeFromBuffer(buffer)
      File.mime = mime
      File.type = ext
    } catch (error) {
      logger.error('未知类型：', error)
      File.mime = 'application/octet-stream'
      File.type = 'txt'
    }
  }

  /** 文件名称 */
  const filename = md5 + `.${File.type}`
  /** 路径 */
  const path = `./temp/FileToUrl/${filename}`

  fs.writeFileSync(path, buffer)
  File.path = path
  File.filename = filename

  /** 保存 */
  lain.Files.set(filename, File)
  /** 定时删除 */
  setTimeout(() => {
    lain.Files.delete(filename)
    logger.debug(`[缓存清理] => [filename：${filename}]`)
  }, (Cfg.Server.InvalidTime || 30) * 1000)
  /** 获取基本配置 */
  const { port, baseIP, baseUrl } = Cfg.Server
  let url = `http://${baseIP}:${port}/api/File/${filename}`
  if (baseUrl) url = baseUrl.replace(/\/$/, '') + `/api/File/${filename}`
  return { width: File.width, height: File.height, url, md5 }
}

/**
* 传入文件，返回本地路径
* 可以是http://、file://、base64://、buffer
* @param {file://|base64://|http://|buffer} file
* @param {string} _path - 可选，不传默认为图片
*/
Bot.FileToPath = async function (file, _path) {
  if (!_path) _path = `./temp/FileToUrl/${Date.now()}.png`
  if (Buffer.isBuffer(file) || file instanceof Uint8Array) {
    fs.writeFileSync(_path, file)
    return _path
  } else if (file instanceof fs.ReadStream) {
    const buffer = await Bot.Stream(file)
    fs.writeFileSync(_path, buffer)
    return _path
  } else if (fs.existsSync(file.replace(/^file:\/\//, ''))) {
    fs.copyFileSync(file.replace(/^file:\/\//, ''), _path)
    return _path
  } else if (fs.existsSync(file.replace(/^file:\/\/\//, ''))) {
    fs.copyFileSync(file.replace(/^file:\/\/\//, ''), _path)
    return _path
  } else if (file.startsWith('base64://')) {
    const buffer = Buffer.from(file.replace(/^base64:\/\//, ''), 'base64')
    fs.writeFileSync(_path, buffer)
    return _path
  } else if (/^http(s)?:\/\//.test(file)) {
    const res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      const buffer = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(_path, buffer)
      return _path
    }
  } else {
    throw new Error('传入的文件类型不符合规则，只接受url、buffer、file://路径或者base64编码的图片')
  }
}

/**
* 处理segment中的图片、语音、文件，获取对应的类型
* @param i 需要处理的对象
* 传入类似于 {type:"image", file:"file://...", url:"http://"}
*
* 返回 {type:<file|buffer|base64|http|error>, file=:<file://|buffer|base64://|http://|i.file>}
*
* error为无法判断类型，直接返回i.file
*/
Bot.toType = function (i) {
  if (i?.url) {
    if (i?.url?.includes('gchat.qpic.cn') && !i?.url?.startsWith('https://')) {
      i = 'https://' + i.url
    } else {
      i = i.url
    }
  } else if (typeof i === 'object') {
    i = i.file
  }

  let file
  let type = 'file'

  // 检查是否是Buffer类型
  if (i?.type === 'Buffer') {
    type = 'buffer'
    file = Buffer.from(i?.data)
  } else if (i?.type === 'Buffer' || i instanceof Uint8Array || Buffer.isBuffer(i?.data || i)) {
    type = 'buffer'
    file = i?.data || i
  } else if (i instanceof fs.ReadStream || i?.path) {
    // 检查是否是ReadStream类型
    if (fs.existsSync(i.path)) {
      file = `file://${i.path}`
    } else {
      file = `file://./${i.path}`
    }
  } else if (typeof i === 'string') {
    // 检查是否是字符串类型
    if (fs.existsSync(i.replace(/^file:\/\//, ''))) {
      file = i
    } else if (fs.existsSync(i.replace(/^file:\/\/\//, ''))) {
      file = i.replace(/^file:\/\/\//, 'file://')
    } else if (fs.existsSync(i)) {
      file = `file://${i}`
    } else if (/^base64:\/\//.test(i)) {
      // 检查是否是base64格式的字符串
      type = 'base64'
      file = i
    } else if (/^http(s)?:\/\//.test(i)) {
      // 如果是url，则直接返回url
      type = 'http'
      file = i
    } else {
      common.log('Lain-plugin', '未知格式，无法处理：' + i)
      type = 'error'
      file = i
    }
  } else {
    // 留个容错
    common.log('Lain-plugin', '未知格式，无法处理：' + i)
    type = 'error'
    file = i
  }

  return { type, file }
}

/**
* 处理segment中的i||i.file，主要用于一些sb字段，标准化他们
* @param {string|object} file - i.file
*/
Bot.FormatFile = async function (file) {
  const str = function () {
    if (fs.existsSync(file.replace(/^file:\/\//, ''))) {
      return `file://${file.replace(/^file:\/\//, '')}`
    } else if (fs.existsSync(file.replace(/^file:\/\/\//, ''))) {
      return file.replace(/^file:\/\/\//, 'file://')
    } else if (fs.existsSync(file)) {
      return `file://${file}`
    }
    return file
  }

  switch (typeof file) {
    case 'object':
      /** 这里会有复读这样的直接原样不动把message发过来... */
      if (file.url) {
        if (file?.url?.includes('gchat.qpic.cn') && !file?.url?.startsWith('https://')) return `https://${file.url}`
        return file.url
      }

      /** 老插件渲染出来的图有这个字段 */
      if (file?.type === 'Buffer') return Buffer.from(file?.data)
      if (Buffer.isBuffer(file) || file instanceof Uint8Array) return file

      /** 流 */
      if (file instanceof fs.ReadStream) return await Bot.Stream(file, { base: true })

      /** i.file */
      if (file.file) return str(file.file)
      return file
    case 'string':
      return str(file)
    default:
      return file
  }
}

/**
* 传入字符串 提取url 返回数组
* @param {string} url 传入字符串，提取出所有url
* @param {array} exclude - 可选，需使用请传入数组，数组内为排除的url，即不返回数组内相近的url
*/
Bot.getUrls = function (url, exclude = []) {
  if (!Array.isArray(exclude)) exclude = [exclude]
  let urls = []
  /** 中文不符合url规范 */
  url = url.replace(/[\u4e00-\u9fa5]/g, '|')
  urls = get_urls(url, {
    exclude,
    /** 去除 WWW */
    stripWWW: false,
    /** 规范化协议 */
    normalizeProtocol: false,
    /** 移除查询参数 */
    removeQueryParameters: false,
    /** 移除唯一斜杠 */
    removeSingleSlash: false,
    /** 查询参数排序 */
    sortQueryParameters: false,
    /** 去除认证信息 */
    stripAuthentication: false,
    /** 去除文本片段 */
    stripTextFragment: false,
    /** 移除末尾斜杠 */
    removeTrailingSlash: false
  })
  return [...urls]
}

/**
 * Bot.Button 是一个函数，用于生成按钮列表。
 * @param {Array} list - 包含按钮信息的数组。每个对象可以有以下属性：
 *   @param {string} text - 按钮的显示文本。
 *   @param {number} style - 按钮的显示的颜色，0-灰色，1-蓝色。
 *   @param {string} data - 按钮的自定义回复内容。
 *   @param {boolean} send - 如果为 true，则直接发送内容。
 *   @param {boolean} admin - 如果为 true，则仅管理员可以点击此按钮。
 *   @param {Array} list - 包含有权限点击此按钮的用户 id 的数组。
 *   @param {Array} role - 包含有权限点击此按钮的用户组 id 的数组（仅频道可用）。
 *   @param {boolean} reply - 如果为 true，则点击后自动添加引用回复。
 *   @param {string} link - 按钮的 http 跳转链接。
 *   以上参数，均可自行组合。
 * @param {number} [line=3] - 按钮的行数。
 * @returns {Array} button - 返回包含按钮信息的数组。
 */
Bot.Button = function (list, line = 3) {
  let id = 0
  let index = 1
  let arr = []
  let button = []

  for (let i of list) {
    /** 处理用户id */
    if (i.list && i.list.length) {
      const list = []
      i.list.forEach(p => {
        p = p.split('-')
        p = p[1] || p[0]
        list.push(p)
      })
      i.list = list
    }

    if (Array.isArray(i)) {
      button.push(...Bot.Button(i, 10))
    } else {
      if (typeof i.permission === 'string') {
        if (i.permission === 'xxx') {
          i.list = []
        } else {
          const openid = i.permission.split('-')
          i.list = [openid[1] || openid[0]]
        }
        i.permission = false
      }
      let Button = {
        id: String(id),
        render_data: {
          label: i.text || i.label || i.link,
          style: (i.style == 0) ? 0 : 1,
          visited_label: i.text || i.label || i.link
        },
        action: {
          type: i.type || (i.link ? 0 : 2),
          reply: i.reply || false,
          permission: i.permission || {
            type: (i.admin && 1) || (i.list && '0') || (i.role && 3) || 2,
            specify_user_ids: i.list || [],
            specify_role_ids: i.role || []
          },
          data: i.data || i.input || i.callback || i.link || i.text || i.label,
          enter: i.send || i.enter || 'callback' in i || false,
          unsupport_tips: i.tips || 'err'
        }
      }
      if (i.QQBot) {
        if (i.QQBot.render_data)
          Object.assign(Button.render_data, i.QQBot.render_data)
        if (i.QQBot.action)
          Object.assign(Button.action, i.QQBot.action)
      }
      arr.push(Button)
      if (index % line == 0 || index == list.length) {
        button.push({
          type: 'button',
          buttons: arr
        })
        arr = []
      }
    }
    id++
    index++
  }
  return button
}

/** 转换文本中的URL为图片 */
Bot.HandleURL = async function (msg) {
  const message = []
  if (msg?.text) msg = msg.text
  /** 需要处理的url */
  let urls = Bot.getUrls(msg, Cfg.WhiteLink)

  let promises = urls.map(link => {
    return new Promise((resolve, reject) => {
      common.mark('Lain-plugin', `url替换：${link}`)
      QrCode.toBuffer(link, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 4,
        text: link
      }, async (err, buffer) => {
        if (err) reject(err)
        const base64 = 'base64://' + buffer.toString('base64')
        const file = await common.Rending({ base64, link }, 'QRCode/QRCode')
        message.push({ type: 'image', file })
        msg = msg.replace(link, '[链接(请扫码查看)]')
        msg = msg.replace(link.replace(/^http:\/\//g, ''), '[链接(请扫码查看)]')
        msg = msg.replace(link.replace(/^https:\/\//g, ''), '[链接(请扫码查看)]')
        resolve()
      })
    })
  })

  await Promise.all(promises)
  message.unshift({ type: 'text', text: msg })
  return message
}
