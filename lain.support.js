export default class Button {
  constructor () {
    this.plugin = {
      // 插件名称
      name: '状态按钮',
      // 描述
      dsc: '状态按钮',
      // 优先级
      priority: 100,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '#状态',
          /** 执行方法 */
          fnc: 'state'
        }
      ]
    }
  }

  state (e) {
    // e是接收消息，经喵崽处理过的，插件会原封不动传递过来，供开发者使用。
    return [
      {
        type: 'button',
        buttons: [
          {
            id: '1',
            render_data: {
              label: '角色1面板',
              visited_label: '角色1面板'
            },
            action: {
              type: 2,
              permission: {
                type: 2
              },
              data: '/角色1面板',
              at_bot_show_channel_list: false
            }
          }
        ]
      },
      {
        type: 'button',
        buttons: [
          {
            id: '2',
            render_data: {
              label: '角色1面板',
              visited_label: '角色1面板'
            },
            action: {
              type: 2,
              permission: {
                type: 2
              },
              data: '/角色1面板',
              at_bot_show_channel_list: false
            }
          }
        ]
      }
    ]
  }
}
