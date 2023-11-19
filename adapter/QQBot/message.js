import fs from "fs"
import path from "path"
import common from "../../model/common.js"

export default new class message {
    /** 转换格式给云崽 */
    async msg(e, isGroup) {
        e.bot.stat = { start_time: Date.now() / 1000, recv_msg_cnt: 0 }
        const _reply = e.reply
        /** 回复 */
        const reply = async (msg, quote) => {
            try {
                if (typeof msg === "object" && msg?.type == "image") {
                    msg = await this.get_image(msg)
                }
                else if (Array.isArray(msg)) for (let i in msg) {
                    if (msg[i].type === "image") msg[i] = await this.get_image(msg[i])
                }
            } catch (error) {
                common.log(e.self_id, error, "error")
            }

            try {
                _reply.call(e, msg, quote)
            } catch (error) {
                common.log(e.self_id, error.data, "error")
            }
        }

        e.reply = reply
        /** 快速撤回 */
        e.recall = async () => { return }

        /** 获取对应用户头像 */
        e.getAvatarUrl = (size = 0, id = user_id) => {
            return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${id}`
        }

        /** 构建场景对应的方法 */
        if (isGroup) {
            const member = {
                info: {
                    group_id: e.group_id,
                    user_id: e.user_id,
                    nickname: "",
                    last_sent_time: "",
                },
                group_id: e.group_id,
                is_admin: false,
                is_owner: false,
                /** 获取头像 */
                getAvatarUrl: (size = 0) => {
                    return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${e.user_id}`
                },
                mute: async (time) => {
                    return
                },
            }

            e.member = member
            e.group_name = e.group_id

            e.group = {
                pickMember: (id) => {
                    return {
                        member,
                        getAvatarUrl: (size = 0, userId = id) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userId}`
                    }
                },
                getChatHistory: async (msg_id, num, reply) => {
                    return ["test"]
                },
                recallMsg: async (msg_id) => {
                    return
                },
                sendMsg: async (msg, quote) => {
                    return reply(msg, quote)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, false)
                },
                /** 戳一戳 */
                pokeMember: async (operator_id) => {
                    return
                },
                /** 禁言 */
                muteMember: async (group_id, user_id, time) => {
                    return
                },
                /** 全体禁言 */
                muteAll: async (type) => {
                    return
                },
                getMemberMap: async () => {
                    return
                },
                /** 退群 */
                quit: async () => {
                    return
                },
                /** 设置管理 */
                setAdmin: async (qq, type) => {
                    return
                },
                /** 踢 */
                kickMember: async (qq, reject_add_request = false) => {
                    return
                },
                /** 头衔 **/
                setTitle: async (qq, title, duration) => {
                    return
                },
                /** 修改群名片 **/
                setCard: async (qq, card) => {
                    return
                },
            }
        } else {
            e.friend = {
                sendMsg: async (msg, quote) => {
                    return reply(msg, quote)
                },
                recallMsg: async (msg_id) => {
                    return
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, false)
                },
                getChatHistory: async (msg_id, num, reply = true) => {
                    return ["test"]
                },
                getAvatarUrl: async (size = 0, userID = user_id) => {
                    return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID}`
                }
            }
        }

        /** 将收到的消息转为字符串 */
        e.toString = () => {
            return e.raw_message
        }

        /** 添加适配器标识 */
        e.adapter = "QQBot"

        return e
    }


    /** 统一图片格式 */
    async get_image(i) {
        let filePath
        const folderPath = process.cwd() + `/plugins/Lain-plugin/resources/image`
        if (i?.url) i.url.includes("gchat.qpic.cn") && !i.url.startsWith("https://") ? i.file = "https://" + i.url : i.file = i.url
        // 检查是否是Buffer类型
        if (i.file?.type === "Buffer") {
            filePath = path.join(folderPath, `${Date.now()}.jpg`)
            fs.writeFileSync(filePath, Buffer.from(i.file.data))
        }
        // 检查是否是Uint8Array类型
        else if (i.file instanceof Uint8Array) {
            filePath = path.join(folderPath, `${Date.now()}.jpg`)
            fs.writeFileSync(filePath, Buffer.from(i.file))
        }
        // 检查是否是ReadStream类型
        else if (i.file instanceof fs.ReadStream) {
            filePath = path.join(folderPath, `${Date.now()}${path.extname(i.file.path)}`)
            fs.copyFileSync(i.file.path, filePath)
        }
        // 检查是否是base64格式的字符串
        else if (typeof i.file === "string" && /^base64:\/\//.test(i.file)) {
            const base64Data = i.file.replace(/^base64:\/\//, "")
            filePath = path.join(folderPath, `${Date.now()}.jpg`)
            fs.writeFileSync(filePath, base64Data, 'base64')
        }
        // 如果是url，则直接返回url
        else if (typeof i.file === "string" && /^http(s)?:\/\//.test(i.file)) {
            return { type: "image", file: i.file }
        }
        // 检查是否是字符串类型，且不是url
        else if (typeof i.file === "string") {
            const localPath = i.file.replace(/^file:\/\//, "")
            if (fs.existsSync(localPath)) {
                filePath = path.join(folderPath, `${Date.now()}${path.extname(localPath)}`)
                fs.copyFileSync(localPath, filePath)
            } else {
                common.log("QQBotApi", `本地文件不存在：${i}`, "error")
                return { type: "text", text: "本地文件不存在..." }
            }
        }
        // 留个容错
        else {
            common.log("QQBotApi", `未知格式：${i}`, "error")
            return { type: "text", text: "未知格式...请寻找作者适配..." }
        }

        // 返回名称
        if (fs.existsSync(filePath)) {
            const { FigureBed, port, QQBotImgIP, QQBotPort, QQBotImgToken } = Bot.lain.cfg
            let url
            // 先调用三方图床
            try {
                const res = await common.uploadFile(filePath, FigureBed)
                if (res.ok) {
                    const { result } = await res.json()
                    url = FigureBed.replace("/uploadimg", "") + result.path
                    common.log("QQBot图床", `[上传成功] ${url}`)
                    return { type: "image", file: url }
                } else {
                    const data = await res.json()
                    common.log("", `QQBot图床发生错误，将调用下一个方法：${data}`, "error")
                }
            } catch {
                common.log("", `QQBot图床发生错误，将调用下一个方法`, "error")
            }

            // 公网，反正都要返回东西，先赋值吧
            url = `http://${QQBotImgIP}:${QQBotPort || port}/api/QQBot?token=${QQBotImgToken}&name=${path.basename(filePath)}`

            // 使用QQ图床
            if(QQBotImgIP =="127.0.0.1"){
                const botList = Bot.adapter.filter(item => typeof item === "number")
                if (botList.length > 0) url = await common.uploadQQ(filePath, botList[0])
            }
            common.log("QQBotApi", `[生成文件] url：${url}`, "debug")
            return { type: "image", file: url }
        } else {
            common.log("QQBotApi", `文件保存失败:${i}`, "error")
            return { type: "text", text: "文件保存失败..." }
        }
    }
}
