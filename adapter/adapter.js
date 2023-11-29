import fs from "fs"
import Yaml from "yaml"
import common from "../model/common.js"

/** 适配器列表 */
const adapter = []

/** 加载标准输入 */
adapter.push(async function stdin() {
    const stdin = (await import("./stdin/stdin.js")).default
    await stdin()
    return await common.log("标准输入", `加载完成...您可以在控制台输入指令哦~`)
})

/** 加载QQ频道适配器 */
adapter.push(async function QQGuild() {
    if (!fs.existsSync(Bot.lain._path + "/bot.yaml")) return
    const bot = Yaml.parse(fs.readFileSync(Bot.lain._path + "/bot.yaml", "utf8"))
    for (const i in bot) {
        if (i === "default") break
        try {
            const Guild = (await import("./QQGuild/guild.js")).default
            return await new Guild(bot[i]).monitor()
        } catch (err) {
            return logger.error(err)
        }
    }
})

/** QQBot适配器 */
adapter.push(async function QQBot() {
    try {
        const cfg = fs.readFileSync(Bot.lain._path + "/QQBot.yaml", "utf8")
        Object.entries(Yaml.parse(cfg)).forEach(async ([appid, cfg]) => {
            if (Object.keys(cfg).length === 0) return
            const createAndStartBot = (await import("./QQBot/index.js")).default
            return await createAndStartBot(cfg)
        })
    } catch (err) { return common.log("QQBot", `QQBot适配器加载失败,${err}`, "error") }
})

/** 启动HTTP服务器，加载shamrock、Com微信适配器 */
adapter.push(async function httpServer() {
    const WebSocket = (await import("./WebSocket.js")).default
    return await (new WebSocket()).server()
})

/** 加载适配器 */
for (let i of adapter) {
    try {
        await i()
    } catch (error) {
        common.log("Lain-plugin", error, "error")
    }
}

common.log("", `Lain-plugin插件${Bot.lain.version}全部初始化完成~`)
common.log("", "https://gitee.com/Zyy955/Lain-plugin")