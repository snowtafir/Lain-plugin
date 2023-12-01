import fs from "fs"
import { randomUUID } from "crypto"
import common from "../../model/common.js"
import api from "./api.js"

export default class SendMsg {
    /** 传入基本配置 */
    constructor(id, isGroup = true) {
        /** 机器人uin */
        this.id = id
        /** 是否群聊 */
        this.isGroup = isGroup
        /** 机器人名称 */
        this.name = Bot?.[id]?.nickname || "未知"
    }

    /** 发送消息 */
    async message(data, id, quote = false) {
        /** 将云崽过来的消息统一为数组 */
        data = common.array(data)
        /** 转为shamrock可以使用的格式 */
        let { msg, CQ, node } = await this.msg(data)

        /** 引用消息 */
        if (quote && !node) msg.unshift({ type: "reply", data: { id: quote } })
        if (node) CQ = ["[转发消息]"]

        /** 发送消息 */
        return await this.sendMsg(id, msg, CQ, node)
    }

    /** 转为shamrock可以使用的格式 */
    async msg(data) {
        if (typeof data == "string") data = [{ type: "text", text: data }]
        if (!Array.isArray(data)) data = [data]
        const CQ = []
        let msg = []
        let node = false

        /** chatgpt-plugin */
        if (data?.[0]?.type === "xml") data = data?.[0].msg

        for (let i of data) {
            if (i?.node) node = true
            switch (i.type) {
                case "at":
                    CQ.push(`{at:${Number(i.qq) == 0 ? i.id : i.qq}}`)
                    msg.push({
                        type: "at",
                        data: { qq: Number(i.qq) == 0 ? i.id : i.qq }
                    })
                    break
                case "face":
                    CQ.push(`{face:${i.text}}`)
                    msg.push({
                        type: "face",
                        data: { id: i.text }
                    })
                    break
                case "text":
                    CQ.push(i.text)
                    msg.push({
                        type: "text",
                        data: { text: i.text }
                    })
                    break
                case "file":
                    break
                case "record":
                    if (i.file && fs.existsSync(i.file)) {
                        /** 上传文件 */
                        try {
                            const base64 = "base64://" + fs.readFileSync(i.file).toString("base64")
                            i.file = (await api.download_file(this.id, base64))?.file
                            i.file = `file://${i.file}`
                        } catch (err) {
                            common.log(this.id, err, "error")
                        }
                    } else {
                        if (i?.url) i.file = i.url
                    }
                    CQ.push(`{record:${i.file}}`)
                    msg.push({
                        type: "record",
                        data: { file: i.file }
                    })
                    break
                case "video":
                    /** 本地文件 */
                    if (i.file && fs.existsSync(i.file)) {
                        /** 上传文件 */
                        try {
                            const base64 = "base64://" + fs.readFileSync(i.file).toString("base64")
                            i.file = (await api.download_file(this.id, base64))?.file
                            i.file = `file://${i.file}`
                        } catch (err) {
                            common.log(this.id, err, "error")
                        }
                    }
                    CQ.push(`{video:${i.file}}`)
                    msg.push({
                        type: "video",
                        data: { file: i.file }
                    })
                    break
                case "image":
                    CQ.push(`{image:base64://...}`)
                    msg.push(await this.get_image(i))
                    break
                case "poke":
                    CQ.push(`[CQ:poke,id=${i.id}]`)
                    msg.push({
                        type: "poke",
                        data: { type: i.id, id: 0, strength: i?.strength || 0 }
                    })
                    break
                case "touch":
                    CQ.push(`{poke:${i.id}}`)
                    msg.push(i)
                    break
                case "weather":
                    CQ.push(`[CQ=weather,${i.city ? ('city=' + i.city) : ('code=' + i.code)}]`)
                    msg.push({
                        type: "weather",
                        data: {
                            code: i.code,
                            city: i.city
                        }
                    })
                    break
                case "json":
                    let json
                    if (typeof i.data !== "string") {
                        json = JSON.stringify(i.data)
                    } else {
                        json = i.data
                    }
                    CQ.push(`[CQ=json,data=${json}]`)
                    msg.push({
                        type: "json",
                        data: {
                            data: json
                        }
                    })
                    break
                case "music":
                    CQ.push(`[CQ=music,type=${i.data.type},id=${i.data.id}]`)
                    msg.push({
                        type: "music",
                        data: i.data
                    })
                    break
                case "location":
                    const { lat, lng: lon } = data
                    CQ.push(`[CQ=json,lat=${lat},lon=${lon}]`)
                    msg.push({
                        type: "location",
                        data: {
                            lat,
                            lon
                        }
                    })
                    break
                case "share":
                    const { url, title, image, content } = data
                    CQ.push(`[CQ=json,url=${url},title=${title},image=${image},content=${content}]`)
                    msg.push({
                        type: "share",
                        data: {
                            url,
                            title,
                            content,
                            image
                        }
                    })
                    break
                case "forward":
                    CQ.push(i.text)
                    msg.push({
                        type: "text",
                        data: { text: i.text }
                    })
                    break
                case "node":
                    msg.push({
                        type: "node",
                        data: { ...i }
                    })
                    break
                default:
                    CQ.push(JSON.stringify(i))
                    msg.push({
                        type: "text",
                        data: { text: JSON.stringify(i) }
                    })
                    break
            }
        }

        /** 合并转发 */
        if (node) {
            const NodeMsg = []
            NodeMsg.push(...msg
                .filter(i => !(i.type == "at" || i.type == "record"))
                .map(i => ({
                    type: "node",
                    data: {
                        name: this.name,
                        content: [i]
                    }
                }))
            )
            msg = NodeMsg
        }

        return { msg, CQ, node }
    }

