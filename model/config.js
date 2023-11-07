import fs from "fs"
import Yaml from "yaml"
import chalk from "chalk"
import chokidar from "chokidar"
import common from "../model/common.js"
import guild from "../adapter/QQGuild/guild.js"
import WebSocket from "../adapter/WebSocket.js"

const _path = process.cwd() + "/plugins/Lain-plugin/config"

/** 检查配置文件是否存在 */
if (!fs.existsSync(_path + "/config.yaml")) {
    fs.copyFileSync(_path + "/defSet/config.yaml", _path + "/config.yaml")
} else {
    /** 兼容旧配置文件 */
    let cfg = fs.readFileSync(_path + "/config.yaml", "utf8")
    if (!cfg.match(RegExp("port:"))) {
        cfg = cfg + `\n# 端口\nport: 2955`
    }
    if (!cfg.match(RegExp("path:"))) {
        cfg = cfg + `\n# 路径\npath: "/ComWeChat"`
    }
    if (!cfg.match(RegExp("autoFriend:"))) {
        cfg = cfg + `\n# 是否自动同意加好友 1-同意 0-不处理\nautoFriend: 0`
    }
    if (!cfg.match(RegExp("name:"))) {
        cfg = cfg + `\n# 自定义椰奶状态名称\nname: ""`
    }
    if (!cfg.match(RegExp("stdin_nickname:"))) {
        cfg = cfg + `\n\n# 标准输入的昵称\nstdin_nickname: "标准输入"`
    }
    if (!cfg.match(RegExp("YenaiState:"))) {
        cfg = cfg + `\n\n# 椰奶状态显示 0:只显示触发适配器 1:显示全部 2:单显示频道 3:单显示PC微信 4:单显示网页微信 5:单显示shamrock 6:单显示标准输入\n# 修改后需要重启才可以重新加载资源\nYenaiState: 1`
    }
    if (!cfg.match(RegExp("baseUrl:"))) {
        cfg = cfg + `\n\n# shamrock主动http端口，例如http://localhost:5700。若填写将通过此端口进行文件上传等被动ws不支持的操作\nbaseUrl:`
    }
    if (!cfg.match(RegExp("token:"))) {
        cfg = cfg + `\n\n# 鉴权token，如果开放公网强烈建议配置\ntoken:`
    }
    fs.writeFileSync(_path + "/config.yaml", cfg, "utf8")
}

/** 生成默认配置文件 */
if (!fs.existsSync(_path + "/bot.yaml")) {
    fs.writeFileSync(_path + "/bot.yaml", `# 机器人配置 请不要删除default！这是兼容旧配置的！\ndefault: {}`, "utf8")
}

const cfg = Yaml.parse(fs.readFileSync(_path + "/config.yaml", "utf8"))
const YZ = JSON.parse(fs.readFileSync("./package.json", "utf-8"))
const packageCfg = JSON.parse(fs.readFileSync("./plugins/Lain-plugin/package.json", "utf-8"))

Bot.lain = {
    /** 云崽信息 */
    ...packageCfg,
    name: YZ.name === "miao-yunzai" ? "Miao-Yunzai" : "Yunzai-Bot",
    ver: YZ.version,
    /** 插件信息 */
    guild: {
        name: packageCfg.name,
        ver: packageCfg.adapter.qg,
        guild_ver: packageCfg.dependencies["qq-guild-bot"].replace("^", "")
    },
    /** 基本配置 */
    cfg: cfg,
    /** 配置文件夹路径 */
    _path: _path,
    /** 全部频道列表 */
    guilds: {},
}

/** 检查配置文件是否存在 */
if (fs.existsSync(_path + "/bot.yaml")) {
    const bot = Yaml.parse(fs.readFileSync(_path + "/bot.yaml", "utf8"))
    for (const i in bot) {
        if (i === "default") break
        try {
            const qg = new guild(bot[i])
            await qg.monitor()
        } catch (err) {
            logger.error(err)
        }
    }
}

/** 热重载~ */
try {
    const filePath = _path + "/config.yaml"
    if (fs.existsSync(filePath)) {
        const watcher = chokidar.watch(filePath)

        watcher.on("change", async () => {
            await common.sleep(1500)
            Bot.lain.cfg = Yaml.parse(fs.readFileSync(filePath, "utf8"))
            logger.mark("[Lain-plugin][配置文件修改] 成功重载")
        })

        watcher.on("error", (error) => {
            logger.error(`[Lain-plugin]发生错误: ${error}`)
            watcher.close()
        })
    } else {
        logger.error(`[Lain-plugin]文件 ${filePath} 不存在`)
    }
} catch (err) {
    logger.error(err)
}

await (new WebSocket()).server()

logger.info(chalk.hex("#868ECC")(`Lain-plugin插件${Bot.lain.version}全部初始化完成~`))
logger.info(chalk.hex("#868ECC")("https://gitee.com/Zyy955/Lain-plugin"))