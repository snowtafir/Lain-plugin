/* eslint-disable */
/**
 *  从xiaofei-plugin抄过来改装
 */
import plugin from '../../../../../lib/plugins/plugin.js'
import fetch from 'node-fetch'

import fs from 'fs'
import md5 from 'md5'
import crypto from 'crypto'

let Config, Data, Version, Plugin_Path
try {
    let index = await import('../../../../xiaofei-plugin/components/index.js')
    Config = index.Config
    Data = index.Data
    Version = index.Version
    Plugin_Path = index.Plugin_Path
} catch (err) {
    // 没装小飞 忽略
}
global.xiaofei_plugin_shamrock = {}
const no_pic = ''
let _page_size = 20
let _music_timeout = 1000 * 60 * 3
const music_source = {
    哔哩哔哩: 'bilibili',
    哔哩: 'bilibili',
    网易云: 'netease',
    网易: 'netease',
    酷我: 'kuwo',
    酷狗: 'kugou',
    QQ: 'qq',
    qq: 'qq'
}
const music_reg = '^#?(小飞)?(' + Object.keys(music_source).join('|') + '|多选)?(' + Object.keys(music_source).join('|') + '|多选)?(点播音乐|点播|点歌|播放|放一?首|来一?首|下一页|个性电台|每日推荐|每日30首|日推|我的收藏|我喜欢的歌)(.*)$'

function getCookieMap(cookie) {
    let cookiePattern = /^(\S+)=(\S+)$/
    let cookieArray = cookie.replace(/\s*/g, '').split(';')
    let cookieMap = new Map()
    for (let item of cookieArray) {
        let entry = item.split('=')
        if (!entry[0]) continue
        cookieMap.set(entry[0], entry[1])
    }
    return cookieMap || {}
}