    /** 统一图片格式 */
    async get_image(i) {
        let file
        if (i?.url) i.url.includes("gchat.qpic.cn") && !i.url.startsWith("https://") ? i.file = "https://" + i.url : i.file = i.url
        if (i.file?.type === "Buffer" || i.file instanceof Uint8Array) {
            file = `base64://${Buffer.from(i?.file?.data || i.file).toString("base64")}`
        }
        else if (i.file instanceof fs.ReadStream) {
            file = `./${i.file.path}`
        }
        /** 去掉本地图片的前缀 */
        else if (typeof i.file === "string") {
            if (fs.existsSync(i.file.replace(/^file:\/\//, ""))) {
                file = fs.readFileSync(i.file.replace(/^file:\/\//, "")).toString("base64")
            }
            else if (fs.existsSync(i.file.replace(/^file:\/\/\//, ""))) {
                file = fs.readFileSync(i.file.replace(/^file:\/\/\//, "")).toString("base64")
            }
            else if (/^base64:\/\//.test(file)) {
                file = file.replace(/^base64:\/\//, "")
            }
            /** 本地文件 */
            else if (fs.existsSync(file)) {
                file = fs.readFileSync(file).toString("base64")
            }
            /** url图片 */
            else if (/^http(s)?:\/\//.test(file)) {
                return { type: "image", data: { file } }
            }
            else {
                await common.log(this.id, i, "error")
                return { type: "text", data: { text: JSON.stringify() } }
            }
        }
        else {
            await common.log(this.id, i, "error")
            return { type: "text", data: { text: JSON.stringify() } }
        }

        return { type: "image", data: { file: `base64://${file}` } }
    }

    /** 发送消息 */
    async sendMsg(id, msg, CQ, node) {
        /** 打印日志 */
        common.log(this.id, `发送${this.isGroup ? "群" : "好友"}消息：[${id}]${CQ.join("")}`)

        /** 处理合并转发 */
        if (node) {
            if (this.isGroup) {
                return await api.send_group_forward_msg(this.id, id, msg)
            } else {
                return await api.send_private_forward_msg(this.id, id, msg)
            }
        }

        /** 非合并转发 */
        const bot = Bot.shamrock.get(String(this.id))
        if (!bot) return common.log(this.id, "不存在此Bot")

        const echo = randomUUID()
        /** 判断群聊、私聊 */
        const action = this.isGroup ? "send_group_msg" : "send_private_msg"
        const params = { [this.isGroup ? "group_id" : "user_id"]: id, message: msg }
        /** 发送消息 */
        bot.socket.send(JSON.stringify({ echo, action, params }))

        /** 等待返回结果 */
        for (let i = 0; i < 10; i++) {
            let data = await Bot.lain.on.get(echo)
            if (data) {
                Bot.lain.on.delete(echo)
                try {
                    if (Object.keys(data?.data).length > 0 && data?.data) {
                        const { message_id, time } = data.data

                        /** 储存自身发送的消息 */
                        await redis.set(`Shamrock:${this.id}:${message_id}`, JSON.stringify(data), { EX: 120 })
                        return {
                            time,
                            message_id,
                            seq: message_id,
                            rand: 1
                        }
                    }
                    return data
                } catch {
                    return data
                }
            } else {
                await common.sleep(500)
            }
        }

        /** 获取失败 */
        return "获取失败"
    }
}
