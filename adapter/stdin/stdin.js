import { createInterface } from "readline"
import fs from "node:fs"
import { fileTypeFromBuffer } from "file-type"
import common from "../../model/common.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"

const uin = "88888"
const name = "标准输入"
const path = "data/stdin/"
const user_id = 55555

// 创建数据文件夹
common.mkdirs(path)

/** 自定义标准输入头像 */
let avatar = "default_avatar.jpg"
if (fs.existsSync(process.cwd() + "/plugins/Lain-plugin/resources/avatar.jpg")) {
    avatar = "avatar.jpg"
}

/** 构建基本参数 */
Bot[uin] = {
    fl: new Map(),
    gl: new Map(),
    gml: new Map(),
    id: uin,
    name: name,
    uin: uin,
    nickname: name,
    avatar: `../../../../../plugins/Lain-plugin/resources/${avatar}`,
    stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
    version: { id: "stdin", name: name, version: Bot.lain.adapter.stdin },
    /** 转发 */
    makeForwardMsg: sendForwardMsg,
    pickUser: () => {
        return {
            user_id,
            nickname: name,
            sendMsg: msg => sendMsg(msg),
            recallMsg: msg_id => common.log(uin, `撤回消息：${msg_id}`),
            makeForwardMsg: sendForwardMsg,
            sendForwardMsg: msg => sendForwardMsg(msg),
            sendFile: (file, name) => sendFile(file, name),
        }
    }
}

/** 设置随机头像(将头像文件放至resources/Avatar目录即可) */
let txurl = `${process.cwd()}/resources/Avatar/`
if (fs.existsSync(txurl)) {
    let tx_img = []
    for (let txlb of fs.readdirSync(txurl))
        if (txlb.includes("."))
            tx_img.push(txurl + txlb);
    if (tx_img.length > 0)
        Bot[uin].avatar = tx_img[Math.floor(Math.random() * tx_img.length)];
}

/** 注册uin */
if (!Bot?.adapter) {
    Bot.adapter = [uin, Bot.uin]
} else {
    if (!Bot.adapter.includes(uin)) Bot.adapter.unshift(uin)
}

/** 监听控制台输入 */
const rl = createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.on('SIGINT', () => { rl.close(); process.exit() })
function getInput() {
    rl.question('', async (input) => {
        await common.log(uin, `收到消息：${input.trim()}`)
        Bot[uin].stat.recv_msg_cnt++
        await pluginsLoader.deal(msg(input.trim()))
        getInput()
    })
}
getInput()

async function makeBuffer(file) {
    if (file.match(/^base64:\/\//))
        return Buffer.from(file.replace(/^base64:\/\//, ""), "base64")
    else if (file.match(/^https?:\/\//))
        return Buffer.from(await (await fetch(file)).arrayBuffer())
    else if (fs.existsSync(file))
        return Buffer.from(fs.readFileSync(file))
    return file
}

async function fileType(data) {
    const file = {}
    try {
        file.url = data.replace(/^base64:\/\/.*/, "base64://...")
        file.buffer = await makeBuffer(data)
        file.type = await fileTypeFromBuffer(file.buffer)
        file.path = `${path}${Date.now()}.${file.type.ext}`
    } catch (err) {
        await common.log(uin, `文件类型检测错误：${logger.red(err)}`, "error")
    }
    return file
}

function msg(msg) {
    const time = Date.now() / 1000

    let e = {
        adapter: "stdin",
        message_id: "test123456",
        message_type: "private",
        post_type: "message",
        sub_type: "friend",
        self_id: uin,
        seq: 888,
        time,
        uin: uin,
        user_id,
        message: [{ type: "text", text: msg }],
        raw_message: msg,
        isMaster: true,
        toString: () => { return msg },
    }
    /** 用户个人信息 */
    e.sender = {
        card: name,
        nickname: name,
        role: "",
        user_id
    }

    /** 构建member */
    const member = {
        info: {
            user_id,
            nickname: name,
            last_sent_time: time,
        },
        /** 获取头像 */
        getAvatarUrl: () => {
            return Bot[uin].avatar
        }
    }

    /** 赋值 */
    e.member = member

    /** 构建场景对应的方法 */
    e.friend = {
        user_id,
        nickname: name,
        sendMsg: msg => sendMsg(msg),
        recallMsg: msg_id => common.log(uin, `撤回消息：${msg_id}`),
        makeForwardMsg: sendForwardMsg,
        sendForwardMsg: msg => sendForwardMsg(msg),
        sendFile: (file, name) => sendFile(file, name),
    }

    /** 快速撤回 */
    e.recall = async () => {
        return await common.log(uin, `撤回消息：${msg_id}`)
    }
    /** 快速回复 */
    e.reply = async (reply) => {
        return await sendMsg(reply)
    }

    return e
}

/** 发送消息 */
async function sendMsg(msg) {
    if (!Array.isArray(msg)) msg = [msg]
    for (let i of msg) {
        if (typeof i != "object")
            i = { type: "text", data: { text: i } }
        else if (!i.data)
            i = { type: i.type, data: { ...i, type: undefined } }

        let file
        if (i.data.file)
            file = await fileType(i.data.file)

        switch (i.type) {
            case "text":
                i.text = String(i.text).trim()
                if (!i.data.text) break
                if (i.data.text.match("\n"))
                    i.data.text = `\n${i.data.text}`
                await common.log(uin, `发送文本：${i.data.text}`)
                break
            case "image":
                await common.log(uin, `发送图片：${file.url}\n文件已保存到：${logger.cyan(file.path)}`)
                fs.writeFileSync(file.path, file.buffer)
                break
            case "record":
                await common.log(uin, `发送音频：${file.url}\n文件已保存到：${logger.cyan(file.path)}`)
                fs.writeFileSync(file.path, file.buffer)
                break
            case "video":
                await common.log(uin, `发送视频：${file.url}\n文件已保存到：${logger.cyan(file.path)}`)
                fs.writeFileSync(file.path, file.buffer)
                break
            case "reply":
                break
            case "at":
                break
            case "node":
                sendForwardMsg(i.data)
                break
            default:
                i = JSON.stringify(i)
                if (i.match("\n")) i = `\n${i}`
                await common.log(uin, `发送消息：${i}`)
        }
    }
    return { message_id: Date.now() }
}

async function sendFile(file, name = path.basename(file)) {
    const buffer = await makeBuffer(file)
    if (!Buffer.isBuffer(buffer)) {
        await common.log(uin, `发送文件错误：找不到文件 ${logger.red(file)}`, "error")
        return false
    }

    const files = `${path}${Date.now()}-${name}`
    await common.log(uin, `发送文件：${file}\n文件已保存到：${logger.cyan(files)}`)
    return fs.writeFileSync(files, buffer)
}

function sendForwardMsg(msg) {
    const messages = []
    for (const i of msg)
        messages.push(sendMsg(i.message))
    return messages
}

await common.log(uin, `加载完成...您可以在控制台输入指令哦~`)