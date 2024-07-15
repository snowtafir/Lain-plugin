import { createInterface } from 'readline'
import fs from 'node:fs'
import { fileTypeFromBuffer } from 'file-type'
import _ from 'lodash'
import Cfg from '../../lib/config/config.js'
import common from '../../lib/common/common.js'

const uin = 'stdin'
const path = 'data/stdin/'
const user_id = 55555

// 创建数据文件夹
common.mkdirs(path)

export default async function stdin () {
  /** 自定义标准输入头像
  可随机设置随机头像(将头像文件放至resources/Avatar目录即可) */
  let avatar = process.cwd() + '/plugins/Lain-plugin/resources/default_avatar.jpg'
  if (fs.existsSync(process.cwd() + '/plugins/Lain-plugin/resources/avatar.jpg')) {
    avatar = process.cwd() + '/plugins/Lain-plugin/resources/avatar.jpg'
  } else {
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

  /** 构建基本参数 */
  Bot[uin] = {
    adapter: 'stdin',
    fl: new Map(),
    gl: new Map(),
    gml: new Map(),
    tl: new Map(),
    guilds: new Map(),
    id: uin,
    uin,
    name: Cfg.Stdin.name,
    nickname: Cfg.Stdin.name,
    avatar,
    stat: { start_time: parseInt(Date.now() / 1000), recv_msg_cnt: 0 },
    version: Bot.lain.adapter.stdin.version,
    apk: Bot.lain.adapter.stdin.apk,
    /** 转发 */
    makeForwardMsg: (msg) => { return { type: 'node', data: msg } },
    pickUser: () => {
      return {
        user_id,
        nickname: Cfg.Stdin.name,
        sendMsg: msg => sendMsg(msg),
        recallMsg: msg_id => lain.info(uin, `撤回消息：${msg_id}`),
        makeForwardMsg: (msg) => { return { type: 'node', data: msg } },
        sendForwardMsg,
        sendFile: (file, name) => sendFile(file, name)
      }
    },
    pickFriend: () => {
      return {
        user_id,
        nickname: Cfg.Stdin.name,
        sendMsg: msg => sendMsg(msg),
        recallMsg: msg_id => lain.info(uin, `撤回消息：${msg_id}`),
        makeForwardMsg: (msg) => { return { type: 'node', data: msg } },
        sendForwardMsg,
        sendFile: (file, name) => sendFile(file, name)
      }
    },
    pickGroup: () => {
      return {
        user_id,
        nickname: Cfg.Stdin.name,
        sendMsg: msg => sendMsg(msg),
        recallMsg: msg_id => lain.info(uin, `撤回消息：${msg_id}`),
        makeForwardMsg: (msg) => { return { type: 'node', data: msg } },
        sendForwardMsg,
        sendFile: (file, name) => sendFile(file, name)
      }
    }
  }

  if (!Bot.adapter.includes(uin)) Bot.adapter.unshift(uin)

  /** 监听控制台输入 */
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('SIGINT', () => { rl.close(); process.exit() })
  rl.on('close', () => process.exit())

  rl.on('line', async (input) => {
    input = input.trim()
    lain.info(uin, `<好友:${Cfg.Stdin.name}(${user_id})> -> ${input}`)
    if (!input) return false
    const data = msg(input)
    Bot[uin].stat.recv_msg_cnt++
    Bot.emit('message', data)
  })
  await common.init('Lain:restart:stdin')
}

async function makeBuffer (file) {
  if (Buffer.isBuffer(file)) return file
  if (file.match(/^base64:\/\//)) {
    return Buffer.from(file.replace(/^base64:\/\//, ''), 'base64')
  } else if (file.match(/^https?:\/\//)) {
    return Buffer.from(await (await fetch(file)).arrayBuffer())
  } else if (fs.existsSync(file)) {
    return Buffer.from(fs.readFileSync(file))
  }
  return file
}

async function fileType (data) {
  const file = {}
  try {
    file.url = _.truncate(data, { length: 100 })
    file.buffer = await makeBuffer(data)
    file.type = await fileTypeFromBuffer(file.buffer)
    file.path = `${path}${Date.now()}.${file.type.ext}`
  } catch (err) {
    lain.error(uin, `文件类型检测错误：${logger.red(err)}`)
  }
  return file
}

function msg (msg) {
  /** 调试日志 */
  lain.debug(uin, JSON.stringify(msg))
  const time = parseInt(Date.now() / 1000)

  let e = {
    adapter: 'stdin',
    bot: Bot[uin],
    message_id: common.message_id(),
    message_type: 'private',
    post_type: 'message',
    // sub_type: 'friend',
    self_id: uin,
    seq: 888,
    time,
    uin,
    user_id,
    message: [{ type: 'text', text: msg }],
    raw_message: msg,
    isMaster: true,
    toString: () => msg
  }
  /** 用户个人信息 */
  e.sender = {
    card: Cfg.Stdin.name,
    nickname: Cfg.Stdin.name,
    role: '',
    user_id
  }

  /** 构建member */
  const member = {
    info: {
      user_id,
      nickname: Cfg.Stdin.name,
      last_sent_time: time
    },
    /** 获取头像 */
    getAvatarUrl: () => Bot[uin].avatar
  }

  /** 赋值 */
  e.member = member

  /** 构建场景对应的方法 */
  e.friend = {
    user_id,
    nickname: Cfg.Stdin.name,
    sendMsg: msg => sendMsg(msg),
    recallMsg: msg_id => lain.info(uin, `撤回消息：${msg_id}`),
    makeForwardMsg: (msg) => { return { type: 'node', data: msg } },
    sendForwardMsg,
    sendFile: (file, name) => sendFile(file, name)
  }

  /** 快速撤回 */
  e.recall = async (msg_id) => {
    return lain.info(uin, `撤回消息：${msg_id}`)
  }
  /** 快速回复 */
  e.reply = async (reply) => {
    return await sendMsg(reply)
  }
  /** 保存消息次数 */
  try { common.recvMsg(e.self_id, e.adapter) } catch { }
  return e
}

/** 发送消息 */
async function sendMsg (msg) {
  if (!Array.isArray(msg)) msg = [msg]
  for (let i of msg) {
    if (typeof i != 'object') {
      i = { type: 'text', data: { text: i } }
    } else if (!i.data) {
      i = { type: i.type, data: { ...i, type: undefined } }
    }

    let file
    if (i.data.file) {
      file = await fileType(i.data.file)
    }

    switch (i.type) {
      case 'text':
        i.data.text = String(i.data.text).trim()
        if (!i.data.text) break
        if (i.data.text.match('\n')) {
          i.data.text = `\n${i.data.text}`
        }
        lain.info(uin, `发送文本：${i.data.text}`)
        break
      case 'image':
        lain.info(uin, `发送图片：${file.url}\n文件已保存到：${logger.cyan(file.path)}`)
        fs.writeFileSync(file.path, file.buffer)
        break
      case 'record':
        lain.info(uin, `发送音频：${file.url}\n文件已保存到：${logger.cyan(file.path)}`)
        fs.writeFileSync(file.path, file.buffer)
        break
      case 'video':
        lain.info(uin, `发送视频：${file.url}\n文件已保存到：${logger.cyan(file.path)}`)
        fs.writeFileSync(file.path, file.buffer)
        break
      case 'reply':
        break
      case 'at':
        break
      case 'node':
        sendForwardMsg(i.data)
        break
      default:
        if (!Array.isArray(i?.data) || Object.keys(i.data).length === 0) break
        i = JSON.stringify(i)
        if (i.match('\n')) i = `\n${i}`
        lain.info(uin, `发送消息：${i}`)
    }
  }
  try { await common.MsgTotal(this.id, 'stdin') } catch { }
  return { message_id: common.message_id() }
}

async function sendFile (file, name = path.basename(file)) {
  const buffer = await makeBuffer(file)
  if (!Buffer.isBuffer(buffer)) {
    lain.error(uin, `发送文件错误：找不到文件 ${logger.red(file)}`)
    return false
  }

  const files = `${path}${Date.now()}-${name}`
  lain.info(uin, `发送文件：${file}\n文件已保存到：${logger.cyan(files)}`)
  return fs.writeFileSync(files, buffer)
}

function sendForwardMsg (msg) {
  const messages = []
  for (const { message } of msg) {
    messages.push(sendMsg(message))
  }
  return { data: messages }
}

lain.info('Lain-plugin', '标准输入适配器加载完成')