const factory = {}
if (Config) {
    let music_cookies = {
        qqmusic: {
            get ck() {
                try {
                    let data = Config.getConfig('music', 'cookies')
                    if (data?.qqmusic) {
                        return getCookieMap(data?.qqmusic)
                    }
                } catch (err) {
                }
                return null
            },
            set ck(cookies) {
                try {
                    if (typeof (cookies) == 'object') {
                        try {
                            let cks = []
                            for (let key of cookies.keys()) {
                                let value = cookies.get(key)
                                if (value) {
                                    cks.push(`${key}=${value}`)
                                }
                            }
                            cookies = cks.join('; ')
                        } catch (err) {
                        }
                    }
                    let data = Config.getConfig('music', 'cookies')
                    data = data || {}
                    data.qqmusic = cookies
                    Config.saveConfig('music', 'cookies', data)
                } catch (err) {
                    logger.error(err)
                }
            },
            body: {
                comm: {
                    _channelid: '19',
                    _os_version: '6.2.9200-2',
                    authst: '',
                    ct: '19',
                    cv: '1891',
                    guid: md5(String(new Date().getTime())),
                    patch: '118',
                    psrf_access_token_expiresAt: 0,
                    psrf_qqaccess_token: '',
                    psrf_qqopenid: '',
                    psrf_qqunionid: '',
                    tmeAppID: 'qqmusic',
                    tmeLoginType: 2,
                    uin: '0',
                    wid: '0'
                }
            },
            init: false,
            update_time: 0
        },
        netease: {
            get ck() {
                try {
                    let data = Config.getConfig('music', 'cookies')
                    if (data?.netease) {
                        return data?.netease
                    }
                } catch (err) {
                }
                return ''
            },
            set ck(cookies) {
                try {
                    let data = Config.getConfig('music', 'cookies')
                    data = data || {}
                    data.netease = cookies
                    Config.saveConfig('music', 'cookies', data)
                } catch (err) {
                    logger.error(err)
                }
            }
        }
    }

    if (!xiaofei_plugin_shamrock.music_temp_data) {
        xiaofei_plugin_shamrock.music_temp_data = {}
    }

    if (!xiaofei_plugin_shamrock.music_poke_cd) {
        xiaofei_plugin_shamrock.music_poke_cd = {}
    }

    if (xiaofei_plugin_shamrock.music_guild) Bot.off('guild.message', xiaofei_plugin_shamrock.music_guild)
    xiaofei_plugin_shamrock.music_guild = async (e) => { // 处理频道消息
        e.msg = e.raw_message
        if (RegExp(music_reg).test(e.msg) || /^#?(小飞语音|小飞高清语音|小飞歌词|语音|高清语音|歌词|下载音乐)?(\d+)?$/.test(e.msg)) {
            factory.music_message(e)
        }
    }
    Bot.on('guild.message', xiaofei_plugin_shamrock.music_guild)

    if (xiaofei_plugin_shamrock.music_notice) Bot.off('notice', xiaofei_plugin_shamrock.music_notice)
    xiaofei_plugin_shamrock.music_notice = async (e) => { // 处理通知
        if (e?.sub_type != 'poke' || e.target_id != Bot.uin) return
        e.user_id = e.operator_id
        let key = factory.get_MusicListId(e)
        let time = xiaofei_plugin_shamrock.music_poke_cd[key] || 0
        if ((new Date().getTime() - time) < 8000) return
        xiaofei_plugin_shamrock.music_poke_cd[key] = new Date().getTime()
        let setting = Config.getdefSet('setting', 'system') || {}
        if (setting.poke != true) return
        e.msg = '#小飞来首歌'
        if (await factory.music_message(e)) return
    }
    Bot.on('notice', xiaofei_plugin_shamrock.music_notice)

    factory.update_qqmusic_ck = async function () {
        try {
            let update_time = music_cookies.qqmusic.update_time
            if ((new Date().getTime() - update_time) < (1000 * 60 * 10)) {
                return
            }
            music_cookies.qqmusic.update_time = new Date().getTime()
            let type = -1// QQ:0,微信:1
            let ck_map = music_cookies.qqmusic.ck || new Map()
            if (ck_map.get('wxunionid')) {
                type = 1
            } else if (ck_map.get('psrf_qqunionid')) {
                type = 0
            } else {
                if (!music_cookies.qqmusic.init) {
                    music_cookies.qqmusic.init = true
                    logger.info('【小飞插件_QQ音乐ck】未设置QQ音乐ck！')
                }
                return
            }
            let authst = ck_map.get('music_key') || ck_map.get('qm_keyst')
            let psrf_musickey_createtime = Number(ck_map.get('psrf_musickey_createtime') || 0) * 1000
            let refresh_num = Number(ck_map.get('refresh_num') || 0)
            if (((new Date().getTime() - psrf_musickey_createtime) > (1000 * 60 * 60 * 12) || !authst) && refresh_num < 3) {
                let result = await qqmusic_refresh_token(ck_map, type)
                if (result.code == 1) {
                    ck_map = result.data
                    logger.info('【小飞插件_QQ音乐ck】已刷新！')
                } else {
                    ck_map.set('refresh_num', refresh_num + 1)
                    music_cookies.qqmusic.init = false
                    logger.error('【小飞插件_QQ音乐ck】刷新失败！')
                }
                music_cookies.qqmusic.ck = ck_map
                authst = ck_map.get('qqmusic_key') || ck_map.get('qm_keyst')
            } else if (refresh_num > 2) {
                if (!music_cookies.qqmusic.init) {
                    music_cookies.qqmusic.init = true
                    logger.error('【小飞插件_QQ音乐ck】ck已失效！')
                }
            }
            let comm = music_cookies.qqmusic.body.comm
            if (type == 0) comm.uin = ck_map.get('uin') || '', comm.psrf_qqunionid = ck_map.get('psrf_qqunionid') || ''
            if (type == 1) comm.wid = ck_map.get('wxuin') || '', comm.psrf_qqunionid = ck_map.get('wxunionid') || ''
            comm.tmeLoginType = Number(ck_map.get('tmeLoginType') || '2')
            comm.authst = authst || ''
            comm.guid = md5(String(comm.authst + comm.uin + comm.wid))
        } catch (err) {
            logger.error(err)
        }
    }

    factory.recallMusicMsg = async function (key, msg_results) {
        if (msg_results && msg_results.length > 0) {
            for (let msg_result of msg_results) {
                let arr = key.split('_')
                let type = arr[0]
                for (let val of msg_result) {
                    try {
                        val = await val
                        let message_id = (await val?.message)?.message_id || val?.message_id
                        switch (type) {
                            case 'group':
                                await Bot.pickGroup(arr[1]).recallMsg(message_id)
                                break
                            case 'friend':
                                await Bot.pickFriend(arr[1]).recallMsg(message_id)
                                break
                        }
                    } catch (err) {
                        logger.error(err)
                    }
                }
            }
        }
    }

    factory.music_message = async function (e) {
        let reg = /^#?(小飞语音|小飞高清语音|小飞歌词|语音|高清语音|歌词|下载音乐)?(\d+)?$/.exec(e.msg)
        if (reg) {
            if (e.source && (reg[1]?.includes('语音') || reg[1]?.includes('下载音乐'))) {
                let source
                if (e.isGroup) {
                    source = (await e.group.getChatHistory(e.source.seq, 1)).pop()
                } else {
                    source = (await e.friend.getChatHistory(e.source.time, 1)).pop()
                }
                if (source && source.message[0].type == 'json') {
                    try {
                        let music_json = JSON.parse(source.message[0].data)
                        if (music_json.view == 'music') {
                            let music = music_json.meta.music

                            await e.reply('开始上传[' + music.title + '-' + music.desc + ']。。。')
                            let result = await e.reply(await uploadRecord(music.musicUrl, 0, !reg[1].includes('高清'), music.title + '-' + music.desc))
                            if (!result) {
                                result = '上传[' + music.title + '-' + music.desc + ']失败！\n' + music.musicUrl
                                await e.reply(result)
                                return true
                            }
                            if (reg[1].includes('高清') && result) {
                                try {
                                    let message = await Bot.getMsg(result.message_id)
                                    if (Array.isArray(message.message)) message.message.push({
                                        type: 'text',
                                        text: '[语音]'
                                    });
                                    (e.group || e.friend)?.sendMsg('PCQQ不要播放，否则会导致语音无声音！', message)
                                } catch (err) {
                                }
                            }
                        }
                    } catch (err) {
                    }
                    return true
                }
            }

            let key = factory.get_MusicListId(e)
            let data = xiaofei_plugin_shamrock.music_temp_data[key]
            if (!data || (new Date().getTime() - data.time) > _music_timeout) {
                return false
            }

            if ((reg[1]?.includes('语音') || reg[1]?.includes('歌词') || reg[1]?.includes('下载音乐')) && !reg[2]) {
                reg[2] = String((data.index + 1) + data.start_index)
            }

            let index = (Number(reg[2]) - 1) - data.start_index

            if (data.data.length > index && index > -1) {
                if (data.data.length < 2 && !reg[1]?.includes('语音') && !reg[1]?.includes('歌词') && !reg[1]?.includes('下载音乐')) {
                    return false
                }
                data.index = index
                let music = data.data[index]

                if (!reg[1]?.includes('歌词')) {
                    let music_json = await factory.CreateMusicShareJSON(music)
                    if (reg[1] && (reg[1].includes('语音') || reg[1]?.includes('下载音乐'))) {
                        if (!music_json.meta.music || !music_json.meta.music?.musicUrl) {
                            await e.reply('[' + music.name + '-' + music.artist + ']获取下载地址失败！')
                            return true
                        }

                        await e.reply('开始上传[' + music.name + '-' + music.artist + ']。。。')
                        let result = await uploadRecord(music_json.meta.music.musicUrl, 0, !reg[1].includes('高清'), music.name + '-' + music.artist)
                        if (!result) {
                            result = '上传[' + music.name + '-' + music.artist + ']失败！\n' + music_json.meta.music.musicUrl
                            await e.reply(result)
                            return true
                        }
                        result = await e.reply(result)
                        if (reg[1].includes('高清') && result) {
                            try {
                                let message = await Bot.getMsg(result.message_id)
                                if (Array.isArray(message.message)) message.message.push({
                                    type: 'text',
                                    text: '[语音]'
                                });
                                (e.group || e.friend)?.sendMsg('PCQQ不要播放，否则会导致语音无声音！', message)
                            } catch (err) {
                            }
                        }
                        return true
                    }
                    let body = await factory.CreateMusicShare(e, music)
                    await factory.SendMusicShare(body, e)
                } else {
                    try {
                        typeof (music.lrc) == 'function' ? music.lrc = await music.lrc(music.data) : music.lrc = music.lrc
                        if (music.lrc == null && typeof (music.api) == 'function') {
                            await music.api(music.data, ['lrc'], music)
                        }
                    } catch (err) {
                    }

                    let lrcs = music.lrc || '没有查询到这首歌的歌词！'
                    if (!Array.isArray(lrcs)) lrcs = [lrcs]

                    let user_info = {
                        nickname: Bot.nickname,
                        user_id: Bot.uin
                    }
                    let MsgList = []

                    for (let lrc of lrcs) {
                        let lrc_text = []
                        let lrc_reg = /\[.*\](.*)?/gm
                        let exec
                        while (exec = lrc_reg.exec(lrc)) {
                            if (exec[1]) {
                                lrc_text.push(exec[1])
                            }
                        }
                        if (lrc_text.length > 0) {
                            MsgList.push({
                                ...user_info,
                                message: `---${music.name}-${music.artist}---\n${lrc_text.join('\n')}`
                            })
                        }

                        MsgList.push({
                            ...user_info,
                            message: `---${music.name}-${music.artist}---\n${lrc}`
                        })
                    }
                    let forwardMsg = await Bot.makeForwardMsg(MsgList)
                    await e.reply(forwardMsg)
                }

                return true
            }
            return false
        }

        reg = RegExp(music_reg).exec(e.msg)
        let search = reg[5]
        let source = ''
        if (!reg[2]) reg[2] = ''
        if (!reg[3]) reg[3] = ''

        if (music_source[reg[2]]) {
            let source = reg[2]
            reg[2] = reg[3]
            reg[3] = source
        }

        let setting = Config.getdefSet('setting', 'system') || {}
        source = music_source[reg[3]] || (music_source[setting.music_source] || 'qq')

        try {
            let arr = Object.entries(music_source)
            let index = Object.values(music_source).indexOf(source)
            reg[3] = arr[index][0] || reg[3]
        } catch (err) {
        }

        source = [source, reg[3]]

        if (search == '' && reg[4] != '下一页' && reg[4] != '个性电台' && reg[4] != '每日推荐' && reg[4] != '每日30首' && reg[4] != '日推' && !((reg[4] == '来首' || reg[4] == '放首') && search == '歌') && reg[4] != '我的收藏' && reg[4] != '我喜欢的歌') {
            let help = '------点歌说明------\r\n格式：#点歌 #多选点歌\r\n支持：QQ、网易、酷我、酷狗\r\n例如：#QQ点歌 #多选QQ点歌'
            await e.reply(help, true)
            return true
        }

        if (setting.is_list == true) reg[2] = '多选'

        let temp_data = {}
        let page = reg[2] == '多选' ? 1 : 0
        let page_size = reg[2] == '多选' ? _page_size : 10

        if (((reg[4] == '来首' || reg[4] == '放首') && search == '歌')) {
            search = e.user_id
            source = ['qq_recommend', '推荐']
            page = 0
            page_size = 1
        }

        if (reg[4] == '个性电台') {
            if (reg[4] == '个性电台' && search != '') return true
            search = e.user_id
            source = ['qq_radio', '个性电台']
            page = 0
            page_size = 5
            if (reg[4].includes('首')) {
                page_size = 1
            } else {
                e.reply('请稍候。。。', true)
            }
        }

        if (reg[4] == '每日推荐' || reg[4] == '每日30首' || reg[4] == '日推') {
            if (search != '') return true
            search = e.user_id
            source = ['qq_DailyRecommend', '每日推荐']
            page = 0
            page_size = 30
            e.reply('请稍候。。。', true)
        }

        if (reg[4] == '我的收藏' || reg[4] == '我喜欢的歌') {
            let page_reg = /^\d+$/.exec(search)
            if (search != '' && !page_reg) return true
            search = e.user_id
            source = ['qq_like', '收藏']
            page = (!page_reg ? 1 : parseInt(page_reg[0]))
            page_size = page == 0 ? 30 : _page_size
            e.reply('请稍候。。。', true)
        }

        if (reg[4] == '下一页') {
            let key = factory.get_MusicListId(e)
            let data = xiaofei_plugin_shamrock.music_temp_data[key]
            if (!data || (new Date().getTime() - data.time) > _music_timeout || data.page < 1) {
                return false
            }
            data.time = new Date().getTime()// 续期，防止搜索时清除
            page_size = _page_size
            page = data.page + 1
            search = data.search
            source = data.source
            temp_data = data// 上一页的列表数据
        }

        return factory.music_handle(e, search, source, page, page_size, temp_data)
    }

    factory.music_handle = async function (e, search, source, page = 0, page_size = 10, temp_data = {}) {
        let result = await factory.music_search(search, source[0], page == 0 ? 1 : page, page_size)
        if (result && result.data && result.data.length > 0) {
            let key = factory.get_MusicListId(e)
            let data = xiaofei_plugin_shamrock.music_temp_data
            let temp = data[key]
            if (temp?.msg_results && (temp?.search != search || temp?.source[0] != source[0] || page < 2 || !temp_data?.data)) {
                delete data[key]
                factory.recallMusicMsg(key, temp.msg_results)// 撤回上一条多选点歌列表
            }
            data = {}

            if (page > 0 && result.data.length > 1) {
                page = result.page
                let title = source[1] + '点歌列表'
                if (result.title) title = result.title
                if (result.data.length >= page_size || page > 1) title += `[第${page}页]`
                let msg_result = []

                if (e.guild_id) { // 频道的话发文字，图片不显示。。。
                    msg_result.push(e.reply(factory.ShareMusic_TextList(e, result.data, page, page_size, title)))
                } else {
                    msg_result.push(new Promise(async (resolve, reject) => {
                        resolve(await e.reply(await factory.ShareMusic_HtmlList(e, result.data, page, page_size, title)))// 生成图片列表
                    }))
                }

                if (page > 1) {
                    let list_data = temp_data.data;
                    list_data = list_data || []
                    list_data = list_data.concat(result.data)
                    let msg_results = temp_data.msg_results;
                    msg_results = msg_results || []
                    msg_results.push(msg_result)
                    data = {
                        time: new Date().getTime(),
                        data: list_data,
                        page: result.page,
                        msg_results,
                        search,
                        source,
                        index: -1,
                        start_index: !temp_data.data ? (page * page_size) - page_size : temp_data.start_index
                    }
                } else {
                    data = {
                        time: new Date().getTime(),
                        data: result.data,
                        page: result.page,
                        msg_results: [msg_result],
                        search,
                        source,
                        index: -1,
                        start_index: 0
                    }
                }
            } else {
                if (['qq_radio', 'qq_recommend', 'qq_like', 'qq_DailyRecommend'].includes(source[0])) {
                    let title
                    let nickname = e.sender.nickname || e.user_id
                    if (e.isGroup) {
                        try {
                            let info = await Bot.getGroupMemberInfo(e.group_id, e.user_id)
                            nickname = info.card || info.nickname
                        } catch (err) {
                        }
                    }

                    let user_info = {
                        nickname,
                        user_id: e.user_id
                    }

                    switch (source[0]) {
                        case 'qq_radio':
                            title = `根据${nickname}的听歌口味推荐`
                            break
                        case 'qq_like':
                            title = `${nickname}的收藏`
                            break
                        case 'qq_DailyRecommend':
                        default:
                            title = result.title
                            break
                    }

                    let MsgList = []
                    let index = 1
                    let tag = 'QQ音乐' + source[1]
                    if (result.data.length > 1) {
                        if (result.desc) {
                            MsgList.push({
                                ...user_info,
                                message: result.desc
                            })
                        }

                        // let json_list = [];
                        for (let music of result.data) {
                            let music_json = await CreateMusicShareJSON({
                                ...music
                            })
                            // music_json.app = 'com.tencent.structmsg';
                            // music_json.config.autosize = true;
                            music = music_json.meta.music
                            music.tag = index + '.' + tag
                            // json_list.push(music_json);
                            MsgList.push({
                                ...user_info,
                                message: segment.json(music_json)
                            })
                            index++
                        }

                        let is_sign = true
                        let forwardMsg = await Bot.makeForwardMsg(MsgList)
                        let forwardMsg_json = forwardMsg.data
                        if (typeof (forwardMsg_json) === 'object') {
                            if (forwardMsg_json.app === 'com.tencent.multimsg' && forwardMsg_json.meta?.detail) {
                                let detail = forwardMsg_json.meta.detail
                                let resid = detail.resid
                                let fileName = detail.uniseq
                                let preview = ''
                                for (let val of detail.news) {
                                    preview += `<title color="#777777" size="26">${val.text}</title>`
                                }
                                forwardMsg.data = `<?xml version="1.0" encoding="utf-8"?><msg brief="[聊天记录]" m_fileName="${fileName}" action="viewMultiMsg" tSum="1" flag="3" m_resid="${resid}" serviceID="35" m_fileSize="0"><item layout="1"><title color="#000000" size="34">转发的聊天记录</title>${preview}<hr></hr><summary color="#808080" size="26">${detail.summary}</summary></item><source name="聊天记录"></source></msg>`
                                forwardMsg.type = 'xml'
                                forwardMsg.id = 35
                            }
                        }
                        forwardMsg.data = forwardMsg.data
                            .replace('<?xml version="1.0" encoding="utf-8"?>', '<?xml version="1.0" encoding="UTF-8"?>')
                            .replace(/\n/g, '')
                            .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
                            .replace(/___+/, `<title color="#777777" size="26">${title}</title>`)
                        if (!is_sign) {
                            forwardMsg.data = forwardMsg.data
                                .replace('转发的', '不可转发的')
                        }
                        await e.reply(forwardMsg)
                        data = {
                            time: new Date().getTime() + (1000 * 60 * 27),
                            data: result.data,
                            page: 0,
                            msg_results: [],
                            search,
                            source,
                            index: -1,
                            start_index: 0
                        }
                    } else {
                        if (source[0] == 'qq_radio') {
                            tag = nickname.length > 6 ? (nickname.substring(0, 6) + '...') : nickname
                            tag = `${tag}的个性电台`
                        }
                        let music = result.data[0]
                        music.name = `${music.name}-${music.artist}`
                        music.artist = tag
                        let body = await factory.CreateMusicShare(e, music)
                        await factory.SendMusicShare(body, e)
                        data = {
                            time: new Date().getTime(),
                            data: [result.data[0]],
                            page: 0,
                            msg_results: [],
                            search,
                            source,
                            index: 0,
                            start_index: 0
                        }
                    }
                } else {
                    let music = result.data[0]
                    data = {
                        time: new Date().getTime(),
                        data: [music],
                        page: 0,
                        msg_results: [],
                        search,
                        source,
                        index: 0,
                        start_index: 0
                    }
                    let body = await factory.CreateMusicShare(e, music)
                    await factory.SendMusicShare(body, e)
                }
            }
            xiaofei_plugin_shamrock.music_temp_data[factory.get_MusicListId(e)] = data
        } else {
            if (page > 1) {
                await e.reply('没有找到更多歌曲！', true)
            } else {
                await e.reply(((source[0].includes('radio') || source[0].includes('recommend')) ? '获取推荐歌曲失败，请重试！' : '没有找到歌曲！'), true)
            }
        }
        return true
    }

    factory.ShareMusic_TextList = async function (e, list, page, page_size, title = '') {
        let next_page = !!((page > 0 && list.length >= page_size))
        let message = [`---${title}---`]
        for (let i in list) {
            let music = list[i]
            let index = Number(i) + 1
            if (page > 1) {
                index = ((page - 1) * page_size) + index
            }
            message.push(index + '.' + music.name + '-' + music.artist)
        }
        message.push('----------------')
        message.push('提示：请在一分钟内发送序号进行点歌' + (next_page ? '，发送【#下一页】查看更多' : '') + '！')
        return message.join('\n')
    }

    factory.ShareMusic_HtmlList = async function (e, list, page, page_size, title = '') { // 来自土块插件（earth-k-plugin）的列表样式（已修改）
        let next_page = !!((page > 0 && list.length >= page_size))
        let start = Date.now()
        let new_list = []
        for (let i in list) {
            let music = list[i]
            let index = Number(i) + 1
            if (page > 1) {
                index = ((page - 1) * page_size) + index
            }
            new_list.push({
                index,
                name: music.name,
                artist: music.artist
            })
        }
        let saveId = String(new Date().getTime())
        let dir = 'data/html/xiaofei-plugin/music_list'
        Data.createDir(dir, 'root')

        let _background_path = `${Plugin_Path}/resources/html/music_list/bg/default.jpg`
        let background_path = ''
        let background_url = await factory.get_background()

        if (background_url) {
            try {
                let response = await fetch(background_url)
                let buffer = Buffer.from(await response.arrayBuffer())
                if (buffer) {
                    let file = `${process.cwd()}/${dir}/${saveId}.jpg`
                    fs.writeFileSync(file, buffer)
                    background_path = file
                }
            } catch (err) {
            }
        }

        let data = {
            plugin_path: Plugin_Path,
            background_path: background_path || _background_path,
            title: `${title.split('').join(' ')}`,
            tips: '请在一分钟内发送序号进行点歌' + (next_page ? '，发送【#下一页】查看更多' : '') + '！',
            sub_title: `Created By Yunzai-Bot ${Version.yunzai} & xiaofei-Plugin ${Version.ver}`,
            list: new_list
        }

        if (!xiaofei_plugin_shamrock.puppeteer) {
            xiaofei_plugin_shamrock.puppeteer = xiaofei_plugin.puppeteer
        }

        let img = await xiaofei_plugin_shamrock.puppeteer.screenshot('xiaofei-plugin/music_list', {
            saveId,
            tplFile: `${Plugin_Path}/resources/html/music_list/index.html`,
            data,
            imgType: 'jpeg',
            quality: 80
        })

        setTimeout(() => {
            fs.unlink(`${process.cwd()}/${dir}/${saveId}.html`, err => {
            })
            if (background_path) fs.unlink(background_path, err => {
            })
        }, 100)

        logger.mark(`[小飞插件_点歌列表图片生成耗时]${logger.green(`${Date.now() - start}ms`)}`)
        if (img && img?.type != 'image') img = segment.image(img)
        return img
    }

    factory.get_MusicListId = async function (e) {
        let id = ''
        if (e.guild_id) {
            id = `guild_${e.channel_id}_${e.guild_id}`
        } else if (e.group) {
            id = `group_${e.group.gid}_${e.user_id}`
        } else {
            id = `friend_${e.user_id}`
        }
        return `${id}`
    }

    factory.get_background = async function () {
        let background_url = ''
        let api = 'https://content-static.mihoyo.com/content/ysCn/getContentList?channelId=313&pageSize=1000&pageNum=1&isPreview=0'
        try {
            let response
            let res
            let background_temp = xiaofei_plugin_shamrock.background_temp
            if (background_temp && (new Date().getTime() - background_temp.time) < 1000 * 60 * 360) {
                res = background_temp.data
            } else {
                response = await fetch(api) // 调用接口获取数据
                res = await response.json() // 结果json字符串转对象
            }

            if (res.retcode == 0 && res.data?.list) {
                if (response) {
                    xiaofei_plugin_shamrock.background_temp = {
                        data: res,
                        time: new Date().getTime()
                    }
                }
                let list = res.data.list
                let data = list[random(0, list.length - 1)].ext[0]
                if (data.value && data.value.length > 0) {
                    background_url = data.value[random(0, data.value.length - 1)].url
                }
            }
        } catch (err) {
        }
        return background_url
    }

    factory.music_search = async function (search, source, page = 1, page_size = 10) {
        let list = []
        let result = []
        let setting = Config.getdefSet('setting', 'system') || {}
        let music_high_quality = setting.music_high_quality

        let value = {
            netease: {
                name: 'name',
                id: 'id',
                artist: (data) => {
                    let ars = []
                    for (let index in data.ar) {
                        ars.push(data.ar[index].name)
                    }
                    return ars.join('/')
                },
                pic: (data) => {
                    let url = data.al ? data.al.picUrl + '?param=300x300' : no_pic
                    return url
                },
                link: (data) => {
                    let url = 'http://music.163.com/#/song?id=' + data.id
                    return url
                },
                url: async (data) => {
                    let url = 'http://music.163.com/song/media/outer/url?id=' + data.id

                    if (data.privilege && data.privilege.fee != 8 || music_high_quality) {
                        try {
                            let cookie = music_cookies.netease?.ck
                            cookie = cookie || ''
                            let options = {
                                method: 'POST', // post请求
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 12; MI Build/SKQ1.211230.001)',
                                    Cookie: 'versioncode=8008070; os=android; channel=xiaomi; ;appver=8.8.70; ' + cookie
                                },
                                body: `ids=${JSON.stringify([data.id])}&level=${music_high_quality ? 'exhigh' : 'standard'}&encodeType=mp3`
                            }
                            let response = await fetch('https://interface3.music.163.com/api/song/enhance/player/url/v1', options) // 调用接口获取数据
                            let res = await response.json() // 结果json字符串转对象
                            if (res.code == 200) {
                                url = res.data[0]?.url || url
                            }
                        } catch (err) {
                        }
                    }
                    return url
                },
                lrc: async (data) => {
                    let url = `https://music.163.com/api/song/lyric?id=${data.id}&lv=-1&tv=-1`
                    try {
                        let options = {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.42',
                                Referer: 'https://music.163.com/'
                            }
                        }
                        let response = await fetch(url, options) // 调用接口获取数据
                        let res = await response.json()
                        if (res.code == 200 && res.lrc?.lyric) {
                            let lrc = res.lrc.lyric
                            if (res.tlyric.lyric) lrc = [lrc, res.tlyric.lyric]
                            return lrc
                        }
                    } catch (err) {
                    }
                    return '没有查询到这首歌的歌词！'
                }
            },
            kuwo: {
                name: 'SONGNAME',
                id: 'MUSICRID',
                artist: 'ARTIST',
                pic1: async (data) => {
                    let url = `http://artistpicserver.kuwo.cn/pic.web?type=rid_pic&pictype=url&content=list&size=320&rid=${data.MUSICRID.substring(6)}`
                    let response = await fetch(url) // 调用接口获取数据
                    let res = await response.text()
                    url = ''
                    if (res && res.indexOf('http') != -1) {
                        url = res
                    }
                    return url
                },
                pic: (data) => {
                    let url = data.web_albumpic_short
                    url = url ? 'http://img2.kuwo.cn/star/albumcover/' + url : (data.web_artistpic_short ? 'http://img2.kuwo.cn/star/starheads/' + data.web_artistpic_short : no_pic)
                    return url
                },
                link: (data) => {
                    let url = 'http://yinyue.kuwo.cn/play_detail/' + data.MUSICRID.substring(6)
                    return url
                },
                url: async (data) => {
                    let url = `http://antiserver.kuwo.cn/anti.s?useless=/resource/&format=mp3&rid=${data.MUSICRID}&response=res&type=convert_url&br=128kmp3`
                    try {
                        let response = await fetch(`https://www.kuwo.cn/api/v1/www/music/playUrl?mid=${data.MUSICRID.substring(6)}&type=convert_url&httpsStatus=1&reqId=${crypto.randomUUID()}`) // 调用接口获取数据
                        let res = await response.json() // 结果json字符串转对象
                        if (res.data && res.data?.url) {
                            return res.data.url
                        }
                    } catch (err) {
                        console.log(err)
                    }
                    return url
                },
                old_url: async (data) => {
                    let url = `http://antiserver.kuwo.cn/anti.s?useless=/resource/&format=mp3&rid=${data.MUSICRID}&response=res&type=convert_url&br=128kmp3`
                    try {
                        let response = await fetch(url.replace('convert_url', 'convert_url3')) // 调用接口获取数据
                        let res = await response.json() // 结果json字符串转对象
                        if (res && res.url) {
                            if (res.url.includes('/588957081.mp3')) return ''
                            return res.url
                        }
                    } catch (err) {
                    }
                    return url
                },
                lrc: async (data) => {
                    try {
                        let url = `http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${data.MUSICRID.substring(6)}`
                        let options = {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.42',
                                Referer: 'http://www.kuwo.cn/'
                            }
                        }
                        let response = await fetch(url, options) // 调用接口获取数据
                        let res = await response.json()
                        if (res.data?.lrclist) {
                            let lrc = []
                            for (let val of res.data.lrclist) {
                                let i = parseInt((Number(val.time) / 60) % 60);
                                if (String(i).length < 2) i = `0${i}`
                                let s = parseInt(Number(val.time) % 60);
                                if (String(s).length < 2) s = `0${s}`
                                let ms = val.time.split('.')[1] || '00';
                                if (ms.length > 3) ms = ms.substring(0, 3)
                                lrc.push(`[${i}:${s}.${ms}]${val.lineLyric}`)
                            }
                            return lrc.join('\n')
                        }
                    } catch (err) {
                    }
                    return '没有查询到这首歌的歌词！'
                }
            },
            qq: {
                name: (data) => {
                    let name = data.title
                    return name.replace(/\<(\/)?em\>/g, '')
                },
                id: 'mid',
                artist: (data) => {
                    let ars = []
                    for (let index in data.singer) {
                        ars.push(data.singer[index].name)
                    }
                    return ars.join('/')
                },
                pic: (data) => {
                    let album_mid = data.album ? data.album.mid : ''
                    let singer_mid = data.singer ? data.singer[0].mid : ''
                    let pic = (data.vs[1] && data.vs[1] != '') ? `T062R150x150M000${data.vs[1]}` : (album_mid != '' ? `T002R150x150M000${album_mid}` : (singer_mid != '' ? `T001R150x150M000${singer_mid}` : ''))
                    let url = pic == '' ? no_pic : `http://y.gtimg.cn/music/photo_new/${pic}.jpg`
                    return url
                },
                link: (data) => {
                    let url = 'https://y.qq.com/n/yqq/song/' + data.mid + '.html'
                    return url
                },
                url: async (data) => {
                    let code = md5(`${data.mid}q;z(&l~sdf2!nK`).substring(0, 5).toLocaleUpperCase()
                    let play_url = `http://c6.y.qq.com/rsc/fcgi-bin/fcg_pyq_play.fcg?songid=&songmid=${data.mid}&songtype=1&fromtag=50&uin=${Bot.uin}&code=${code}`
                    if ((data.sa == 0 && data.pay?.price_track == 0) || data.pay?.pay_play == 1 || music_high_quality) { // 需要付费
                        let json_body = {
                            ...music_cookies.qqmusic.body,
                            req_0: {
                                module: 'vkey.GetVkeyServer',
                                method: 'CgiGetVkey',
                                param: {
                                    guid: md5(String(new Date().getTime())),
                                    songmid: [],
                                    songtype: [0],
                                    uin: '0',
                                    ctx: 1
                                }
                            }
                        }
                        let mid = data.mid
                        let media_mid = data.file?.media_mid
                        let songmid = [mid]
                        if (music_high_quality) {
                            let quality = [
                                ['size_320mp3', 'M800', 'mp3'],
                                ['size_192ogg', 'O600', 'ogg'],
                                ['size_128mp3', 'M500', 'mp3'],
                                ['size_96aac', 'C400', 'm4a']
                            ]
                            songmid = []
                            let filename = []
                            let songtype = []
                            for (let val of quality) {
                                if (data.file[val[0]] < 1) continue
                                songmid.push(mid)
                                songtype.push(0)
                                filename.push(`${val[1]}${media_mid}.${val[2]}`)
                            }
                            json_body.req_0.param.filename = filename
                            json_body.req_0.param.songtype = songtype
                        }
                        json_body.req_0.param.songmid = songmid

                        let options = {
                            method: 'POST', // post请求
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                Cookie: ''
                            },
                            body: JSON.stringify(json_body)
                        }

                        let url = 'https://u6.y.qq.com/cgi-bin/musicu.fcg'
                        try {
                            let response = await fetch(url, options) // 调用接口获取数据
                            let res = await response.json()
                            if (res.req_0 && res.req_0?.code == '0') {
                                let midurlinfo = res.req_0.data.midurlinfo
                                let purl = ''
                                if (midurlinfo && midurlinfo.length > 0) {
                                    for (let val of midurlinfo) {
                                        purl = val.purl
                                        if (purl) {
                                            play_url = 'http://ws.stream.qqmusic.qq.com/' + purl
                                            break
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                        }
                    }
                    return play_url
                },
                lrc: async (data) => {
                    let url = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?_=${new Date().getTime()}&cv=4747474&ct=24&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=1&uin=0&g_tk_new_20200303=5381&g_tk=5381&loginUin=0&songmid=${data.mid}`
                    try {
                        let options = {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.42',
                                Referer: 'https://y.qq.com/'
                            }
                        }
                        let response = await fetch(url, options) // 调用接口获取数据
                        let res = await response.json()
                        if (res.lyric) {
                            let lrc = Buffer.from(res.lyric, 'base64').toString()
                            if (res.trans) lrc = [lrc, Buffer.from(res.trans, 'base64').toString()]
                            return lrc
                        }
                    } catch (err) {
                    }
                    return '没有查询到这首歌的歌词！'
                }
            },
            kugou: {
                name: 'songname',
                id: 'hash',
                artist: 'singername',
                pic: null,
                link: null,
                url: null,
                lrc: null,
                api: async (data, types, music_data = {}) => {
                    let hash = data.hash
                    let album_id = data.album_id
                    let url = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}&dfid=&appid=1014&mid=1234567890&platid=4&album_id=${album_id}&_=${new Date().getTime()}`
                    let response = await fetch(url) // 调用接口获取数据
                    let res = await response.json() // 结果json字符串转对象

                    if (res.status != 1) {
                        return music_data
                    }
                    data = res.data

                    if (types.indexOf('pic') > -1) {
                        music_data.pic = data.img ? data.img : no_pic
                    }
                    if (types.indexOf('url') > -1) {
                        let key = md5(`${hash}mobileservice`)
                        music_data.url = `https://m.kugou.com/api/v1/wechat/index?cmd=101&hash=${hash}&key=${key}`// 播放直链
                        // 如果直链失效了再取消注释下面
                        // music_data.url = data.play_url ? data.play_url : result.url;
                    }
                    if (types.indexOf('lrc') > -1) {
                        music_data.lrc = data.lyrics || '没有查询到这首歌的歌词！'
                    }
                    if (types.indexOf('link') > -1) {
                        music_data.link = `https://www.kugou.com/song/#${data.encode_album_audio_id}`
                    }
                    return music_data
                }
            },
            bilibili: {
                name: (data) => {
                    let title = data.title.replace(/\<.*?\>/g, '')
                    return title
                },
                id: 'bvid',
                artist: (data) => {
                    let author = data.author.replace(/\<.*?\>/g, '')
                    return author
                },
                pic: (data) => {
                    let url = data.pic || ''
                    if (url.indexOf('http') != 0) url = 'http:' + url
                    return url
                },
                link: (data) => {
                    let url = `https://www.bilibili.com/video/${data.bvid}`
                    return url
                },
                url: null,
                lrc: null,
                api: async (data, types, music_data = {}) => {
                    let url = `https://api.bilibili.com/x/web-interface/view?bvid=${data.bvid}`
                    let response = await fetch(url)
                    let res = await response.json()
                    let info = res.data
                    if (types.indexOf('url') > -1) {
                        // let buvid3 = '86C4617D-B351-47D5-B0A2-8EDAA0E7FC3B167645infoc';
                        // let session = md5((buvid3 || Math.floor(1e5 * Math.random()).toString(16)) + Date.now());
                        // let url = `https://api.bilibili.com/x/player/playurl?avid=${info.aid}&bvid=${info.bvid}&cid=${info.cid}&qn=0&fnver=0&fnval=16&fourk=1&session=${session}`;
                        let url = 'https://api.bilibili.com/x/tv/playurl'
                        let time = parseInt(new Date().getTime() / 1000)
                        let params = {
                            access_key: '',
                            appkey: '1d8b6e7d45233436',
                            // aid: info.aid,
                            build: 7210300,
                            buvid: 'XU973E09237CC101E74F6E24CCF3DE3300D0B',
                            c_locale: 'zh_CN',
                            channel: 'xiaomi',
                            cid: info.cid,
                            disable_rcmd: 0,
                            fnval: 16, // 130
                            fnver: 0,
                            fourk: 1,
                            is_dolby: 0,
                            is_h265: 0,
                            is_proj: 1,
                            live_extra: '',
                            mobi_app: 'android',
                            mobile_access_key: '',
                            object_id: info.aid,
                            platform: 'android',
                            playurl_type: 1,
                            protocol: 1,
                            qn: 64,
                            s_locale: 'zh_CN',
                            statistics: '%7B%22appId%22%3A1%2C%22platform%22%3A3%2C%22version%22%3A%227.21.0%22%2C%22abtest%22%3A%22%22%7D',
                            sys_ver: 31,
                            ts: time,
                            video_type: 0
                        }
                        let param = []
                        for (let key of Object.keys(params).sort()) {
                            param.push(`${key}=${params[key]}`)
                        }
                        param = param.join('&')
                        let sign = md5(`${param}560c52ccd288fed045859ed18bffd973`)
                        param += `&sign=${sign}`
                        let response = await fetch(`${url}?${param}`)
                        let res = await response.json()
                        console.log(res)
                        if (res.data?.dash?.audio && res.data?.dash?.audio.length > 0) {
                            let audios = res.data?.dash?.audio
                            audios = audios.sort((a, b) => {
                                return a.id - b.id
                            })
                            let play_url = audios[audios.length - 1].base_url
                            // backup_url
                            if (!/https?\:\/\/\d+.\d+.\d+.\d+\/\/?/.test(play_url)) {
                                let backup_url = audios[audios.length - 1].backup_url
                                for (let url of backup_url) {
                                    if (/https?\:\/\/\d+.\d+.\d+.\d+\/\/?/.test(url)) {
                                        play_url = url
                                        break
                                    }
                                }
                            }
                            if (play_url) music_data.url = play_url.replace(/https?\:\/\/\d+.\d+.\d+.\d+\/\/?/, 'https://upos-sz-mirrorhw.bilivideo.com/')
                        } else if (res.data?.durl && res.data?.durl.length > 0) {
                            let play_url = res.data?.durl[0].url
                            if (play_url) music_data.url = play_url.replace(/https?\:\/\/\d+.\d+.\d+.\d+\/\/?/, 'https://upos-sz-mirrorhw.bilivideo.com/')
                        }
                    }
                    return music_data
                }
            }
        }

        switch (source) {
            case 'bilibili':
                result = await factory.bilibili_search(search, page, page_size)
                break
            case 'netease':
                result = await factory.netease_search(search, page, page_size)
                break
            case 'kuwo':
                result = await factory.kuwo_search(search, page, page_size)
                break
            case 'kugou':
                result = await factory.kugou_search(search, page, page_size)
                break
            case 'qq_radio':
                source = 'qq'
                result = await factory.qqmusic_radio(search, page_size)
                break
            case 'qq_DailyRecommend':
                source = 'qq'
                result = await factory.qqmusic_getdiss(search, 0, 202, page, page_size)
                break
            case 'qq_recommend':
                source = 'qq'
                result = await factory.qqmusic_recommend(search, page_size)
                break
            case 'qq_like':
                source = 'qq'
                result = await factory.qqmusic_getdiss(search, 0, 201, page, page_size)
                break
            case 'qq':
            default:
                source = 'qq'
                result = await factory.qqmusic_search(search, page, page_size)
                break
        }
        if (result && result.data && result.data.length > 0) {
            page = result.page
            let result_data = result.data
            for (let i in result_data) {
                let data = result_data[i]
                let name = value[source].name;
                name = typeof (name) == 'function' ? await name(data) : data[name]
                let id = data[value[source].id];
                if (source == 'kuwo') {
                    id = id.substring(6)
                }
                let artist = value[source].artist;
                artist = typeof (artist) == 'function' ? await artist(data) : data[artist]
                let pic = value[source].pic;
                pic = typeof (pic) == 'function' ? pic/* await pic(data) */ : data[pic]
                let link = value[source].link;
                link = typeof (link) == 'function' ? link(data) : data[link]
                let url = value[source].url;
                url = typeof (url) == 'function' ? url/* await url(data) */ : data[url]
                let lrc = value[source].lrc;
                lrc = typeof (lrc) == 'function' ? lrc/* await lrc(data) */ : data[lrc]
                list.push({
                    id,
                    name,
                    artist,
                    pic,
                    link,
                    url,
                    lrc,
                    source,
                    data,
                    api: value[source].api
                })
            }
        }
        return {title: result?.title, desc: result?.desc, page, data: list}
    }

    factory.CreateMusicShareJSON = async function (data) {
        let music_json = {
            app: 'com.tencent.structmsg',
            desc: '音乐',
            view: 'music',
            ver: '0.0.0.1',
            prompt: '',
            meta: {
                music: {
                    app_type: 1,
                    appid: 0,
                    desc: '',
                    jumpUrl: '',
                    musicUrl: '',
                    preview: '',
                    sourceMsgId: '0',
                    source_icon: '',
                    source_url: '',
                    tag: '',
                    title: ''
                }
            },
            config: {type: 'normal', forward: true}
        }
        let music = music_json.meta.music

        let appid, app_name, app_icon
        switch (data.source) {
            case 'netease':
                appid = 100495085
                app_name = '网易云音乐'
                app_icon = 'https://i.gtimg.cn/open/app_icon/00/49/50/85/100495085_100_m.png'

                break
            case 'kuwo':
                appid = 100243533
                app_name = '酷我音乐'
                app_icon = 'https://p.qpic.cn/qqconnect/0/app_100243533_1636374695/100?max-age=2592000&t=0'
                break
            case 'kugou':
                appid = 205141
                app_name = '酷狗音乐'
                app_icon = 'https://open.gtimg.cn/open/app_icon/00/20/51/41/205141_100_m.png?t=0'
                break
            case 'qq':
            default:
                appid = 100497308
                app_name = 'QQ音乐'
                app_icon = 'https://p.qpic.cn/qqconnect/0/app_100497308_1626060999/100?max-age=2592000&t=0'
                break
        }

        let title = data.name;
        let singer = data.artist;
        let prompt = '[分享]';
        let jumpUrl;
        let preview;
        let musicUrl

        let types = []
        if (data.url == null) {
            types.push('url')
        }
        ;
        if (data.pic == null) {
            types.push('pic')
        }
        ;
        if (data.link == null) {
            types.push('link')
        }
        ;
        if (types.length > 0 && typeof (data.api) == 'function') {
            let {url, pic, link} = await data.api(data.data, types)
            if (url) {
                data.url = url
            }
            if (pic) {
                data.pic = pic
            }
            if (link) {
                data.link = link
            }
        }

        typeof (data.url) == 'function' ? musicUrl = await data.url(data.data) : musicUrl = data.url
        typeof (data.pic) == 'function' ? preview = await data.pic(data.data) : preview = data.pic
        typeof (data.link) == 'function' ? jumpUrl = await data.link(data.data) : jumpUrl = data.link

        data.url = musicUrl

        if (typeof (musicUrl) != 'string' || musicUrl == '') {
            musicUrl = ''
        }

        if (data.prompt) {
            prompt = '[分享]' + data.prompt
        } else {
            prompt = '[分享]' + title + '-' + singer
        }

        app_name = data.app_name || app_name
        if (typeof (data.config) == 'object') music_json.config = data.config

        music.appid = appid
        music.desc = singer
        music.jumpUrl = jumpUrl
        music.musicUrl = musicUrl
        music.preview = preview
        music.title = title
        music.appid = appid
        music.tag = `${app_name}`
        music.source_icon = app_icon
        music_json.prompt = prompt
        if (!musicUrl) {
            music_json.view = 'news'
            music_json.meta.news = music_json.meta.music
            delete music_json.meta.music
        }
        return music_json
    }

    factory.CreateMusicShare = async function (e, data, to_uin = null) {
        let type = 'qq'
        switch (data.source) {
            case 'bilibili':
                throw new Error('not supported yet')
            case 'netease':
                type = '163'
                break
            case 'kuwo':
                throw new Error('not supported yet')
            case 'kugou':
                throw new Error('not supported yet')
            case 'migu':
                throw new Error('not supported yet')
            case 'qq':
            default:
                break
        }
        // return segment.music(data.data.id, type)
        // todo JSON消息shamrock那边还有问题
        // todo 支持custom类型的music消息
        return {
            type: "music",
            data: {
                type,
                id: data.data.id
            }
        }
    }

    factory.SendMusicShare = async function (body, e) {
        await e.reply(body)
    }

    factory.get_netease_userinfo = async function (ck = null) {
        try {
            let url = 'https://interface.music.163.com/api/nuser/account/get'
            let options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Cookie: ck || music_cookies.netease.ck
                }
            }

            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json()
            if (res?.code == '200' && res.profile) {
                let profile = res.profile
                let account = res.account
                return {
                    code: 1,
                    data: {
                        userid: profile.userId,
                        nickname: profile.nickname,
                        is_vip: account?.vipType != 0
                    }
                }
            }
        } catch (err) {
        }
        return {code: -1}
    }

    factory.get_qqmusic_userinfo = async function (ck = null) {
        try {
            let url = `https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg?_=${new Date().getTime()}&cv=4747474&ct=24&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&uin=0&g_tk_new_20200303=5381&g_tk=5381&cid=205360838&userid=0&reqfrom=1&reqtype=0&hostUin=0&loginUin=0`
            let cookies = []
            ck = ck || music_cookies.qqmusic.ck

            for (let key of ck.keys()) {
                let value = ck.get(key)
                if (value) {
                    cookies.push(`${key}=${value}`)
                }
            }

            let options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Cookie: cookies.join('; ')
                }
            }

            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json()
            if (res?.code == '0' && res.data?.creator) {
                let creator = res.data.creator
                return {
                    code: 1,
                    data: {
                        userid: ck.get('uin') || ck.get('wxuin'),
                        nickname: creator.nick,
                        is_vip: await factory.is_qqmusic_vip(ck.get('uin') || ck.get('wxuin'))
                    }
                }
            }
        } catch (err) {
        }
        return {code: -1}
    }

    factory.is_qqmusic_vip = async function (uin, cookies = null) {
        let json = {
            comm: {
                cv: 4747474,
                ct: 24,
                format: 'json',
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'yqq.json',
                needNewCode: 1,
                uin: 0,
                g_tk_new_20200303: 5381,
                g_tk: 5381
            },
            req_0: {
                module: 'userInfo.VipQueryServer',
                method: 'SRFVipQuery_V2',
                param: {
                    uin_list: [uin]
                }
            }
        }

        let options = {
            method: 'POST', // post请求
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: cookies || Bot.cookies['y.qq.com']
            },
            body: JSON.stringify(json)
        }

        let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
        try {
            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json()
            if (res.req_0 && res.req_0?.code == '0') {
                let data = res.req_0.data?.infoMap?.[uin]
                if (data.iVipFlag == 1 || data.iSuperVip == 1 || data.iNewVip == 1 || data.iNewSuperVip == 1) {
                    return true
                }
            }
        } catch (err) {
        }
        return false
    }

    factory.kugou_search = async function (search, page = 1, page_size = 10) {
        try {
            let url = `http://msearchcdn.kugou.com/api/v3/search/song?page=${page}&pagesize=${page_size}&keyword=${encodeURI(search)}`
            let response = await fetch(url, {method: 'get'}) // 调用接口获取数据
            let res = await response.json() // 结果json字符串转对象
            if (!res.data || res.data.info < 1) {
                return []
            }
            return {page, data: res.data.info}
        } catch (err) {
        }

        return null
    }

    factory.qqmusic_refresh_token = async function (cookies, type) {
        let result = {code: -1}
        let json_body = {
            ...music_cookies.qqmusic.body,
            req_0: {
                method: 'Login',
                module: 'music.login.LoginServer',
                param: {
                    access_token: '',
                    expired_in: 0,
                    forceRefreshToken: 0,
                    musicid: 0,
                    musickey: '',
                    onlyNeedAccessToken: 0,
                    openid: '',
                    refresh_token: '',
                    unionid: ''
                }
            }
        }
        let req_0 = json_body.req_0
        if (type == 0) {
            req_0.param.appid = 100497308
            req_0.param.access_token = cookies.get('psrf_qqaccess_token') || ''
            req_0.param.musicid = Number(cookies.get('uin') || '0')
            req_0.param.openid = cookies.get('psrf_qqopenid') || ''
            req_0.param.refresh_token = cookies.get('psrf_qqrefresh_token') || ''
            req_0.param.unionid = cookies.get('psrf_qqunionid') || ''
        } else if (type == 1) {
            req_0.param.strAppid = 'wx48db31d50e334801'
            req_0.param.access_token = cookies.get('wxaccess_token') || ''
            req_0.param.str_musicid = cookies.get('wxuin') || '0'
            req_0.param.openid = cookies.get('wxopenid') || ''
            req_0.param.refresh_token = cookies.get('wxrefresh_token') || ''
            req_0.param.unionid = cookies.get('wxunionid') || ''
        } else {
            return result
        }
        req_0.param.musickey = (cookies.get('qqmusic_key') || cookies.get('qm_keyst')) || ''

        let options = {
            method: 'POST', // post请求
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: JSON.stringify(json_body)
        }

        let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
        try {
            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json() // 结果json字符串转对象
            if (res.req_0?.code == '0') {
                let map = new Map()
                let data = res.req_0?.data
                if (type == 0) {
                    map.set('psrf_qqopenid', data.openid)
                    map.set('psrf_qqrefresh_token', data.refresh_token)
                    map.set('psrf_qqaccess_token', data.access_token)
                    map.set('psrf_access_token_expiresAt', data.expired_at)
                    map.set('uin', String(data.str_musicid || data.musicid) || '0')
                    map.set('qqmusic_key', data.musickey)
                    map.set('qm_keyst', data.musickey)
                    map.set('psrf_musickey_createtime', data.musickeyCreateTime)
                    map.set('psrf_qqunionid', data.unionid)
                    map.set('euin', data.encryptUin)
                    map.set('login_type', 1)
                    map.set('tmeLoginType', 2)
                    result.code = 1
                    result.data = map
                } else if (type == 1) {
                    map.set('wxopenid', data.openid)
                    map.set('wxrefresh_token', data.refresh_token)
                    map.set('wxaccess_token', data.access_token)
                    map.set('wxuin', String(data.str_musicid || data.musicid) || '0')
                    map.set('qqmusic_key', data.musickey)
                    map.set('qm_keyst', data.musickey)
                    map.set('psrf_musickey_createtime', data.musickeyCreateTime)
                    map.set('wxunionid', data.unionid)
                    map.set('euin', data.encryptUin)
                    map.set('login_type', 2)
                    map.set('tmeLoginType', 1)
                    result.code = 1
                    result.data = map
                }
            }
        } catch (err) {
            logger.error(err)
        }
        return result
    }

    factory.qqmusic_GetTrackInfo = async function (ids) {
        try {
            let json_body = {
                ...JSON.parse(JSON.stringify(music_cookies.qqmusic.body)),
                req_0: {module: 'track_info.UniformRuleCtrlServer', method: 'GetTrackInfo', param: {}}
            }
            let types = []
            for (let i in ids) {
                ids[i] = parseInt(ids[i])
                types.push(200)
            }
            json_body.req_0.param = {
                ids,
                types
            }
            let options = {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: JSON.stringify(json_body)
            }

            let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
            let response = await fetch(url, options)
            let res = await response.json()

            if (res.code != '0' && res.req_0.code != '0') {
                return null
            }

            let data = res.req_0?.data?.tracks
            data = data || []
            return {page: 0, data}
        } catch (err) {
        }
        return null
    }

    factory.qqmusic_recommend = async function (uin, page_size) {
        try {
            let json_body = {
                comm: {g_tk: 5381, uin, format: 'json', ct: 20, cv: 1803, platform: 'wk_v17'},
                req_0: {
                    module: 'recommend.RecommendFeedServer',
                    method: 'get_recommend_feed',
                    param: {direction: 1, page: 1, v_cache: [], v_uniq: [], s_num: 0}
                }
            }
            json_body.comm.guid = md5(String(new Date().getTime()))
            json_body.comm.uin = uin
            json_body.comm.tmeLoginType = 2
            json_body.comm.psrf_qqunionid = ''
            json_body.comm.authst = ''
            let options = {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: JSON.stringify(json_body)
            }

            let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
            let response = await fetch(url, options)
            let res = await response.json()

            if (res.code != '0' && res.req_0.code != '0') {
                return null
            }
            let v_card = []
            for (let v_shelf of res.req_0?.data?.v_shelf) {
                if (v_shelf.style == 1) {
                    for (let v_niche of v_shelf.v_niche) {
                        v_card = v_card.concat(v_niche.v_card)
                    }
                }
            }

            let ids = []
            for (let val of v_card) {
                if (ids.length >= page_size) break
                ids.push(val.id)
            }

            return await qqmusic_GetTrackInfo(ids)
        } catch (err) {
        }
        return null
    }

    factory.qqmusic_radio = async function (uin, page_size) {
        try {
            let json_body = {
                ...JSON.parse(JSON.stringify(music_cookies.qqmusic.body)),
                req_0: {method: 'get_radio_track', module: 'pc_track_radio_svr', param: {id: 99, num: 1}}
            }
            json_body.comm.guid = md5(String(new Date().getTime()))
            json_body.comm.uin = uin
            json_body.comm.tmeLoginType = 2
            json_body.comm.psrf_qqunionid = ''
            json_body.comm.authst = ''
            json_body.req_0.param.num = page_size

            let options = {
                method: 'POST', // post请求
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: JSON.stringify(json_body)
            }

            let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json() // 结果json字符串转对象

            if (res.code != '0' && res.req_0.code != '0') {
                return null
            }

            let data = res.req_0?.data?.tracks
            data = data || []
            return {page: 0, data}
        } catch (err) {
        }

        return null
    }

    factory.qqmusic_getdiss = async function (uin = 0, disstid = 0, dirid = 202, page = 1, page_size = 30) {
        try {
            let json_body = {
                ...JSON.parse(JSON.stringify(music_cookies.qqmusic.body)),
                req_0: {
                    module: 'srf_diss_info.DissInfoServer',
                    method: 'CgiGetDiss',
                    param: {
                        disstid: 0,
                        dirid: 202,
                        onlysonglist: 0,
                        song_begin: 0,
                        song_num: 500,
                        userinfo: 1,
                        pic_dpi: 800,
                        orderlist: 1
                    }
                }
            }
            json_body.comm.guid = md5(String(new Date().getTime()))
            json_body.comm.uin = uin
            json_body.comm.tmeLoginType = 2
            json_body.comm.psrf_qqunionid = ''
            json_body.comm.authst = ''
            json_body.req_0.param.song_num = page_size
            json_body.req_0.param.song_begin = ((page < 1 ? 1 : page) * page_size) - page_size
            json_body.req_0.param.disstid = disstid
            json_body.req_0.param.dirid = dirid

            let options = {
                method: 'POST', // post请求
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: JSON.stringify(json_body)
            }

            let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json() // 结果json字符串转对象

            if (res.code != '0' && res.req_0.code != '0') {
                return null
            }

            let dirinfo = res.req_0?.data?.dirinfo || {}
            let data = res.req_0?.data?.songlist
            data = data || []
            return {title: dirinfo.title, desc: dirinfo.desc, page, data}
        } catch (err) {
        }

        return null
    }

    factory.bilibili_search = async function (search, page = 1, page_size = 10) {
        try {
            let url = `https://api.bilibili.com/x/web-interface/wbi/search/type?__refresh__=true&_extra=&context=&page=${page}&page_size=${page_size}&from_source=&from_spmid=333.337&platform=pc&highlight=1&single_column=0&keyword=${encodeURI(search)}&qv_id=CAwC63KwwHyP6q4IJlnV2afQ6clyM87r&ad_resource=5654&source_tag=3&gaia_vtoken=&category_id=&search_type=video&dynamic_offset=0&wts=1678977993`
            let options = {
                method: 'GET', // post请求
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Referer: 'https://search.bilibili.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1661.41',
                    Cookie: 'buvid3=A40E384B-1E77-B3F8-0FA6-8177143B71DB09209infoc'
                }
            }
            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json() // 结果json字符串转对象

            if (!res.data?.result || res.data?.result.length < 1) {
                return null
            }
            return {page, data: res.data?.result}
        } catch (err) {
        }

        return null
    }

    factory.qqmusic_search = async function (search, page = 1, page_size = 10) {
        try {
            let qq_search_json = {
                comm: {
                    _channelid: '19',
                    _os_version: '6.2.9200-2',
                    authst: '',
                    ct: '19',
                    cv: '1891',
                    guid: md5(String(new Date().getTime()) + random(100000, 999999)),
                    patch: '118',
                    psrf_access_token_expiresAt: 0,
                    psrf_qqaccess_token: '',
                    psrf_qqopenid: '',
                    psrf_qqunionid: '',
                    tmeAppID: 'qqmusic',
                    tmeLoginType: 2,
                    uin: '0',
                    wid: '0'
                },
                search: {
                    method: 'DoSearchForQQMusicDesktop',
                    module: 'music.search.SearchCgiService',
                    param: {
                        grp: 1,
                        num_per_page: 40,
                        page_num: 1,
                        query: '',
                        remoteplace: 'sizer.newclient.song',
                        search_type: 0,
                        searchid: ''
                    }
                }
            }

            qq_search_json.search.param.searchid = md5(String(new Date().getTime()) + random(100000, 999999))
            qq_search_json.search.param.query = search
            qq_search_json.search.param.page_num = page
            qq_search_json.search.param.num_per_page = page_size

            let options = {
                method: 'POST', // post请求
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Cookie: Bot.cookies['y.qq.com']
                },
                body: JSON.stringify(qq_search_json)
            }

            let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg'

            let response = await fetch(url, options) // 调用接口获取数据

            let res = await response.json() // 结果json字符串转对象

            if (res.code != '0') {
                return null
            }
            return {page, data: res.search.data.body.song.list}
        } catch (err) {
        }

        return null
    }

    factory.netease_search = async function (search, page = 1, page_size = 10) {
        try {
            let offset = page < 1 ? 0 : page
            offset = (page_size * page) - page_size
            let url = 'http://music.163.com/api/cloudsearch/pc'
            let options = {
                method: 'POST', // post请求
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Cookie: music_cookies.netease.ck
                },
                body: `offset=${offset}&limit=${page_size}&type=1&s=${encodeURI(search)}`
            }

            let response = await fetch(url, options) // 调用接口获取数据
            let res = await response.json() // 结果json字符串转对象

            if (res.result.songs < 1) {
                return null
            }
            return {page, data: res.result.songs}
        } catch (err) {
        }

        return null
    }

    factory.kuwo_search = async function (search, page = 1, page_size = 10) {
        try {
            let url = `http://search.kuwo.cn/r.s?user=&android_id=&prod=kwplayer_ar_10.1.2.1&corp=kuwo&newver=3&vipver=10.1.2.1&source=kwplayer_ar_10.1.2.1_40.apk&p2p=1&q36=&loginUid=&loginSid=&notrace=0&client=kt&all=${search}&pn=${page - 1}&rn=${page_size}&uid=&ver=kwplayer_ar_10.1.2.1&vipver=1&show_copyright_off=1&newver=3&correct=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&searchapi=5&issubtitle=1&province=&city=&latitude=&longtitude=&userIP=&searchNo=&spPrivilege=0`
            let response = await fetch(url, {method: 'get'}) // 调用接口获取数据
            let res = await response.json() // 结果json字符串转对象
            if (res.abslist.length < 1) {
                return null
            }
            return {page, data: res.abslist}
        } catch (err) {
        }

        return null
    }


}

