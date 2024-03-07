export default class Button {
  constructor () {
    this.plugin = {
      name: 'Lain-plugin',
      dsc: '铃音插件',
      priority: 99,
      rule: [
        {
          reg: '^#?(id|ID)',
          fnc: 'Id'
        }
      ]
    }
  }

  Id (e) {
    const button = [
      { label: '群聊ID', data: `${e.group_id}` },
      { label: '用户ID', data: `${e.user_id}` }
    ]
    return Bot.Button(button)
  }
}
