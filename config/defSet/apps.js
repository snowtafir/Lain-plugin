import fs from "node:fs"
import { Client } from "icqq"
import { createRequire } from "module"
import cfg from "./lib/config/config.js"
import setLog from "./lib/config/log.js"
import redisInit from "./lib/config/redis.js"
import { checkRun } from "./lib/config/check.js"
import { Restart } from "./plugins/other/restart.js"
import ListenerLoader from "./lib/listener/loader.js"

const require = createRequire(import.meta.url)
const { exec } = require('child_process')

/** 设置标题 */
process.title = 'Miao-Yunzai'

async function UpdateTitle() {
    // 添加一些多余的标题内容
    let title = 'Miao-Yunzai'
    /** 设置标题 */
    process.title = title
}

/** 设置时区 */
process.env.TZ = 'Asia/Shanghai'

/** 捕获未处理的Promise错误 */
process.on('unhandledRejection', (error, promise) => {
    let err = error
    if (logger) {
        logger.error(err)
    } else {
        console.log(err)
    }
})

/** 退出事件 */
process.on('exit', async (code) => {
    if (typeof redis != 'undefined' && typeof test == 'undefined') {
        await redis.save()
    }
})

await checkInit()

/** 初始化事件 */
async function checkInit() {
    /** 检查node_modules */
    if (!fs.existsSync('./node_modules') || !fs.existsSync('./node_modules/icqq')) {
        console.log('请先运行命令：pnpm install -P 安装依赖')
        process.exit()
    }

    /** 日志设置 */
    setLog()

    logger.mark('Miao-Yunzai 启动中...')

    await redisInit()

    await checkRun()

    //** 更新标题 */
    await UpdateTitle()

    Restart.prototype.restart = async function () {
        await this.e.reply('开始执行重启，请稍等...')
        logger.mark(`${this.e.logFnc} 开始执行重启，请稍等...`)

        let data = JSON.stringify({
            isGroup: !!this.e.isGroup,
            id: this.e.isGroup ? this.e.group_id : this.e.user_id,
            time: new Date().getTime()
        })

        let npm = await this.checkPnpm()

        try {
            await redis.set(this.key, data, { EX: 120 })
            let cm = `${npm} pm2 start --name "Miao-Yunzai" ./apps.js --max-memory-restart "512M" --restart-delay "60000"`
            if (process.argv[1].includes('pm2')) {
                cm = `${npm} pm2 restart "Miao-Yunzai"`
            }

            exec(cm, { windowsHide: true }, (error, stdout, stderr) => {
                if (error) {
                    redis.del(this.key)
                    this.e.reply(`操作失败！\n${error.stack}`)
                    logger.error(`重启失败\n${error.stack}`)
                } else if (stdout) {
                    logger.mark('重启成功，运行已由前台转为后台')
                    logger.mark(`查看日志请用命令：${npm} run log`)
                    logger.mark(`停止后台运行命令：${npm} stop`)
                    process.exit()
                }
            })
        } catch (error) {
            redis.del(this.key)
            let e = error.stack ?? error
            this.e.reply(`操作失败！\n${e}`)
        }

        return true

    }
}

export default class Yunzai extends Client {
    // eslint-disable-next-line no-useless-constructor
    constructor(conf) {
        super(conf)
    }

    /** 登录机器人 */
    static async run() {
        const bot = new Yunzai(cfg.bot)
        /** 加载icqq事件监听 */
        await ListenerLoader.load(bot)
        /** 造个假~! */
        bot.uin = "88888"
        return bot
    }
}

/** 全局变量 bot */
global.Bot = await Yunzai.run()

/** 加载插件... */
await ((await import('./lib/plugins/loader.js')).default).load()