import fs from 'fs'
import Cfg from '../lib/config/config.js'

export class LainTask extends plugin {
  constructor () {
    super({
      name: 'Lain-定时任务',
      priority: 0,
      rule: [
        {
          reg: /^#?清理缓存$/,
          fnc: 'TaskFile'
        }
      ]
    })

    /** 定时任务 */
    this.task = []
    for (let i of Array.isArray(Cfg.Other.DelFileCron) ? Cfg.Other.DelFileCron : [Cfg.Other.DelFileCron]) {
      this.task.push({
        /** 任务cron表达式 */
        cron: i,
        name: '<Lain-plugin> 清除临时文件',
        /** 任务方法名 */
        fnc: () => this.TaskFile()
      })
    }
  }

  TaskFile (e) {
    try {
      logger.mark('<Lain-plugin> <定时任务> 开始清理缓存文件')
      const _path = {
        './temp/FileToUrl': () => true,
        './resources/temp': (i) => i.endsWith('.silk'),
        './data/stdin': () => true
      }
      for (const i of Object.keys(_path)) {
        const files = fs.readdirSync(i)
        files.forEach(file => _path[i](file) && fs.promises.unlink(i + `/${file}`))
      }
      logger.mark('<Lain-plugin> <定时任务> 清理缓存文件完成~')
      if (e?.reply) e.reply("清理缓存文件完成~")
    } catch (error) {
      logger.error('<Lain-plugin> <定时任务> 清理缓存文件发送错误：', error.message)
    }
  }
}
