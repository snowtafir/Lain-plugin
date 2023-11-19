import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import common from "../../model/common.js"
import { encode as encodeSilk } from "silk-wasm"

export default new class message {
    /** 转换格式给云崽 */
    async msg(e, isGroup) {
        e.bot.stat = Bot?.[e.self_id]?.stat
        const _reply = e.reply
        e.message = await this.message(e.message, true)
        /** 回复 */
        const reply = async (msg, quote) => {
            msg = await this.message(msg)
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


    /** 处理图片 */
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
            return await this.Upload_File(filePath, "image")
        } else {
            common.log("QQBotApi", `文件保存失败:${i}`, "error")
            return { type: "text", text: "文件保存失败..." }
        }
    }

    /** 处理视频 */
    async get_video(i) {
        let filePath
        const folderPath = process.cwd() + `/plugins/Lain-plugin/resources/image`

        if (typeof i.file === "string" && /^http(s)?:\/\//.test(i.file)) return i
        else if (fs.existsSync(i.file)) {
            filePath = path.join(folderPath, `${Date.now()}${path.extname(i.file)}`)
            fs.copyFileSync(i.file, filePath)
        } else {
            common.log("QQBotApi", `本地文件不存在：${i}`, "error")
            return { type: "text", text: "本地文件不存在..." }
        }

        // 返回名称
        if (fs.existsSync(filePath)) {
            return await this.Upload_File(filePath, "video")
        } else {
            common.log("QQBotApi", `文件保存失败:${i}`, "error")
            return { type: "text", text: "文件保存失败..." }
        }
    }

    /** 处理语音... */
    async get_audio(i) {
        let filePath
        const folderPath = process.cwd() + `/plugins/Lain-plugin/resources/image`
        if (typeof i.file === "string" && /^http(s)?:\/\//.test(i.file)) return i
        else if (fs.existsSync(i.file)) {
            const newFilePath = path.join(folderPath, `${Date.now()}.pcm`)
            await execSync(`ffmpeg -i "${i.file}" -f s16le -ar 48000 -ac 1 "${newFilePath}"`)
            filePath = path.join(folderPath, `${Date.now()}.silk`)
            await encodeSilk(fs.readFileSync(newFilePath), 48000)
                .then((silkData) => {
                    fs.writeFileSync(filePath, silkData)
                })
                .catch((err) => {
                    common.log("QQBot", `转码失败${err}`, "error")
                })

        } else {
            common.log("QQBotApi", `本地文件不存在：${i}`, "error")
            return { type: "text", text: "本地文件不存在..." }
        }

        // 返回名称
        if (fs.existsSync(filePath)) {
            return await this.Upload_File(filePath, "audio")
        } else {
            common.log("QQBotApi", `文件保存失败:${i}`, "error")
            return { type: "text", text: "文件保存失败..." }
        }
    }

    async message(e, t = false) {
        if (!Array.isArray(e)) e = [e]
        let msg = false
        const message = []
        for (let i in e) {
            switch (typeof e[i]) {
                case "string":
                    if (!msg && t && Bot.lain.cfg.QQBotPrefix) {
                        msg = true
                        message.push({ type: "text", text: e[i].trim().replace(/^\//, "#") })
                    } else {
                        message.push({ type: "text", text: e[i] })
                    }
                    break
                case "object":
                    try {
                        switch (e[i].type) {
                            case "image":
                                message.push(await this.get_image(e[i]))
                                break
                            case "text":
                                if (!msg && t && Bot.lain.cfg.QQBotPrefix) {
                                    msg = true
                                    e[i].text = e[i].text.trim().replace(/^\//, "#")
                                    message.push(e[i])
                                } else {
                                    message.push(e[i])
                                }
                                break
                            case "video":
                                message.push(await this.get_video(e[i]))
                                break
                            case "record":
                                message.push(await this.get_audio(e[i]))
                                break
                            default:
                                message.push(e[i])
                                break
                        }
                    } catch (err) {
                        message.push(e[i])
                    }
                    break
                default:
                    message.push(e[i])
            }

        }
        return message
    }

    async Upload_File(filePath, type) {
        const { FigureBed, port, QQBotImgIP, QQBotPort, QQBotImgToken } = Bot.lain.cfg
        let url
        // 先调用三方图床
        try {
            if (FigureBed && type === "image") {
                const res = await common.uploadFile(filePath, FigureBed)
                if (res.ok) {
                    const { result } = await res.json()
                    url = FigureBed.replace("/uploadimg", "") + result.path
                    common.log("QQBot图床", `[上传成功] ${url}`)
                    return { type, file: url }
                } else {
                    const data = await res.json()
                    common.log("", `QQBot图床发生错误，将调用下一个方法：${data}`, "error")
                }
            }
        } catch {
            common.log("", `QQBot图床发生错误，将调用下一个方法`, "error")
        }

        // 公网，反正都要返回东西，先赋值吧
        url = `http://${QQBotImgIP}:${QQBotPort || port}/api/QQBot?token=${QQBotImgToken}&name=${path.basename(filePath)}`

        // 使用QQ图床
        if (QQBotImgIP == "127.0.0.1" && type === "image") {
            const botList = Bot.adapter.filter(item => typeof item === "number")
            if (botList.length > 0) url = await common.uploadQQ(filePath, botList[0])
        }
        common.log("QQBotApi", `[生成文件] url：${url}`, "debug")
        return { type, file: url }
    }
}
