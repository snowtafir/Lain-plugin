import { WebSocketServer } from "ws"
import api from "./api.js"
import SendMsg from "./sendMsg.js"
import e from "./message.js"
import common from "../../model/common.js"
import PluginsLoader from "../../../../lib/plugins/loader.js"
import { init } from "../../index.js"

class WeChat {
    /** 传入基本配置 */
    constructor() {
        const { port, path } = Bot.lain.cfg
        /** 端口 */
        this.port = port
        /** 路径 */
        this.path = path
        /** bot名称 */
        this.id = "ComWeChat"
    }

    /** 处理监听事件 */
    async server(bot, request) {
        Bot.lain.wc = bot
        bot.on("message", async (data) => {
            logger.debug(`WeChat：`, data)
            data = JSON.parse(data)
            if (data?.echo) {
                return Bot.lain.on.set(data.echo, data)
            }
            await this.message(data)
        })
        bot.on("close", async () => { await common.log(this.id, "PC微信通知：连接已关闭") })
    }

    async message(data) {
        const { detail_type, interval, group_id, user_id, message, version } = data
        if (!detail_type) return

        const eventHandler = {
            /** 连接 */
            connect: async () => {
                await common.log(this.id, `开始建立连接：${JSON.stringify(version)}`)
                Bot.lain.wc.send(JSON.stringify({ detail_type: "status_update", status_update: {} }))
            },

            /** 心跳 */
            heartbeat: async () => {
                await common.log(this.id, `PC微信-心跳校验：${interval}`, "debug")
                // Bot.lain.wc.send(JSON.stringify({ detail_type: "heartbeat", interval: interval }))
            },

            /** 状态更新 */
            status_update: async () => {
                await this.loadRes()
            },

            /** 群消息 */
            group: async () => {
                await common.log(this.id, `群消息：[${group_id}，${user_id}] ${data.alt_message}`)
                Bot[this.id].stat.recv_msg_cnt++
                /** 转换消息 交由云崽处理 */
                PluginsLoader.deal(await (new e(this.id)).msg(data))
            },

            /** 好友消息 */
            private: async () => {
                await common.log(this.id, `好友消息：[${user_id}] ${data.alt_message}`)
                Bot[this.id].stat.recv_msg_cnt++
                /** 转换消息 交由云崽处理 */
                PluginsLoader.deal(await (new e(this.id)).msg(data))
            },

            /** 好友申请 */
            "wx.friend_request": async () => {
                await common.log(this.id, "好友申请：" + `用户 ${data.user_id} 请求添加好友 请求理由：${data.content}`)
                /** 通过好友申请 */
                if (Bot.lain.cfg.autoFriend == 1) {
                    api.accept_friend(data.v3, data.v4)
                    await common.log(this.id, `已通过用户 ${data.user_id} 的好友申请`)
                }
            },

            /** 好友撤回消息 */
            private_message_delete: async () => {
                await common.log(this.id, "撤回消息：" + JSON.stringify(data))
            },

            /** 群聊撤回消息 */
            group_message_delete: async () => {
                await common.log(this.id, "撤回消息：" + JSON.stringify(data))
            },

            /** 好友接接收文件 */
            "wx.get_private_file": async () => {
                await common.log(this.id, "收到文件：" + JSON.stringify(data))
            },

            /** 群聊接收文件 */
            "wx.get_group_file": async () => {
                await common.log(this.id, "收到文件：" + JSON.stringify(data))
            },

            /** 好友收到红包 */
            "wx.get_private_redbag": async () => {
                await common.log(this.id, "收到红包：" + JSON.stringify(data))
            },

            /** 群聊收到红包 */
            "wx.get_group_redbag": async () => {
                await common.log(this.id, "收到红包：" + JSON.stringify(data))
            },

            /** 好友拍一拍 */
            "wx.get_private_poke": async () => {
                await common.log(this.id, `好友消息：${data.from_user_id} 拍了拍 ${data.user_id}`)
                /** 转换消息 交由云崽处理 */
                PluginsLoader.deal(await (new e(this.id)).msg(data))
            },

            /** 群聊拍一拍 */
            "wx.get_group_poke": async () => {
                await common.log(this.id, `群消息：${data.from_user_id} 拍了拍 ${data.user_id}`)
                /** 转换消息 交由云崽处理 */
                PluginsLoader.deal(await (new e(this.id)).msg(data))
            },

            /** 好友收到名片 */
            "wx.get_private_card": async () => {
                await common.log(this.id, "收到名片：" + JSON.stringify(data))
            },

            /** 群聊收到名片 */
            "wx.get_group_card": async () => {
                await common.log(this.id, "收到名片：" + JSON.stringify(data))
            },

            /** 默认处理 */
            default: async () => {
                await common.log(this.id, "未知事件：" + JSON.stringify(data))
            }
        }

        try {
            await eventHandler[detail_type]()
        } catch (error) {
            await eventHandler.default()
        }
    }

