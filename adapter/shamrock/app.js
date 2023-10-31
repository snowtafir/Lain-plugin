import { WebSocketServer } from "ws"
import common from "../../model/common.js"
import { randomUUID } from "crypto"
import SendMsg from "./sendMsg.js"
import api from "./api.js"
import loader from "../../plugins/loader.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"

class Shamrock {
    async server(bot, request) {
        /** 获取机器人uin */
        const uin = request.headers["x-self-id"]

        if (!uin) {
            await common.log("shamrock", "没有提供机器人标识", "error")
            return bot.close()
        }

        /** 保存当前bot */
        Bot.shamrock.set(uin, {
            id: uin,
            socket: bot,
            "qq-ver": request.headers["x-qq-version"],
            "user-agent": request.headers["user-agent"]
        })

        bot.on("message", async (data) => {
            data = JSON.parse(data)
            /** 丢弃带echo的事件 */
            if (data?.echo) return
            const event = {
                /** 产生连接 */
                lifecycle: async () => {
                    await common.log(uin, `建立连接成功，正在加载资源`)
                    return await this.loadRes(uin)
                },
                /** 心跳 */
                heartbeat: async () => {
                    return await common.log(uin, `心跳：${data.status["qq.status"]}`, "debug")
                },
                /** 消息事件 */
                message: async () => {
                    return await loader.deal.call(pluginsLoader, await this.msg(data))
                },
                /** 戳一戳 */
                notice: async () => {
                    switch (data.notice_type) {
                        case "group_recall":
                            if (data.operator_id === data.user_id) {
                                return await common.log(uin, `群消息撤回：[${data.group_id}，${data.user_id}] ${data.message_id}`)
                            } else {
                                return await common.log(uin, `群消息撤回：[${data.group_id}]${data.operator_id} 撤回 ${data.user_id}的消息 ${data.message_id} `)
                            }
                        case "notify":
                            return await loader.deal.call(pluginsLoader, await this.msg(data))

                        default:
                            return
                    }
                }
            }
            try {
                await event[data?.meta_event_type || data?.post_type]()
            } catch (error) {
                logger.error(error)
                logger.mark("未知事件：", data)
            }
        })

        bot.on("close", async () => {
            await common.log(uin, "连接已关闭", "error")
            // Bot.shamrock.delete(uin)
        })
    }

