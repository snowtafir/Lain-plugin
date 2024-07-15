import fs from 'fs'
import Cfg from '../lib/config/config.js'

export class LainTask extends plugin {
  constructor () {
    super({
      name: 'Lain-定时任务',
      priority: 0,
      rule: []
    })

    /** 定时任务 */
    this.task = []
    for (let i of Array.isArray(Cfg.Other.DelFileCron) ? Cfg.Other.DelFileCron : [Cfg.Other.DelFileCron]) {
      this.task.push({
        /** 任务cron表达式 */
        cron: i,
        name: '清除临时文件',
        /** 任务方法名 */
        fnc: () => this.TaskFile()
      })
    }
  }

  TaskFile () {
    try {
      logger.mark('[定时任务] 开始清理缓存文件')
      const _path = './temp/FileToUrl'
      const files = fs.readdirSync(_path)
      files.forEach(file => fs.promises.unlink(_path + `/${file}`))
      logger.mark('[定时任务] 清理缓存文件完成~')
    } catch (error) {
      logger.error('[定时任务] 清理缓存文件发送错误：', error.message)
    }
  }
}
