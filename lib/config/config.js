import Yaml from 'yaml'
import fs from 'node:fs'
import chokidar from 'chokidar'
import YamlHandler from '../../model/YamlHandler.js'

/** 配置文件 */
class Cfg {
  constructor () {
    this._path = './plugins/Lain-plugin/config/'
    this.config = {}

    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} }

    this.initCfg()
    this.delFile()
  }

  /** 初始化配置 */
  initCfg () {
    this.path = this._path + 'config/'
    if (!fs.existsSync(this.path)) {
      fs.mkdirSync(this.path)
    }
    this.pathDef = this._path + 'defSet/'
    const files = fs.readdirSync(this.pathDef).filter(file => file.endsWith('.yaml'))
    for (let file of files) {
      if (!fs.existsSync(`${this.path}${file}`)) {
        fs.copyFileSync(`${this.pathDef}${file}`, `${this.path}${file}`)
      }
    }
    this.lodCfg()
    if (!fs.existsSync('./temp/FileToUrl')) fs.mkdirSync('./temp/FileToUrl')
  }

  /** 旧版本配置迁移 */
  async lodCfg () {
    const QQBot = this._path + 'QQBot.yaml'
    const bot = this._path + 'bot.yaml'
    let state = false
    if (fs.existsSync(QQBot)) {
      state = true
      const config = new YamlHandler(this.path + 'Token.yaml')
      const QQBotCfg = Object.values(Yaml.parse(fs.readFileSync(QQBot, 'utf8')))
      for (const i of QQBotCfg) {
        if (!i?.appid) continue
        let val = {
          model: 2,
          appid: i.appid,
          token: i.token,
          sandbox: i.sandbox,
          allMsg: i.allMsg,
          removeAt: i.removeAt,
          secret: i.secret,
          markdown: {
            id: i.markdown || '',
            type: i.markdown ? 1 : 0,
            text: 'text_start',
            img_dec: 'img_dec',
            img_url: 'img_url'
          },
          other: {
            Prefix: true,
            QQCloud: '',
            Tips: false,
            'Tips-GroupId': ''
          }
        }
        config.addVal('QQ_Token', { [i.appid]: val }, 'object')
        await lain.sleep(2000)
      }
      fs.renameSync(QQBot, this._path + 'QQBot.yaml-old')
    }

    if (fs.existsSync(bot)) {
      state = true
      const config = new YamlHandler(this.path + 'Token.yaml')
      const botCfg = Object.values(Yaml.parse(fs.readFileSync(bot, 'utf8')))
      for (const i of botCfg) {
        if (!i?.appID) continue
        if (config.value('QQ_Token', i.appID)) {
          config.set(`QQ_Token.${i.appID}.model`, 0)
          await lain.sleep(2000)
        } else {
          let val = {
            model: 2,
            appid: i.appID,
            token: i.token,
            sandbox: i.sandbox,
            allMsg: i.allMsg,
            removeAt: '',
            secret: '',
            markdown: {
              id: '',
              type: 0,
              text: 'text_start',
              img_dec: 'img_dec',
              img_url: 'img_url'
            },
            other: {
              Prefix: true,
              QQCloud: '',
              Tips: false,
              'Tips-GroupId': ''
            }
          }
          config.addVal('QQ_Token', { [i.appID]: val }, 'object')
          await lain.sleep(2000)
        }
      }
      fs.renameSync(bot, this._path + 'bot.yaml-old')
    }
    if (state) logger.warn('[Lain-plugin] 旧版本配置迁移完毕，请重启生效')
  }

  /** QQ频道配置 */
  getQQGuild (guild_id = '') {
    let defSet = this.getdefSet('Config-Guild')
    let config = this.getConfig('Config-Guild')
    return { ...defSet.default, ...config.default, ...config[guild_id] }
  }

  /** QQ群、频道机器人token配置 */
  getToken (type, appid = 'all') {
    let defSet = this.getdefSet('Token')
    let config = this.getConfig('Token')
    if (config?.[type]?.[appid]) {
      return { ...defSet.default, ...config.default, ...config[type][appid] }
    }
    return config?.[type] ?? {}
  }

  /** HTTP服务器配置 */
  get Server () {
    return this.getDefOrConfig('Config-Server')
  }

  /** HTTP服务器端口 */
  get port () {
    return Number(this.Server.port)
  }

  /** link替换白名单配置 */
  get WhiteLink () {
    return this.Other.WhiteLink
  }

  /** 适配器配置 */
  get Adapter () {
    return this.getDefOrConfig('Config-Adapter')
  }

  /** 标准输入 */
  get Stdin () {
    return this.Adapter.Stdin
  }

  /** ComWeChat */
  get ComWeChat () {
    return this.Adapter.ComWeChat
  }

  /** WeXin */
  get WeXin () {
    return this.Adapter.WeXin
  }

  /** QQ频道基本配置 */
  get GuildCfg () {
    return this.getDefOrConfig('Config-Guild')
  }

  /** 三叶草配置 */
  get Shamrock () {
    return this.Adapter.Shamrock
  }

  /** 其他配置 */
  get Other () {
    return this.getDefOrConfig('Config-Other')
  }

  /** toICQQ */
  get toICQQ () {
    return this.Other.ICQQtoFile
  }

  /** 本体package.json */
  get YZPackage () {
    if (this._YZPackage) return this._YZPackage

    this._YZPackage = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
    return this._YZPackage
  }

  /** package.json */
  get package () {
    if (this._package) return this._package

    this._package = JSON.parse(fs.readFileSync(this._path + '../package.json', 'utf8'))
    return this._package
  }

  /** 默认配置和用户配置 */
  getDefOrConfig (name) {
    let defSet = this.getdefSet(name)
    let config = this.getConfig(name)
    return { ...defSet, ...config }
  }

  /**
   *.获取默认配置
   * @param name 配置文件名称
   */
  getdefSet (name) {
    return this.getYaml('defSet', name)
  }

  /** 用户配置 */
  getConfig (name) {
    return this.getYaml('config', name)
  }

  /**
   * 获取配置yaml
   * @param type 默认跑配置-defSet，用户配置-config
   * @param name 名称
   */
  getYaml (type, name) {
    let file = `${this._path}/${type}/${name}.yaml`
    let key = `${type}.${name}`
    if (this.config[key]) return this.config[key]

    this.config[key] = Yaml.parse(
      fs.readFileSync(file, 'utf8')
    )

    this.watch(file, name, type)

    return this.config[key]
  }

  /** 监听配置文件 */
  watch (file, name, type = 'defSet') {
    let key = `${type}.${name}`

    if (this.watcher[key]) return

    const watcher = chokidar.watch(file)
    watcher.on('change', path => {
      delete this.config[key]
      if (typeof Bot == 'undefined') return
      logger.mark(`[修改配置文件][${type}][${name}]`)
      if (this[`change_${name}`]) {
        this[`change_${name}`]()
      }
    })

    this.watcher[key] = watcher
  }

  /** 更新全局Bot中的配置 */
  change_Token () {
    const CfgList = Object.values(this.getToken('QQ_Token') ?? {})
    if (CfgList.length) {
      for (const i of CfgList) {
        if (typeof Bot[i.appid] !== 'undefined') {
          Bot[i.appid].config = i
        }
        if (typeof Bot[`qg_${i.appid}`] !== 'undefined') {
          Bot[`qg_${i.appid}`].config = i
        }
      }
    }
  }

  /** 删除临时文件 */
  delFile () {
    try {
      const files = fs.readdirSync('./temp/FileToUrl')
      files.map((file) => fs.promises.unlink(`./temp/FileToUrl/${file}`, () => { }))
    } catch { }
  }
}

export default new Cfg()