    async loadRes() {
        /** 获取bot自身信息 */
        const botCfg = await api.get_self_info()
        /** 覆盖默认id */
        this.id = botCfg.user_id
        /** 保存一下微信BotId */
        Bot.lain.wc.uin = botCfg.user_id

        /** 构建基本参数 */
        Bot[this.id] = {
            fl: new Map(),
            /** 群列表 */
            gl: new Map(),
            gml: new Map(),
            id: this.id,
            name: botCfg.user_name,
            uin: this.id,
            nickname: Bot.lain.cfg.name || botCfg.user_name,
            avatar: botCfg?.["wx.avatar"],
            stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
            apk: { display: "CWeChatRobot", version: Bot.lain.adapter.CWeChatRobot },
            version: { id: "PC", name: "微信", version: Bot.lain.adapter.WeChat },
            /** 转发 */
            makeForwardMsg: async (forwardMsg) => {
                return await common.makeForwardMsg(forwardMsg)
            },
            pickGroup: (group_id) => {
                return {
                    sendMsg: async (msg, quote = false) => {
                        const data = {
                            group_id,
                            user_id: null,
                            detail_type: "group"
                        }
                        return await (new SendMsg(this.id, data)).message(msg, quote)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            },
            pickUser: (user_id) => {
                return {
                    sendMsg: async (msg, quote = false) => {
                        const data = {
                            group_id: null,
                            user_id,
                            detail_type: "private"
                        }
                        return await (new SendMsg(this.id, data)).message(msg, quote)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            },
            getGroupMemberInfo: async function (group_id, user_id) {
                return {
                    group_id,
                    user_id,
                    nickname: "ComWeChat",
                    card: "ComWeChat",
                    sex: "female",
                    age: 6,
                    join_time: "",
                    last_sent_time: "",
                    level: 1,
                    role: "member",
                    title: "",
                    title_expire_time: "",
                    shutup_time: 0,
                    update_time: "",
                    area: "南极洲",
                    rank: "潜水",
                }
            }
        }

        if (!Bot.adapter.includes(this.id)) Bot.adapter.push(this.id)

        await common.log(this.id, "状态更新：ComWeChat已连接，正在加载资源中...")
        await common.sleep(1000)

        /** 获取群聊列表啦~ */
        let group_list
        for (let retries = 0; retries < 5; retries++) {
            group_list = await api.get_group_list()
            if (!(group_list && typeof group_list === "object")) {
                await common.log(this.id, `微信群列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 群列表获取失败 */
        if (!group_list) {
            await common.log(this.id, `微信群列表获取失败次数过多，已停止重试`, "error")
        }

        if (group_list && typeof group_list === "object") {
            for (let i of group_list) {
                /** 给锅巴用 */
                Bot.gl.set(i.group_id, i)
                /** 自身参数 */
                Bot[this.id].gl.set(i.group_id, i)
            }
        }

        /** 微信好友列表 */
        let friend_list
        for (let retries = 0; retries < 5; retries++) {
            friend_list = await api.get_friend_list()
            if (!(friend_list && typeof friend_list === "object")) {
                await common.log(this.id, `微信好友列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 好友列表获取失败 */
        if (!group_list) {
            await common.log(this.id, `微信好友列表获取失败次数过多，已停止重试`, "error")
        }

        if (friend_list && typeof friend_list === "object") {
            for (let i of friend_list) {
                /** 给锅巴用 */
                Bot.fl.set(i.user_id, i)
                /** 自身参数 */
                Bot[this.id].fl.set(i.user_id, i)
            }
        }

        await common.log(this.id, "PC微信加载资源成功...")
        /** 重启 */
        await init("Lain:restart:WeChat")
    }

}

/** Shamrock的WebSocket服务器实例 */
const ComWeChat = new WebSocketServer({ noServer: true })

ComWeChat.on("connection", async (bot, request) => {
    await new WeChat().server(bot, request)
})

/** 捕获错误 */
ComWeChat.on("error", async error => {
    if (error.code === "EADDRINUSE") {
        const msg = `PC微信通知：启动WS服务器失败，端口${this.port}已被占用，请自行解除端口`
        return await common.log(this.id, msg, "error")
    }
    const msg = `PC微信-发生错误：${error.message}`
    await common.log(this.id, msg, "error")
    return await common.log(this.id, msg, "debug")
})

export default ComWeChat


