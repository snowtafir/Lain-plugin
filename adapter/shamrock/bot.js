import common from "../../model/common.js"
import api from "./api.js"
import SendMsg from "./sendMsg.js"
import { init } from "../../index.js"
import { message, toRaw } from "./message.js"

export default new class addBot {
    /** 加载资源 */
    async loadRes(uin) {
        const bot = Bot.shamrock.get(String(uin))
        /** 构建基本参数 */
        Bot[uin] = {
            bkn: 0,
            /** 好友列表 */
            fl: new Map(),
            /** 群列表 */
            gl: new Map(),
            gml: new Map(),
            uin: uin,
            tiny_id: uin,
            avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${uin}`,
            stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
            apk: { display: bot["qq-ver"].split(" ")[0], version: bot["qq-ver"].split(" ")[1] },
            version: { id: "QQ", name: "Shamrock", version: bot["user-agent"].replace("Shamrock/", "") },
            /** 转发 */
            makeForwardMsg: async (forwardMsg) => {
                return await common.makeForwardMsg(forwardMsg, true)
            },
            pickGroup: (groupID) => {
                const is_admin = Bot[uin].gml.get(groupID)?.[uin]?.role === "admin" ? true : false
                const is_owner = Bot[uin].gml.get(groupID)?.[uin]?.role === "owner" ? true : false
                return {
                    is_admin,
                    is_owner,
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin)).message(msg, groupID)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg, true)
                    },
                    pickMember: (id) => {
                        /** 取缓存！！！别问为什么，因为傻鸟同步 */
                        let member = Bot[uin].gml.get(groupID)?.[id]
                        try {
                            member.info = { ...member }
                        } catch {
                            member.info = {}
                        }
                        return member
                    },
                    /** 禁言 */
                    muteMember: async (user_id, time) => {
                        return await api.set_group_ban(uin, groupID, Number(user_id), Number(time))
                    },
                    /** 获取群成员列表 */
                    getMemberMap: async () => {
                        let group_Member = Bot[uin].gml.get(groupID)
                        if (group_Member && Object.keys(group_Member) > 0) return group_Member
                        group_Member = new Map()
                        let member_list = await api.get_group_member_list(uin, groupID)
                        member_list.forEach(user => {
                            group_Member.set(user.user_id, user)
                        })
                        return group_Member
                    },
                    /** 设置群名称 */
                    setName: async (name) => {
                        return await api.set_group_name(uin, groupID, name)
                    },
                    /** 退群 */
                    quit: async () => {
                        return await api.set_group_leave(uin, groupID)
                    },
                    /** 设置管理 */
                    setAdmin: async (qq, type) => {
                        return await api.set_group_admin(uin, groupID, qq, type)
                    },
                    /** 踢 */
                    kickMember: async (qq, reject_add_request = false) => {
                        return await api.set_group_kick(uin, groupID, qq, reject_add_request)
                    },
                    /**
                     * 获取聊天历史记录
                     * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
                     * @param num 数量
                     * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
                     * @return {Promise<Awaited<unknown>[]>}
                     */
                    getChatHistory: async (msg_id, num, reply) => {
                        let { messages } = await api.get_group_msg_history(uin, groupID, num, msg_id)
                        let group = Bot[uin].gl.get(groupID)
                        messages = messages.map(async m => {
                            m.group_name = group?.group_name || groupID
                            m.atme = !!m.message.find(msg => msg.type === "at" && msg.data?.qq == uin)
                            m.raw_message = toRaw(m.message, uin, groupID)
                            let result = await message(uin, m.message, groupID, reply)
                            m = Object.assign(m, result)
                            return m
                        })
                        return Promise.all(messages)
                    },
                    /** 头衔 **/
                    setTitle: async (qq, title, duration) => {
                        return await api.set_group_special_title(uin, groupID, qq, title)
                    },
                    /** 修改群名片 **/
                    setCard: async (qq, card) => {
                        return await api.set_group_card(uin, groupID, qq, card)
                    },
                }
            },
            pickUser: (user_id) => {
                return {
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin, false)).message(msg, user_id)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg, true)
                    },
                    /**
                     * 获取私聊聊天记录
                     * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
                     * @param num 数量
                     * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
                     * @return {Promise<Awaited<unknown>[]>}
                     */
                    getChatHistory: async (msg_id, num, reply) => {
                        let { messages } = await api.get_history_msg(uin, "private", user_id, null, num, msg_id)
                        messages = messages.map(async m => {
                            m.raw_message = toRaw(m.message, uin)
                            let result = await message(uin, m.message, null, reply)
                            m = Object.assign(m, result)
                            return m
                        })
                        return Promise.all(messages)
                    }
                }
            },
            getGroupMemberInfo: async function (group_id, user_id) {
                /** 被自己坑了 */
                if (user_id == "88888" || user_id == "stdin") user_id = Number(uin)
                try {
                    let member = await api.get_group_member_info(uin, group_id, user_id)
                    member.card = member.nickname
                    return member
                } catch {
                    let member = {
                        card: "shamrock",
                        nickname: "shamrock"
                    }
                    return member
                }

            },
            pickFriend: (user_id) => {
                return {
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin, false)).message(msg, user_id)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg, true)
                    },
                    /**
                     * 获取私聊聊天记录
                     * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
                     * @param num 数量
                     * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
                     * @return {Promise<Awaited<unknown>[]>}
                     */
                    getChatHistory: async (msg_id, num, reply) => {
                        let { messages } = await api.get_history_msg(uin, "private", user_id, null, num, msg_id)
                        messages = messages.map(async m => {
                            m.raw_message = toRaw(m.message, uin)
                            let result = await message(uin, m.message, null, reply)
                            m = Object.assign(m, result)
                            return m
                        })
                        return Promise.all(messages)
                    }
                }
            },
            /** 上游暂未实现此函数，现伪造给椰奶使用 */
            getMsg: (msg_id) => {
                return
            },
            /** 退群 */
            quit: async () => {
                return await api.set_group_leave(uin, groupID)
            }
        }
        /** 加载好友、群列表 */
        await this.LoadList(uin)
    }

    async LoadList(uin) {
        if (!Bot.adapter.includes(uin)) Bot.adapter.push(uin)

        /** 获取bot自身信息 */
        const info = await api.get_login_info(uin)
        Bot[uin].nickname = info?.nickname || ""

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
        if (!group_list || !typeof group_list === "object") {
            await common.log(uin, `Shamrock群列表获取失败次数过多，已停止重试`, "error")
        }

        if (group_list && typeof group_list === "object") {
            group_list.forEach(i => {
                /** 给锅巴用 */
                Bot.gl.set(i.group_id, i)
                /** 自身参数 */
                Bot[uin].gl.set(i.group_id, i)
            })
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
        if (!friend_list || !typeof friend_list === "object") {
            await common.log(uin, `Shamrock好友列表获取失败次数过多，已停止重试`, "error")
        }

        if (friend_list && typeof friend_list === "object") {
            friend_list.forEach(i => {
                /** 给锅巴用 */
                Bot.fl.set(i.user_id, i)
                /** 自身参数 */
                Bot[uin].fl.set(i.user_id, i)
            })
        }

        group_list.forEach(async i => {
            /** 获取群成员，缓存到gml中 */
            try {
                let gml = {}
                let member_list = await api.get_group_member_list(uin, i.group_id)
                member_list.forEach(user => {
                    gml[user.user_id] = user

                })
                Bot[uin].gml.set(i.group_id, gml)
            } catch (error) { }
        })

        // let { token } = await api.get_csrf_token(uin, "qun.qq.com")
        try {
            let { cookies } = await api.get_cookies(uin)
            if (cookies) {
                let match = cookies.match(/skey=([^;]+)/)
                if (match) {
                    let skey = match[1]
                    let n = 5381
                    for (let e = skey || '', r = 0, o = e.length; r < o; ++r) {
                        n += (n << 5) + e.charAt(r).charCodeAt(0)
                    }
                    Bot[uin].bkn = 2147483647 & n
                }
            }
        } catch (err) {
            await common.log(uin, `Shamrock获取bkn失败。`, "warn")
        }


        Bot[uin].cookies = {}
        let domains = ["aq.qq.com", "buluo.qq.com", "connect.qq.com", "docs.qq.com", "game.qq.com", "gamecenter.qq.com", "haoma.qq.com", "id.qq.com", "kg.qq.com", "mail.qq.com", "mma.qq.com", "office.qq.com", "openmobile.qq.com", "qqweb.qq.com", "qun.qq.com", "qzone.qq.com", "ti.qq.com", "v.qq.com", "vip.qq.com", "y.qq.com", ""]
        for (let domain of domains) {
            api.get_cookies(uin, domain).then(ck => {
                ck = ck?.cookies
                if (ck) {
                    try {
                        // 适配椰奶逆天的ck转JSON方法
                        ck = ck.trim().replace(/\w+=;/g, '').replace(/\w+=$/g, '')
                    } catch (err) { }
                }
                Bot[uin].cookies[domain] = ck
            }).catch(error => {
                common.log(uin, `${domain} 获取cookie失败：${error}`, "debug")
            })
        }


        await common.log(uin, `Shamrock加载资源成功：加载了${Bot[uin].fl.size}个好友，${Bot[uin].gl.size}个群。`)

        /** 重启 */
        await init("Lain:restart:shamrock")
    }
}
