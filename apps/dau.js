import fs from 'node:fs'
import { join } from 'node:path'
import moment from 'moment'
import schedule from 'node-schedule'
import Cfg from '../lib/config/config.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import _ from 'lodash'

export class QQBotDAU extends plugin {
  constructor() {
    super({
      name: 'DAU',
      event: 'message',
      priority: 100,
      rule: [
        {
          reg: /^#?([Qq]+[Bb]ot[Dd][Aa][Uu](pro|)|[Dd][Aa][Uu](pro|))/,
          fnc: 'DAUStat'
        },
        {
          reg: /^#?([Qq]+[Bb]ot[Dd][Aa][Uu]刷新|[Dd][Aa][Uu]刷新)/,
          fnc: 'DAURef',
          permission: 'master'
        }
      ]
    })

    /** 定时任务 */
    this.task = {
      /** 任务名 */
      name: "[Lain-plugin] 刷新DAU缓存",
      /** 任务cron表达式 */
      cron: "1 0 0 * * ?",
      /** 任务方法名 */
      fnc: async () => {
        if (!Cfg.Other.QQBotdau) return
        await this.Task()
        await lain.sleep(100)
        for (let id of Bot.adapter) {
          if (Bot?.[id]?.adapter == "QQBot" && !lain.DAU?.[id]) {
            lain.DAU[id] = {
              user_count: 0,
              group_count: 0,
              msg_count: 0,
              send_count: 0,
              user_cache: {},
              group_cache: {},
              time: moment().format('YYYY-MM-DD')
            }
          }
        }
        await lain.sleep(100)
        await this.Task()
      }
    }
  }

  async init() {
    if (Cfg.Other.QQBotdau) setTimeout(() => this.Task(), 10000)
  }

  async DAURef() {
    if (Cfg.Other.QQBotdau) {
      await this.Task()
      await this.e.reply("刷新成功")
    } else await this.e.reply("暂未开启DAU统计")
  }

