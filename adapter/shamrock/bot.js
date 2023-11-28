import fs from "fs"
import path from "path"
import common from "../../model/common.js"
import api from "./api.js"
import { init } from "../../index.js"
import { message, toRaw } from "./message.js"

/** 加载资源状态 */
let resList = false

export default class bot {
    constructor(id) {
        /** 机器人QQ号 */
        this.id = Number(id)
        this.loadRes()
    }

    /** 加载资源 */
    async loadRes() {
        const bot = Bot.shamrock.get(String(this.id))
        /** 构建基本参数 */
        Bot[this.id] = {
            bkn: 0,
            fl: new Map(),
            gl: new Map(),
            gml: new Map(),
            adapter: "Shamrock",
            uin: Number(this.id),
            tiny_id: String(this.id),
            avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${Number(this.id)}`,
            stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
            apk: { display: bot["qq-ver"].split(" ")[0], version: bot["qq-ver"].split(" ")[1] },
            version: { id: "QQ", name: "Shamrock", version: bot["user-agent"].replace("Shamrock/", "") },
            pickMember: (group_id, user_id) => this.pickMember(group_id, user_id),
            pickUser: (user_id) => this.pickUser(Number(user_id)),
            pickFriend: (user_id) => this.pickFriend(Number(user_id)),
            pickGroup: (group_id) => this.pickGroup(Number(group_id)),
            setEssenceMessage: async (msg_id) => await this.setEssenceMessage(msg_id),
            sendPrivateMsg: async (user_id, msg) => await this.sendMsg(Number(user_id), msg, false),
            getGroupMemberInfo: async (group_id, user_id) => await this.getGroupMemberInfo(Number(group_id), Number(user_id)),
            removeEssenceMessage: async (msg_id) => await this.removeEssenceMessage(msg_id),
            makeForwardMsg: async (message) => await common.makeForwardMsg(message, true),
            getMsg: (msg_id) => "",
            quit: () => this.quit()
        }

        /** 重启 */
        await init("Lain:restart:shamrock")

        /** 加载好友、群列表 */
        this.LoadList()
    }

    async LoadList() {
        if (resList) return "目前以有任务事件在加载中，请勿重复加载"
        resList = true
        if (!Bot.adapter.includes(Number(this.id))) Bot.adapter.push(Number(this.id))

        /** 获取bot自身信息 */
        const info = await api.get_login_info(this.id)
        Bot[this.id].nickname = info?.nickname || ""

        /** 获取群聊列表啦~ */
        let group_list
        for (let retries = 0; retries < 5; retries++) {
            group_list = await api.get_group_list(this.id)
            if (!(group_list && Array.isArray(group_list))) {
                await common.log(this.id, `Shamrock群列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 群列表获取失败 */
        if (!group_list || !typeof group_list === "object") {
            await common.log(this.id, `Shamrock群列表获取失败次数过多，已停止重试`, "error")
        }

        if (group_list && typeof group_list === "object") {
            group_list.forEach(async i => {
                /** 延迟一下 */
                await common.sleep(50)
                /** 给锅巴用 */
                Bot.gl.set(i.group_id, i)
                /** 自身参数 */
                Bot[this.id].gl.set(i.group_id, i)
            })
        }

        /** 好友列表 */
        let friend_list
        for (let retries = 0; retries < 5; retries++) {
            friend_list = await api.get_friend_list(this.id)
            if (!(friend_list && Array.isArray(friend_list))) {
                await common.log(this.id, `Shamrock好友列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 好友列表获取失败 */
        if (!friend_list || !typeof friend_list === "object") {
            await common.log(this.id, `Shamrock好友列表获取失败次数过多，已停止重试`, "error")
        }

        if (friend_list && typeof friend_list === "object") {
            friend_list.forEach(async i => {
                /** 延迟一下 */
                await common.sleep(50)
                /** 给锅巴用 */
                Bot.fl.set(i.user_id, i)
                /** 自身参数 */
                Bot[this.id].fl.set(i.user_id, i)
            })
        }

        group_list.forEach(async i => {
            /** 获取群成员，缓存到gml中 */
            try {
                let gml = {}
                let member_list = await api.get_group_member_list(this.id, i.group_id)
                member_list.forEach(async user => {
                    /** 延迟一下 */
                    await common.sleep(50)
                    user.card = user.nickname
                    gml[user.user_id] = user

                })
                Bot[this.id].gml.set(i.group_id, gml)
            } catch (error) { }
        })

        // let { token } = await api.get_csrf_token(uin, "qun.qq.com")
        try {
            let { cookies } = await api.get_cookies(this.id)
            if (cookies) {
                let match = cookies.match(/skey=([^;]+)/)
                if (match) {
                    let skey = match[1]
                    let n = 5381
                    for (let e = skey || '', r = 0, o = e.length; r < o; ++r) {
                        n += (n << 5) + e.charAt(r).charCodeAt(0)
                    }
                    Bot[this.id].bkn = 2147483647 & n
                }
            }
        } catch (err) {
            await common.log(this.id, `Shamrock获取bkn失败。`, "warn")
        }


        Bot[this.id].cookies = {}
        let domains = ["aq.qq.com", "buluo.qq.com", "connect.qq.com", "docs.qq.com", "game.qq.com", "gamecenter.qq.com", "haoma.qq.com", "id.qq.com", "kg.qq.com", "mail.qq.com", "mma.qq.com", "office.qq.com", "openmobile.qq.com", "qqweb.qq.com", "qun.qq.com", "qzone.qq.com", "ti.qq.com", "v.qq.com", "vip.qq.com", "y.qq.com", ""]
        for (let domain of domains) {
            api.get_cookies(this.id, domain).then(ck => {
                ck = ck?.cookies
                if (ck) {
                    try {
                        // 适配椰奶逆天的ck转JSON方法
                        ck = ck.trim().replace(/\w+=;/g, '').replace(/\w+=$/g, '')
                    } catch (err) { }
                }
                Bot[this.id].cookies[domain] = ck
            }).catch(error => {
                common.log(this.id, `${domain} 获取cookie失败：${error}`, "debug")
            })
        }

        const log = `Shamrock加载资源成功：加载了${Bot[this.id].fl.size}个好友，${Bot[this.id].gl.size}个群。`
        await common.log(this.id, log)
        resList = false
        return log
    }

    /** 群对象 */
    pickGroup(group_id) {
        const is_admin = Bot[this.id].gml.get(group_id)?.[this.id]?.role === "admin" ? true : false
        const is_owner = Bot[this.id].gml.get(group_id)?.[this.id]?.role === "owner" ? true : false
        return {
            is_admin,
            is_owner,
            sendMsg: async (msg) => await this.sendMsg(group_id, msg, true),
            recallMsg: async (msg_id) => await this.recallMsg(msg_id),
            makeForwardMsg: async (message) => await this.makeForwardMsg(message),
            /** 禁言 */
            muteMember: async (user_id, time) => await api.set_group_ban(this.id, group_id, Number(user_id), Number(time)),
            /** 设置群名称 */
            setName: async (name) => await api.set_group_name(this.id, group_id, name),
            /** 退群 */
            quit: async () => await api.set_group_leave(this.id, group_id),
            /** 设置管理 */
            setAdmin: async (qq, type) => await api.set_group_admin(this.id, group_id, qq, type),
            /** 踢 */
            kickMember: async (qq, reject_add_request = false) => await api.set_group_kick(this.id, group_id, qq, reject_add_request),
            /** 头衔 **/
            setTitle: async (qq, title, duration) => await api.set_group_special_title(this.id, group_id, qq, title),
            /** 修改群名片 **/
            setCard: async (qq, card) => await api.set_group_card(this.id, group_id, qq, card),
            pickMember: (id) => this.pickMember(group_id, id),
            /** 获取群成员列表 */
            getMemberMap: async () => {
                let group_Member = Bot[this.id].gml.get(group_id)
                if (group_Member && Object.keys(group_Member) > 0) return group_Member
                group_Member = new Map()
                let member_list = await api.get_group_member_list(this.id, group_id)
                member_list.forEach(user => {
                    group_Member.set(user.user_id, user)
                })
                return group_Member
            },
            /**
             * 获取聊天历史记录
             * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
             * @param num 数量
             * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
             * @return {Promise<Awaited<unknown>[]>}
             */
            getChatHistory: async (msg_id, num, reply) => {
                let { messages } = await api.get_group_msg_history(this.id, group_id, num, msg_id)
                let group = Bot[this.id].gl.get(group_id)
                messages = messages.map(async m => {
                    m.group_name = group?.group_name || group_id
                    m.atme = !!m.message.find(msg => msg.type === "at" && msg.data?.qq == this.id)
                    m.raw_message = toRaw(m.message, this.id, group_id)
                    let result = await message(this.id, m.message, group_id, reply)
                    m = Object.assign(m, result)
                    return m
                })
                return Promise.all(messages)
            },
            setEssenceMessage: async (msg_id) => {
                let res = await api.set_essence_msg(this.id, msg_id)
                return res?.message === '成功' ? "加精成功" : res?.message
            },
            /** 移除群精华消息 **/
            removeEssenceMessage: async (msg_id) => {
                let res = await api.delete_essence_msg(this.id, msg_id)
                return res?.message === '成功' ? "加精成功" : res?.message
            },
            sendFile: async (filePath) => {
                if (!fs.existsSync(filePath)) return true
                /** 先传到shamrock... */
                const base64 = "base64://" + fs.readFileSync(filePath).toString("base64")
                const { file } = await api.download_file(this.id, base64)
                let name = path.extname(filePath)
                return await api.upload_group_file(this.id, group_id, file, name.replace(/^\./, ""))
            },
            getMemberMap: async () => await api.get_prohibited_member_list(this.id, group_id)
        }
    }

    pickUser(user_id) {
        return {
            sendMsg: async (msg) => await this.sendMsg(user_id, msg, false),
            recallMsg: async (msg_id) => await this.recallMsg(msg_id),
            makeForwardMsg: async (message) => await this.makeForwardMsg(message),
            /**
             * 获取私聊聊天记录
             * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
             * @param num 数量
             * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
             * @return {Promise<Awaited<unknown>[]>}
             */
            getChatHistory: async (msg_id, num, reply) => {
                let { messages } = await api.get_history_msg(this.id, "private", user_id, null, num, msg_id)
                messages = messages.map(async m => {
                    m.raw_message = toRaw(m.message, this.id)
                    let result = await message(this.id, m.message, null, reply)
                    m = Object.assign(m, result)
                    return m
                })
                return Promise.all(messages)
            }
        }
    }

    pickFriend(user_id) {
        return {
            sendMsg: async (msg) => await this.sendMsg(user_id, msg, false),
            recallMsg: async (msg_id) => await this.recallMsg(msg_id),
            makeForwardMsg: async (message) => await this.makeForwardMsg(message),
            /**
             * 获取私聊聊天记录
             * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
             * @param num 数量
             * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
             * @return {Promise<Awaited<unknown>[]>}
             */
            getChatHistory: async (msg_id, num, reply) => {
                let { messages } = await api.get_history_msg(this.id, "private", user_id, null, num, msg_id)
                messages = messages.map(async m => {
                    m.raw_message = toRaw(m.message, this.id)
                    let result = await message(this.id, m.message, null, reply)
                    m = Object.assign(m, result)
                    return m
                })
                return Promise.all(messages)
            },
        }
    }

    pickMember(group_id, user_id) {
        /** 取缓存！！！别问为什么，因为傻鸟同步 */
        let member = Bot[this.id].gml.get(group_id)?.[user_id]
        try {
            member.info = { ...member }
        } catch {
            member.info = {}
        }
        return member
    }

    /** 设置精华 */
    async setEssenceMessage(msg_id) {
        let res = await api.set_essence_msg(this.id, msg_id)
        return res?.message === '成功' ? "加精成功" : res?.message
    }

    /** 移除群精华消息 **/
    async removeEssenceMessage(msg_id) {
        let res = await api.delete_essence_msg(this.id, msg_id)
        return res?.message === '成功' ? "加精成功" : res?.message
    }

    async getGroupMemberInfo(group_id, user_id) {
        /** 被自己坑了 */
        if (user_id == "88888" || user_id == "stdin") user_id = Number(this.id)
        try {
            let member = await api.get_group_member_info(this.id, group_id, user_id)
            member.card = member.nickname
            return member
        } catch {
            return { card: "shamrock", nickname: "shamrock" }
        }
    }

    /** 退群 */
    async quit() {
        return await api.set_group_leave(this.id, groupID)
    }

    /**
     * 发送消息
     * @param {number} id - 发送到的目标群号或QQ
     * @param {string|Array|object} msg - 消息内容
     * @param {boolean} isGroup 是否为群消息，默认是
     */
    async sendMsg(id, msg, isGroup = true) {
        const SendMsg = (await import("./sendMsg.js")).default
        return await (new SendMsg(this.id, isGroup)).message(msg, id)
    }

    /** 制作转发消息 */
    async makeForwardMsg(message) {
        return await common.makeForwardMsg(message, true)
    }

    /** 撤回消息 */
    async recallMsg(msg_id) {
        return await api.delete_msg(this.id, msg_id)
    }
}
