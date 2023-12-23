import fs from 'fs'

class Button {
  constructor () {
    this.plugin = './plugins'
    this.botModules = []
  }

  /** 加载按钮 */
  async loadModule (filePath) {
    try {
      const Plugin = (await import('../../../.' + filePath)).default
      this.botModules.push(new Plugin())
      logger.debug(`按钮模块 ${filePath} 已加载。`)
    } catch (error) {
      logger.error(`导入按钮模块 ${filePath} 时出错：${error.message}`)
    }
  }

  /** 初始化 */
  async initialize () {
    try {
      /** 遍历插件目录 */
      const List = fs.readdirSync(this.plugin)

      /** 遍历每个子文件夹，加载 lain.support.js 模块 */
      for (let folder of List) {
        const folderPath = this.plugin + `/${folder}`

        /** 检查是否为文件夹 */
        if (!fs.lstatSync(folderPath).isDirectory()) continue

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
export default await plugin.initialize()
