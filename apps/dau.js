import fs from 'node:fs'
import { join } from 'node:path'
import moment from 'moment'
import schedule from 'node-schedule'
import Cfg from '../lib/config/config.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import _ from 'lodash'

export class QQBotDAU extends plugin {
  constructor () {
    super({
      name: 'DAU',
      event: 'message',
      priority: 100,
      rule: [
        {
          reg: /^#QQBotDAU(pro)?/i,
          fnc: 'DAUStat'
        }
      ]
    })
    // 每天零点清除DAU统计并保存到文件
    schedule.scheduleJob('0 0 0 * * ?', () => {
      if (Cfg.Other.QQBotdau) this.Task()
    })
  }

  async DAUStat () {
    const pro = this.e.msg.includes('pro')
    const uin = this.e.msg.replace(/^#QQBotDAU(pro)?/i, '').trim() || this.e.self_id
    const dau = lain.DAU[uin]
    if (!dau) return false
    const msg = [
      dau.time,
      `上行消息量: ${dau.msg_count}`,
      `下行消息量: ${dau.send_count}`,
      `上行消息人数: ${dau.user_count}`,
      `上行消息群数: ${dau.group_count}`,
      ''
    ]
    const path = join(process.cwd(), 'data', 'QQBotDAU', uin)
    const today = moment().format('YYYY-MM-DD')
    const yearMonth = moment(today).format('YYYY-MM')
    // 昨日DAU
    try {
      let data = JSON.parse(fs.readFileSync(join(path, `${yearMonth}.json`), 'utf8'))
      data = data.filter(v => moment(v.time).isSame(moment(today).subtract(1, 'days')))[0]
      msg.push(...[
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

  async getDAU () {
    const uin = this.e.self_id
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

  getNowDate () {
    const date = new Date()
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
    const [{ value: month }, , { value: day }, , { value: year }] = dtf.formatToParts(date)
    return `${year}-${month}-${day}`
  }

  Task () {
    const yearMonth = moment().format('YYYY-MM')
    /** 根目录路径 */
    const path = process.cwd() + '/data/QQBotDAU'
    /** 根目录不存在则创建 */
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    for (const key in lain.DAU) {
      try {
        /** 跳过小于今天的 格式：2024-02-08 */
        const time = this.getNowDate()
        if (lain.DAU[key].time >= time) continue

        /** 继续检测文件夹 */
        if (!fs.existsSync(path + `/${key}`)) fs.mkdirSync(path + `/${key}`)
        /** 删除掉多余的键值 */
        delete lain.DAU[key].user_cache
        delete lain.DAU[key].group_cache
        /** json文件路径 */
        let filePath = path + `/${key}/${yearMonth}.json`
        /** 存在则解析，不存在则赋值为空数组 */
        const file = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : []
        file.push(lain.DAU[key])
        /** 写入 */
        fs.writeFile(filePath, JSON.stringify(file, '', '\t'), 'utf-8', () => { })
        delete lain.DAU[key]
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