  async DAUStat() {
    const pro = this.e.msg.includes('pro')
    const uin = this.e.msg.replace(/^#?([Qq]+[Bb]ot[Dd][Aa][Uu](pro|)|[Dd][Aa][Uu](pro|))/, '').trim() || this.e.bot.uin || this.e.self_id
    const dau = lain.DAU[uin]
    if (!dau) return false
    const msg = [
      dau.time,
      `上行消息量: ${dau.msg_count}`,
      `下行消息量: ${dau.send_count}`,
      `上行消息人数: ${dau.user_count}`,
      `上行消息群数: ${dau.group_count}`
    ]
    const path = join(process.cwd(), 'data', 'QQBotDAU', uin)
    const today = moment().format('YYYY-MM-DD')
    const yearMonth = moment(today).format('YYYY-MM')
    // 昨日DAU
    try {
      let data = JSON.parse(fs.readFileSync(join(path, `${yearMonth}.json`), 'utf8'))
      data = data[data.length - 2]
      msg.push(...[
        '',
        data.time,
        `上行消息量: ${data.msg_count}`,
        `下行消息量: ${data.send_count}`,
        `上行消息人数: ${data.user_count}`,
        `上行消息群数: ${data.group_count}`
      ])
    } catch (error) { }

    let totalDAU = {
      user_count: 0,
      group_count: 0,
      msg_count: 0,
      send_count: 0
    }
    let day_count = 0
    try {
      let days30 = [yearMonth, moment(yearMonth).subtract(1, 'months').format('YYYY-MM')]
      let dayDau = _.map(days30, v => {
        let file = join(path, `${v}.json`)
        return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')).reverse() : []
      })
      dayDau = _.take(_.flatten(dayDau), 30)
      day_count = dayDau.length
      _.each(totalDAU, (v, k) => {
        totalDAU[k] = _.floor(_.meanBy(dayDau, k))
      })
    } catch (error) { }
    msg.push(...[
      '',
      `最近${numToChinese[day_count] || day_count}天平均DAU`,
      `上行消息量: ${totalDAU.msg_count}`,
      `下行消息量: ${totalDAU.send_count}`,
      `上行消息人数: ${totalDAU.user_count}`,
      `上行消息群数: ${totalDAU.group_count}`
    ])

    if (pro) {
      if (!fs.existsSync(path)) return false
      let daus = fs.readdirSync(path)
      if (_.isEmpty(daus)) return false
      let data = _.fromPairs(daus.map(v => [v.replace('.json', ''), JSON.parse(fs.readFileSync(`${path}/${v}`))]))
      // 月度统计
      _.each(data, (v, k) => {
        let coldata = []
        let linedata = []
        _.each(v, day => {
          let user = {
            name: '上行消息人数',
            count: day.user_count,
            time: day.time
          }
          let group = {
            name: '上行消息群数',
            count: day.group_count,
            time: day.time
          }
          let msg = {
            linename: '上行消息量',
            linecount: day.msg_count,
            time: day.time
          }
          let send = {
            linename: '下行消息量',
            linecount: day.send_count,
            time: day.time
          }
          coldata.push(user, group)
          linedata.push(msg, send)
        })
        data[k] = [linedata, coldata]
      })

      totalDAU.days = numToChinese[day_count] || day_count
      let renderdata = {
        daus: JSON.stringify(data),
        totalDAU,
        todayDAU: dau,
        monthly: _.keys(data).reverse(),
        nickname: Bot[uin].nickname,
        avatar: Bot[uin].avatar,
        tplFile: `${process.cwd()}/plugins/Lain-plugin/resources/DAU/index.html`,
        pluResPath: `${process.cwd()}/plugins/Lain-plugin/resources/DAU`,
        _res_Path: `${process.cwd()}/plugins/genshin/resources/`
      }
      let img = await puppeteer.screenshot('DAU', renderdata)
      if (img) this.reply(img)
      return true
    }
    this.reply(msg.join('\n'), true)
  }

  async getDAU() {
    const uin = this.e.bot.uin || this.e.self_id
    const time = this.getNowDate()
    const msg_count = (await redis.get(`QQBotDAU:msg_count:${uin}`)) || 0
    const send_count = (await redis.get(`QQBotDAU:send_count:${uin}`)) || 0
    let data = await redis.get(`QQBotDAU:${uin}`)
    if (data) {
      data = JSON.parse(data)
      data.msg_count = Number(msg_count)
      data.send_count = Number(send_count)
      data.time = time
      return data
    } else {
      return {
        user_count: 0, // 上行消息人数
        group_count: 0, // 上行消息群数
        msg_count, // 上行消息量
        send_count, // 下行消息量
        user_cache: {},
        group_cache: {},
        time
      }
    }
  }

  getNowDate() {
    const date = new Date()
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
    const [{ value: month }, , { value: day }, , { value: year }] = dtf.formatToParts(date)
    return `${year}-${month}-${day}`
  }

  async Task() {
    const yearMonth = moment().format('YYYY-MM')
    /** 根目录路径 */
    const path = process.cwd() + '/data/QQBotDAU'
    /** 根目录不存在则创建 */
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    for (const key in lain.DAU) {
      try {
        /** 跳过小于今天的 格式：2024-02-08 */
        const time = this.getNowDate()
        // if (lain.DAU[key].time < time) continue

        /** 继续检测文件夹 */
        if (!fs.existsSync(path + `/${key}`)) fs.mkdirSync(path + `/${key}`)
        /** 删除掉多余的键值 */
        delete lain.DAU[key].user_cache
        delete lain.DAU[key].group_cache
        /** json文件路径 */
        let filePath = path + `/${key}/${yearMonth}.json`
        /** 存在则解析，不存在则赋值为空数组 */
        const file = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : []
        let index = file.findIndex(v => v.time === lain.DAU[key].time)
        if (index != -1) file[index] = lain.DAU[key]
        else file.push(lain.DAU[key])
        /** 写入 */
        fs.writeFile(filePath, JSON.stringify(file, '', '\t'), 'utf-8', () => { })
        delete lain.DAU[key]

        // 刷新redis缓存
        let data = await redis.get(`QQBotDAU:${key}`)
        if (data) {
          data = JSON.parse(data)
          if (data.time < time) {
            await redis.del(`QQBotDAU:msg_count:${key}`)
            await redis.del(`QQBotDAU:send_count:${key}`)
            await redis.del(`QQBotDAU:${key}`)
          }
        }

        logger.warn(`[lain-plugin][${key}] 刷新DAU缓存`)
      } catch (error) {
        logger.error('保存DAU数据出错,key: ' + key, error)
      }
    }
  }
}

// 硬核
const numToChinese = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七',
  8: '八',
  9: '九',
  10: '十',
  11: '十一',
  12: '十二',
  13: '十三',
  14: '十四',
  15: '十五',
  16: '十六',
  17: '十七',
  18: '十八',
  19: '十九',
  20: '二十',
  21: '二十一',
  22: '二十二',
  23: '二十三',
  24: '二十四',
  25: '二十五',
  26: '二十六',
  27: '二十七',
  28: '二十八',
  29: '二十九',
  30: '三十'
}
