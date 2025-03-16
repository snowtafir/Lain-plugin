import fs from 'fs'

import Cfg from '../lib/config/config.js'
import WebSocket from './WebSocket.js'
import stdin from './stdin/index.js'
import QQSDK from './QQBot/QQSDK.js'
import QQBot from './QQBot/index.js'
import QQGuild from './QQBot/QQGuild.js'
import WeChat4u from './WeChat-Web/index.js'

/** 启动HTTP服务器，加载shamrock、Com微信适配器 */
WebSocket.start()

/** 加载标准输入 */
if (Cfg.Stdin.state) stdin()

/** QQBot适配器 */
if (Cfg.getToken('QQ_Token') && Object.values(Cfg.getToken('QQ_Token')).length) {
  Object.values(Cfg.getToken('QQ_Token')).forEach(async bot => {
    if (bot.type == 0 || bot.type == 2) {
      try {
        const SDK = new QQSDK(bot)
        await SDK.start()
        lain.info(SDK.id, await new QQBot(SDK.sdk))
        lain.info(SDK.id, await new QQGuild(SDK.sdk))
      } catch (err) {
        lain.error('Lain-plugin', `QQBot <${bot.appid}> 启动失败`, err)
      }
    }
    if (bot.type == 1) {
      try {
        const SDK = new QQSDK(bot)
        await SDK.start()
        lain.info(SDK.id, await new QQGuild(SDK.sdk))
      } catch (err) {
        lain.error('Lain-plugin', `QQGuild <${bot.appid}> 启动失败`, err)
      }
    }
  })
}

/** 加载微信 */
const _path = fs.readdirSync('./plugins/Lain-plugin/config')
const JSONFile = _path.filter(file => file.endsWith('.json'))
if (JSONFile.length > 0) {
  JSONFile.forEach(async i => {
    const id = i.replace(/\.json$/gi, '')
    try {
      await new WeChat4u(id, i)
    } catch (error) {
      lain.error('Lain-plugin', `微信 ${id} 登录失败`, error)
    }
  })
}

lain.info('Lain-plugin', `Lain-plugin插件${Bot.lain.version}全部初始化完成~`)
lain.info('Lain-plugin', 'https://gitee.com/Zyy955/Lain-plugin')