    /** 转换格式给云崽 */
    async msg(data) {
        const { self_id, user_id, group_id, message_type, message_id } = data

        let raw_message = data.raw_message

        /** 判断是否群聊 */
        let isGroup = true

        /** 初始化e */
        let e = data

        /** 添加适配器标识 */
        e.adapter = "shamrock"

        if (data.post_type === "message") {
            /** 处理message，引用消息 */
            const { message, source } = await this.message(self_id, data.message)
            e.message = message
            if (source) e.source = source
        } else if (e.post_type === "notice" && e.sub_type === "poke") {
            e.action = "戳了戳"
            raw_message = `${e.operator_id} 戳了戳 ${e.user_id}`
            /** 私聊字段 */
            if (e?.sender_id) {
                isGroup = false
                e.notice_type = "private"
            } else {
                e.notice_type = "group"
            }
        }

        /** 先打印日志 */
        if (message_type === "private") {
            isGroup = false
            await common.log(self_id, `好友消息：[${user_id}] ${raw_message}`)
        } else {
            await common.log(self_id, `群消息：[${group_id}，${user_id}] ${raw_message}`)
        }

        /** 快速撤回 */
        e.recall = async () => {
            return await api.delete_msg(self_id, message_id)
        }
        /** 快速回复 */
        e.reply = async (msg, quote) => {
            const peer_id = isGroup ? group_id : user_id
            return await (new SendMsg(self_id, isGroup)).message(msg, peer_id, quote ? message_id : false)
        }

        /** 获取对应用户头像 */
        e.getAvatarUrl = (id = user_id) => {
            return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
        }

        /** 构建场景对应的方法 */
        if (isGroup) {
            e.group = {
                pickMember: async (id) => {
                    let member = await api.get_group_member_info(self_id, group_id, id)
                    /** 获取头像 */
                    member.getAvatarUrl = (userID = user_id) => {
                        return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userID}`
                    }
                    const { group_id, user_id, nickname, last_sent_time } = member
                    member.info = { group_id, user_id, nickname, last_sent_time }
                    return member
                },
                getChatHistory: async (msg_id, num) => {
                    return [source]
                },
                recallMsg: async (msg_id) => {
                    return await api.delete_msg(self_id, msg_id)
                },
                sendMsg: async (msg, quote) => {
                    const peer_id = group_id
                    return await (new SendMsg(self_id, quote ? message_id : false)).message(msg, peer_id)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                }
            }
            /** 构建member */
            e.member = {
                info: {
                    group_id: data?.group_id,
                    user_id: data?.user_id,
                    nickname: data?.sender?.card,
                    last_sent_time: data?.time,
                },
                group_id: data?.group_id,
                is_admin: data?.sender?.role === "admin" || false,
                is_owner: data?.sender?.role === "owner" || false,
                /** 获取头像 */
                getAvatarUrl: () => {
                    return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${user_id}`
                },
                /** 椰奶禁言 */
                mute: async (time) => {
                    return await api.set_group_ban(self_id, group_id, user_id, time)
                }
            }
        } else {
            e.friend = {
                sendMsg: async (msg, quote) => {
                    const peer_id = user_id
                    return await (new SendMsg(self_id, quote ? message_id : false)).message(msg, peer_id)
                },
                recallMsg: async (msg_id) => {
                    return await api.delete_msg(self_id, msg_id)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                getChatHistory: async (msg_id, num) => {
                    return [source]
                },
                getAvatarUrl: async (userID = user_id) => {
                    return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userID}`
                }
            }
        }

        /** 将收到的消息转为字符串 */
        e.toString = () => {
            return raw_message
        }

        return e
    }


    /** 处理云崽的message */
    async message(id, msg) {
        const message = []
        let source
        for (const i of msg) {
            if (i.type === "reply") {
                /** 引用消息的id */
                const msg_id = i.data.id
                /** id不存在滚犊子... */
                if (!msg_id) continue
                source = await api.get_msg(id, msg_id)
                source = {
                    ...source,
                    seq: source.message_id,
                    user_id: source.sender.user_id,
                    message: source.message.map(msg => ({ type: msg.type, ...msg.data }))
                }
            } else {
                message.push({ type: i.type, ...i.data })
            }
        }
        return { message, source }
    }

    /** 加载资源 */
    async loadRes(uin) {
        /** 获取bot自身信息 */
        const info = await api.get_login_info(uin)
        const bot = Bot.shamrock.get(String(uin))
        /** 构建基本参数 */
        Bot[uin] = {
            /** 好友列表 */
            fl: new Map(),
            /** 群列表 */
            gl: new Map(),
            gml: new Map(),
            uin: uin,
            nickname: info.nickname,
            avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${uin}`,
            stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
            apk: { display: bot["qq-ver"].split(" ")[0], version: bot["qq-ver"].split(" ")[1] },
            version: { id: "QQ", name: "Shamrock", version: bot["user-agent"].replace("Shamrock/", "") },
            /** 转发 */
            makeForwardMsg: async (forwardMsg) => {
                return await common.makeForwardMsg(forwardMsg)
            },
            pickGroup: (group_id) => {
                return {
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin)).message(msg, group_id)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            },
            pickUser: (user_id) => {
                return {
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin, false)).message(msg, user_id)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            },
            getGroupMemberInfo: async function (group_id, user_id) {
                let member = await api.get_group_member_info(uin, group_id, user_id)
                member.card = member.nickname
                return member
            },
            pickFriend: (user_id) => {
                return {
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin, false)).message(msg, user_id)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            }
        }
        /** 异步加载好友、群列表 */
        this.LoadList(uin)
    }

    async LoadList(uin) {
        /** 注册uin */
        if (!Bot?.adapter) {
            Bot.adapter = [Bot.uin, uin]
        } else {
            Bot.adapter.push(uin)
            /** 去重防止断连后出现多个重复的id */
            Bot.adapter = Array.from(new Set(Bot.adapter.map(JSON.stringify))).map(JSON.parse)
        }

        /** 获取群聊列表啦~ */
        let group_list
        for (let retries = 0; retries < 5; retries++) {
            group_list = await api.get_group_list(uin)
            if (!(group_list && Array.isArray(group_list))) {
                await common.log(uin, `Shamrock群列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 群列表获取失败 */
        if (!group_list) {
            await common.log(uin, `Shamrock群列表获取失败次数过多，已停止重试`, "error")
        }

        if (group_list && typeof group_list === "object") {
            for (let i of group_list) {
                /** 给锅巴用 */
                Bot.gl.set(i.group_id, i)
                /** 自身参数 */
                Bot[uin].gl.set(i.group_id, i)
            }
        }

        /** 好友列表 */
        let friend_list
        for (let retries = 0; retries < 5; retries++) {
            friend_list = await api.get_friend_list(uin)
            if (!(friend_list && Array.isArray(friend_list))) {
                await common.log(uin, `Shamrock好友列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 好友列表获取失败 */
        if (!group_list) {
            await common.log(uin, `Shamrock好友列表获取失败次数过多，已停止重试`, "error")
        }

        if (friend_list && typeof friend_list === "object") {
            for (let i of friend_list) {
                /** 给锅巴用 */
                Bot.fl.set(i.user_id, i)
                /** 自身参数 */
                Bot[uin].fl.set(i.user_id, i)
            }
        }

        await common.log(uin, "Shamrock加载资源成功")
    }
}

/** 存储连接的bot对象 */
Bot.shamrock = new Map()
/** Shamrock的WebSocket服务器实例 */
const shamrock = new WebSocketServer({ noServer: true })

shamrock.on("connection", async (bot, request) => {
    await new Shamrock().server(bot, request)
})

/** 捕获错误 */
shamrock.on("error", async error => {
    if (error.code === "EADDRINUSE") {
        const msg = `Shamrock：启动WS服务器失败，端口${this.port}已被占用，请自行解除端口`
        return await common.log(this.id, msg, "error")
    }
    const msg = `Shamrock-发生错误：${error.message}`
    await common.log(this.id, msg, "error")
    return await common.log(this.id, msg, "debug")
})

export default shamrock
