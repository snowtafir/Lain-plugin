import common from "../../model/common.js"
import api from "./api.js"
import SendMsg from "./sendMsg.js"
import { init } from "../../index.js"

export default new class addBot {
    /** 加载资源 */
    async loadRes(uin) {
        const bot = Bot.shamrock.get(String(uin))
        /** 构建基本参数 */
        Bot[uin] = {
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
                return await common.makeForwardMsg(forwardMsg)
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
                        return await common.makeForwardMsg(forwardMsg)
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
                        return await api.set_group_ban(uin, groupID, user_id, time)
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
                /** 被自己坑了 */
                if (user_id == "88888") user_id = uin
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
        /** 注册uin */
        if (!Bot?.adapter)
            Bot.adapter = [Bot.uin, uin]
        else
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

        await common.log(uin, `Shamrock加载资源成功：加载了${Bot[uin].fl.size}个好友，${Bot[uin].gl.size}个群。`)

        /** 重启 */
        await init("Lain:restart:shamrock")
    }
}