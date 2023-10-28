import fs from "fs"
const _path = process.cwd() + "/plugins/Lain-plugin/config"

try {
    /** 覆盖apps.js */
    fs.copyFileSync(_path + "/defSet/apps.js", "./apps.js")
    console.log("成功生成 apps.js，您现在可以通过 node apps 来跳过登录QQ启动喵崽")
} catch (error) {
    console.error("生成错误", error)
}