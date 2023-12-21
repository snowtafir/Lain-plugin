/** 正则编写，参考插件编写 */
export let MDButton = [
  {
    reg: '^#这是一个示例帮助',
    fnc: 'test'
  }
]

/** 对应按钮 */
export function test () {
  return [
    {
      type: 'button',
      buttons: [
        {
          id: '9',
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
          id: '9',
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
