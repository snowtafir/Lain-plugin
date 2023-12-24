import fs from 'fs'
import moment from 'moment'
import chokidar from 'chokidar'
import common from '../../model/common.js'

/** 热更文件夹 */
const chokidarList = [
  'example'
]

class Button {
  constructor () {
    this.plugin = './plugins'
    this.botModules = []
    this.initialize()
  }

  /** 加载按钮 */
  async loadModule (filePath) {
    filePath = filePath.replace(/\\/g, '/')
    try {
      let Plugin = (await import(`../../../.${filePath}?${moment().format('x')}`)).default
      Plugin = new Plugin()
      Plugin.plugin._path = filePath
      this.botModules.push(Plugin)
      logger.debug(`按钮模块 ${filePath} 已加载。`)
    } catch (error) {
      logger.error(`导入按钮模块 ${filePath} 时出错：${error.message}`)
    }
  }

  /** 卸载指定文件路径的模块 */
  unloadModule (filePath) {
    const index = this.botModules.findIndex(module => module.plugin._path === filePath)
    if (index !== -1) this.botModules.splice(index, 1)
  }

  /**
   * 处理文件变化事件
   * @param {string} filePath - 文件路径
   * @param {string} eventType - 事件类型 ('add', 'change', 'unlink')
   */
  handleFileChange (filePath, eventType) {
    filePath = filePath.replace(/\\/g, '/')
    if (filePath.endsWith('.js')) {
      if (eventType === 'add') {
        this.unloadModule(filePath)
        this.loadModule(filePath)
        common.mark('Lain-plugin', `[新增按钮插件][${filePath}]`)
      } else if (eventType === 'add' || eventType === 'change') {
        this.unloadModule(filePath)
        this.loadModule(filePath)
        common.mark('Lain-plugin', `[修改按钮插件][${filePath}]`)
      } else if (eventType === 'unlink') {
        this.unloadModule(filePath)
        common.mark('Lain-plugin', `[卸载按钮插件][${filePath}]`)
      }
    }
  }

  /** 初始化 */
  async initialize () {
    /** 热更新 */
    chokidarList.map(folder => {
      const watcher = chokidar.watch(`${this.plugin}/${folder}/lain.support.js`, { ignored: /[\/\\]\./, persistent: true })
      watcher
        .on('add', filePath => this.handleFileChange('./' + filePath, 'add'))
        .on('change', filePath => this.handleFileChange('./' + filePath, 'change'))
        .on('unlink', filePath => this.handleFileChange('./' + filePath, 'unlink'))

      return watcher
    })

    try {
      /** 遍历插件目录 */
      const List = fs.readdirSync(this.plugin)

      /** 遍历每个子文件夹，加载 lain.support.js 模块 */
      for (let folder of List) {
        const folderPath = this.plugin + `/${folder}`

        /** 检查是否为文件夹 */
        if (!fs.lstatSync(folderPath).isDirectory()) continue

        /** 热更新交给监听器去创建 */
        if (chokidarList.includes(folder)) continue

        try {
          const files = fs.readdirSync(folderPath)

          for (let file of files) {
            if (file === 'lain.support.js') {
              await this.loadModule(folderPath + `/${file}`)
            }
          }
        } catch (error) {
          logger.error(`读取插件目录时出错：${error.message}`)
        }
      }

      /** 排序 */
      this.botModules.sort((a, b) => a.plugin.priority - b.plugin.priority)

      return this.botModules
    } catch (error) {
      logger.error(`读取插件目录时出错：${error.message}`)
    }
  }
}

const plugin = new Button()
export default plugin.botModules
