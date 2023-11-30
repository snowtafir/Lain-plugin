import crypto from "crypto"
import yaml from "../model/yaml.js"

/** 设置主人 */
let sign = {}

export class LainMaster extends plugin {
    constructor() {
        super({
            name: "铃音-设置主人",
            priority: -50,
            rule: [
                {
                    reg: /^#设置主人$/,
                    fnc: 'master'
                },
                {
                    reg: /^#(删除|取消)主人$/,
                    fnc: "del_master",
                    permission: "master"
                }
            ]
        })
    }

    async master(e) {
        let user_id = e.user_id
        if (e.at) {
            const cfg = new yaml("./config/config/other.yaml")
            /** 存在at检测触发用户是否为主人 */
            if (!e.isMaster) return e.reply(`只有主人才能命令我哦~\n(*/ω＼*)`)
            user_id = e.at
            /** 检测用户是否已经是主人 */
            if (cfg.value("masterQQ", user_id)) return e.reply([segment.at(user_id), "已经是主人了哦(〃'▽'〃)"])
            /** 添加主人 */
            return await e.reply(this.addmaster(e, user_id))
        } else {
            /** 检测用户是否已经是主人 */
            if (e.isMaster) return e.reply([segment.at(e.user_id), "已经是主人了哦(〃'▽'〃)"])
        }
        /** 生成验证码 */
        sign[user_id] = crypto.randomUUID()
        logger.mark(`设置主人验证码：${logger.green(sign[e.user_id])}`)
        await e.reply([segment.at(e.user_id), `请输入控制台的验证码`])
        /** 开始上下文 */
        return await this.setContext('SetAdmin')
    }

    async del_master(e) {
        if (!e.at) return e.reply("你都没有告诉我是谁！快@他吧！^_^")
        const cfg = new yaml("./config/config/other.yaml")
        if (!cfg.value("masterQQ", e.at)) {
            return e.reply("这个人不是主人啦(〃'▽'〃)", false, { at: true })
        }
        cfg.delVal("masterQQ", e.at)
        return await e.reply([segment.at(e.at), "拜拜~"])
    }

    SetAdmin() {
        /** 结束上下文 */
        this.finish('SetAdmin')
        /** 判断验证码是否正确 */
        if (this.e.msg.trim() === sign[this.e.user_id]) {
            this.e.reply(this.addmaster(this.e))
        } else {
            return this.reply([segment.at(this.e.user_id), "验证码错误"])
        }
    }

    /** 设置主人 */
    addmaster(e, user_id = null) {
        user_id = user_id || e.user_id
        const cfg = new yaml("./config/config/other.yaml")
        cfg.addVal("masterQQ", user_id)
        return [segment.at(user_id), "新主人好~(*/ω＼*)"]
    }
}

