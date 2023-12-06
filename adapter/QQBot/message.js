import fs from "fs"
import path from "path"
import Yaml from "yaml"
import qrcode from "qrcode"
import { exec } from "child_process"
import common from "../../model/common.js"
import { encode as encodeSilk } from "silk-wasm"

export default new class message {
    /** 转换格式给云崽 */
    async msg(data, isGroup) {
        let { self_id: tiny_id, ...e } = data
        e.tiny_id = tiny_id
        e.self_id = e.bot.config.appid
        e.sendMsg = data.reply
        e.data = data

        if (Bot.lain.cfg.QQBotPrefix) {
            e.message.some(msg => {
                if (msg.type === "text") {
                    msg.text = msg.text.trim().replace(/^\//, "#")
                    return true
                }
                return false
            })
        }

        /** 构建快速回复消息 */
        e.reply = async (msg, quote) => {
            return await this.reply(e, msg, quote)
        }

        /** 快速撤回 */
        e.recall = async () => { return }

        /** 获取对应用户头像 */
        e.getAvatarUrl = (size = 0, id = user_id) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${id}`

        /** 构建场景对应的方法 */
        if (isGroup) {
            const member = {
                info: {
                    group_id: `${e.self_id}-${e.group_id}`,
                    user_id: `${e.self_id}-${e.user_id}`,
                    nickname: "",
                    last_sent_time: "",
                },
                group_id: `${e.self_id}-${e.group_id}`,
                is_admin: false,
                is_owner: false,
                /** 获取头像 */
                getAvatarUrl: (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${e.user_id}`,
                mute: async (time) => "",
            }

            e.member = member
            e.group_name = `${e.self_id}-${e.group_id}`

            e.group = {
                pickMember: (id) => {
                    try { id = id.split("-")[1] } catch { }
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
                sendMsg: async (msg, quote) => await this.reply(e, msg),
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, false)
                },
                /** 戳一戳 */
                pokeMember: async (operator_id) => "",
                /** 禁言 */
                muteMember: async (group_id, user_id, time) => "",
                /** 全体禁言 */
                muteAll: async (type) => "",
                getMemberMap: async () => "",
                /** 退群 */
                quit: async () => "",
                /** 设置管理 */
                setAdmin: async (qq, type) => "",
                /** 踢 */
                kickMember: async (qq, reject_add_request = false) => "",
                /** 头衔 **/
                setTitle: async (qq, title, duration) => "",
                /** 修改群名片 **/
                setCard: async (qq, card) => "",
            }
        } else {
            e.friend = {
                sendMsg: async (msg, quote) => await this.reply(e, msg),
                recallMsg: async (msg_id) => "",
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, false)
                },
                getChatHistory: async (msg_id, num, reply = true) => {
                    return ["test"]
                },
                getAvatarUrl: async (size = 0, userID = user_id) => {
                    try { id = id.split("-")[1] } catch { }
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
        e.user_id = `${e.self_id}-${e.user_id}`
        e.group_id = `${e.self_id}-${e.group_id}`
        e.author.id = `${e.self_id}-${e.author.id}`
        e.sender.user_id = `${e.self_id}-${e.sender.user_id}`
        return e
    }

    /** 处理message */
    async message(e) {
        if (!Array.isArray(e)) e = [e]
        e = common.array(e)
        let img = false
        const image = []
        const message = []
        for (let i in e) {
            switch (typeof e[i]) {
                case "string":
                    for (let msg of await this.HandleURL(e[i])) {
                        if (msg.type === "image") {
                            if (!img) {
                                img = true
                                message.push(msg)
                            } else {
                                image.push(msg)
                            }
                        } else {
                            message.push(msg)
                        }
                    }
                    break
                case "object":
                    try {
                        switch (e[i].type) {
                            case "image":
                                if (!img) {
                                    img = true
                                    message.push(await this.Upload(e[i], "image"))
                                } else {
                                    image.push(await this.Upload(e[i], "image"))
                                }
                                break
                            case "text":
                                for (let msg of await this.HandleURL(e[i])) {
                                    if (msg.type === "image") {
                                        if (!img) {
                                            img = true
                                            message.push(msg)
                                        } else {
                                            image.push(msg)
                                        }
                                    } else {
                                        message.push(msg)
                                    }
                                }
                                break
                            case "video":
                                message.push(await this.Upload(e[i], "video"))
                                break
                            case "record":
                                message.push(await this.Upload(e[i], "audio"))
                                break
                            case "at":
                                break
                            case "forward":
                                for (let msg of await this.HandleURL(e[i])) {
                                    if (msg.type === "image") {
                                        if (!img) {
                                            img = true
                                            message.push(msg)
                                        } else {
                                            image.push(msg)
                                        }
                                    } else {
                                        message.push(msg)
                                    }
                                }
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
        return { message, image }
    }

    /** 快速回复 */
    async reply(e, msg) {
        let res
        const { message, image } = await this.message(msg)
        try {
            res = await e.sendMsg.call(e.data, message)
        } catch (error) {
            common.log(e.self_id, `发送消息失败：${error?.data || error?.message || error}`, "error")
            common.log(e.self_id, error, "debug")
            res = await e.sendMsg.call(e.data, `发送消息失败：${error?.data || error?.message || error}`)
        }

        /** 分片发送图片 */
        if (image.length > 0) {
            image.forEach(async i => {
                try {
                    res = await e.sendMsg.call(e.data, i)
                } catch (error) {
                    common.log(e.self_id, `发送消息失败：${error?.data || error?.message || error}`, "error")
                    common.log(e.self_id, error, "debug")
                    res = await e.sendMsg.call(e.data, `发送消息失败：${error?.data || error?.message || error}`)
                }
            })
        }

        return {
            seq: res?.group_code,
            rand: 1,
            time: Date.now(),
            message_id: res?.group_code
        }
    }

    /** 统一传入的格式并上传 */
    async Upload(i, uploadType) {
        const { type, file } = await this.getFile(i, uploadType)
        /** 语音特殊处理 需要转码 */
        if (uploadType === "audio") {
            return await this.get_audio(type, file)
        }
        /** url直接返回即可 */
        else if (type === "http") {
            return { type: uploadType, file }
        }
        /** 文件上传 */
        else if (type === "file" && fs.existsSync(file)) {
            return await this.Upload_File(file, uploadType)
        }
        /** 这种情况都能碰到？ */
        else {
            common.log("QQBotApi", `文件保存失败：` + i, "error")
            return { type: "text", text: JSON.stringify(i) }
        }
    }

    /** 处理语音... */
    async get_audio(type, file) {
        const filePath = process.cwd() + `/plugins/Lain-plugin/resources/QQBotApi`
        const pcm = path.join(filePath, `${Date.now()}.pcm`)
        const silk = path.join(filePath, `${Date.now()}.silk`)

        if (type === "http") {
            const fileMp3 = `${filePath}/${Date.now()}${path.extname(file) || ".mp3"}`
            try {
                /** 下载 */
                const res = await fetch(file)
                if (res.ok) {
                    const buffer = await res.arrayBuffer()
                    fs.writeFileSync(fileMp3, Buffer.from(buffer))
                    common.log("QQBot", "语音文件下载成功", "mark")
                } else {
                    common.log("QQBot", `语音文件下载失败：${res.status}，${res.statusText}`, "error")
                    return { type: "text", text: `语音文件下载失败：${res.status}，${res.statusText}` }
                }
            } catch (error) {
                common.error("QQBot", error.message, "errror")
                return { type: "text", text: `语音文件下载失败：${res.status}，${res.statusText}` }
            }
            file = fileMp3
        }

        if (fs.existsSync(file)) {
            try {
                /** mp3 转 pcm */
                await this.runFfmpeg(file, pcm)
            } catch (error) {
                console.error(`执行错误: ${error}`)
                return { type: "text", text: `语音转码失败：${error}` }
            }
            /** pcm 转 silk */
            await encodeSilk(fs.readFileSync(pcm), 48000)
                .then((silkData) => {
                    /** 转silk完成，保存 */
                    fs.writeFileSync(silk, silkData)
                    /** 删除初始mp3文件 */
                    fs.unlink(file, (err) => { })
                    /** 删除pcm文件 */
                    fs.unlink(pcm, (err) => { })
                    common.log("QQBot", `silk转码完成：${silk}`, "mark")
                })
                .catch((err) => {
                    common.log("QQBot", `转码失败${err}`, "error")
                    return { type: "text", text: `转码失败${err}` }
                })

        } else {
            common.log("QQBotApi", `本地文件不存在：` + i, "error")
            return { type: "text", text: "本地文件不存在..." }
        }

        // 返回名称
        if (fs.existsSync(silk)) {
            return await this.Upload_File(silk, "audio")
        } else {
            common.log("QQBotApi", `文件保存失败：` + i, "error")
            return { type: "text", text: "文件保存失败..." }
        }
    }

    /** ffmpeg转码 转为pcm */
    async runFfmpeg(input, output) {
        return new Promise(async (resolve, reject) => {
            let cm
            let ret = await this.execSync("ffmpeg -version")
            if (ret.stdout) {
                cm = `ffmpeg`
            } else {
                const cfg = Yaml.parse(fs.readFileSync("./config/config/bot.yaml", "utf8"))
                cm = cfg.ffmpeg_path ? `"${cfg.ffmpeg_path}"` : null
            }

            if (!cm) {
                throw new Error("未检测到 ffmpeg ，无法进行转码，请正确配置环境变量或手动前往 bot.yaml 进行配置")
            }

            exec(`${cm} -i "${input}" -f s16le -ar 48000 -ac 1 "${output}"`, async (error, stdout, stderr) => {
                if (error) {
                    common.log("QQBot", `执行错误: ${error}`, "error")
                    reject(error)
                    return
                }
                common.log("QQBot", "ffmpeg转码完成")
                resolve()
            }
            )
        })
    }

    /** 读取环境变量 */
    async execSync(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
                resolve({ error, stdout, stderr })
            })
        })
    }

    /** 上传文件返回url */
    async Upload_File(filePath, type) {
        const { FigureBed, port, QQBotImgIP, QQBotPort, QQBotImgToken } = Bot.lain.cfg
        let url = `http://${QQBotImgIP}:${QQBotPort || port}/api/QQBot?token=${QQBotImgToken}&name=${path.basename(filePath)}`

        /** 先判断是否配置公网 */
        if (QQBotImgIP && QQBotImgIP != "127.0.0.1") {
            common.log("QQBotApi", `[生成文件-公网] url：${url}`)
            await common.sleep(100)
            return { type, file: url }
        }
        /** 未配置公网则按需调用 */
        try {
            /** 调用默认图床 */
            if (FigureBed) {
                const res = await common.uploadFile(filePath, FigureBed)
                if (res.ok) {
                    const { result } = await res.json()
                    url = FigureBed.replace("/uploadimg", "") + result.path
                    common.log("QQBot默认图床", `[上传成功] ${url}`)
                    await common.sleep(100)
                    return { type, file: url }
                } else {
                    const data = await res.json()
                    common.log("Lain-plugin", `QQBot默认图床发生错误，将调用下一个方法：${data}`, "error")
                }
            } else if (type === "image") {
                /** 调用QQ图床 */
                const botList = Bot.adapter.filter(item => typeof item === "number")
                if (botList.length > 0) {
                    url = await common.uploadQQ(filePath, botList[0])
                    await common.sleep(100)
                    return { type, file: url }
                } else {
                    common.log("QQBotApi", `未发现可使用的QQ图床，默认返回公网：${url}`, "error")
                    await common.sleep(100)
                    return { type, file: url }
                }
            } else {
                common.log("Lain-plugin", `默认图床和QQ图床调用失败，默认返回公网：${url}`, "error")
                await common.sleep(100)
                return { type, file: url }
            }
        } catch {
            common.log("Lain-plugin", `默认图床和QQ图床调用失败，默认返回公网：${url}`, "error")
            await common.sleep(100)
            return { type, file: url }
        }
    }

    /** 转换文本中的URL为图片 */
    async HandleURL(msg) {
        const message = []
        if (msg?.text) msg = msg.text
        if (typeof msg !== "string") return msg
        /** 白名单url */
        const whitelist_Url = Bot.lain.cfg.whitelist_Url

        /** 需要处理的url */
        let urls = await common.getUrls(msg) || []

        if (urls.length > 0) {
            /** 检查url是否包含在白名单中的任何一个url */
            urls = urls.filter(url => {
                return !whitelist_Url.some(whitelistUrl => url.includes(whitelistUrl))
            })

            let promises = urls.map(i => {
                return new Promise((resolve, reject) => {
                    common.log("QQBot", `url替换：${i}`, "mark")
                    qrcode.toBuffer(i, {
                        errorCorrectionLevel: "H",
                        type: "png",
                        margin: 4,
                        text: i
                    }, async (err, buffer) => {
                        if (err) reject(err)
                        const base64 = "base64://" + buffer.toString("base64")
                        const Uint8Array = await common.rendering(base64, i)
                        message.push(await this.Upload({ type: "image", file: Uint8Array }, "image"))
                        msg = msg.replace(i, "[链接(请扫码查看)]")
                        msg = msg.replace(i.replace(/^http:\/\//g, ""), "[链接(请扫码查看)]")
                        msg = msg.replace(i.replace(/^https:\/\//g, ""), "[链接(请扫码查看)]")
                        resolve()
                    })
                })
            })

            await Promise.all(promises)
            message.unshift({ type: "text", text: msg })
            return message
        }
        return [{ type: "text", text: msg }]
    }

    /** 统一文件格式 */
    async getFile(i, type) {
        const res = common.getFile(i)
        const { file } = res

        let extname = ".jpg"
        if (type == "audio") extname = ".mp3"
        else if (type == "video") extname = ".mp4"

        /** 统一使用时间戳命名，无后缀，根据类型补后缀 */
        let filePath = `${process.cwd()}/plugins/Lain-plugin/resources/QQBotApi/${Date.now()}`

        switch (res.type) {
            case "file":
                filePath = filePath + path.extname(file)
                fs.copyFileSync(file.replace(/^file:\/\//, ""), filePath)
                return { type: "file", file: filePath }
            case "buffer":
                filePath = filePath + extname
                fs.writeFileSync(filePath, Buffer.from(file))
                return { type: "file", file: filePath }
            case "base64":
                filePath = filePath + extname
                fs.writeFileSync(filePath, file.replace(/^base64:\/\//, ""), "base64")
                return { type: "file", file: filePath }
            case "http":
                return { type: "http", file: file }
            default:
                return { type: "error", file: file }
        }
    }
}