function random(min, max) {
    // 如生成3位的随机数就定义100-999；
    // const max = 100;
    // const min = 999;
    // 生成6位的随机数就定义100000-999999之间
    // const min    = 100000;                            //最小值
    // const max    = 999999;                            //最大值
    const range = max - min // 取值范围差
    const random = Math.random() // 小于1的随机数
    const result = min + Math.round(random * range) // 最小数加随机数*范围差
    // ————————————————
    // 版权声明：本文为CSDN博主「浪里龙小白丶」的原创文章，遵循CC 4.0 BY-SA版权协议，转载请附上原文出处链接及本声明。
    // 原文链接：https://blog.csdn.net/m0_51317381/article/details/124499851
    return result
}

/*
      休眠函数sleep
      调用 await sleep(1500)
       */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function upload_image(file) {
    return (await Bot.pickFriend(Bot.uin)._preprocess(segment.image(file))).imgs[0]
}

export class xiaofei_music extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: '小飞插件_点歌_Shamrock',
            /** 功能描述 */
            dsc: '',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1999,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: music_reg,
                    /** 执行方法 */
                    fnc: 'music'
                }
            ]
        })

        try {
            let setting = Config.getdefSet('setting', 'system') || {}
            this.priority = setting.music == true ? 10 : 2000
        } catch (err) {
        }
    }

    init() {
        new Promise(async (resolve, reject) => {
            try {
                for (let key in music_cookies) {
                    let ck = music_cookies[key].ck
                    if (key == 'netease' && (!ck || ck?.includes('MUSIC_U=;'))) {
                        logger.info('【小飞插件_网易云音乐ck】未设置网易云音乐ck！')
                    }
                }
                await factory.update_qqmusic_ck()
            } catch (err) {
            }

            try {
                let path = `${process.cwd()}/data/html/xiaofei-plugin/music_list`
                let files = fs.readdirSync(path)
                files.forEach(file => {
                    fs.unlink(`${path}/${file}`, err => {
                    })
                })
            } catch (err) {
            }
            resolve()
        })
    }

    async music_task() {
        let data = xiaofei_plugin_shamrock.music_temp_data
        for (let key in data) {
            if ((new Date().getTime() - data[key].time) > _music_timeout) {
                let temp = data[key]
                delete data[key]
                await factory.recallMusicMsg(key, temp.msg_results)
            }
        }
        try {
            await factory.update_qqmusic_ck()
        } catch (err) {
            logger.error(err)
        }
    }

    async music() {
        if (!Config || this.e.adapter !== 'shamrock' || !factory.music_message) {
            return false
        }
        return factory.music_message(this.e)
    }

    /** 接受到消息都会先执行一次 */
    accept() {
        if (/^#?(小飞语音|小飞高清语音|小飞歌词|语音|高清语音|歌词|下载音乐)?(\d+)?$/.test(this.e.msg)) {
            try { factory.music_message(this.e) } catch { }
        }
    }
}
