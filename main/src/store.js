/*
 * @Description: 
 * @Autor: zengbotao@myhexin.com
 * @Date: 2022-08-11 19:18:14
 * @LastEditors: 
 * @LastEditTime: 2022-08-19 10:17:23
 */
import { initGlobalState } from 'qiankun' 
// 1、主应用使用 qiankun 内置函数 initGlobalState，设置全局变量
import Vue from 'vue'

// 2、父应用的初始state
// Vue.observable是为了让initialState变成可响应：https://cn.vuejs.org/v2/api/#Vue-observable。
const initialState = Vue.observable({
  user: {
    name: 'zhangsan'
  }
})

const actions = initGlobalState(initialState)

// 父子  子应用在 mount 函数中接受 props 参数,通过 onGlobalStateChange 函数监听主应用传递过来的值
// export async function mount(props) {
//   // 使用 Vue 原型属性
//   Vue.prototype.parentStore = props
//   props.onGlobalStateChange((state) => {
//     console.log('子应用接受的主应用数据')
//     console.log(state)
//   }, true);
//   render(props);
// }


//3、子应用向主应用传值 主应用设置 onGlobalStateChange 监听全局数据状态变化，也就是下面部分。
actions.onGlobalStateChange((newState, prev) => {
  // state: 变更后的状态; prev 变更前的状态
  console.log('main change', JSON.stringify(newState), JSON.stringify(prev))

  for (const key in newState) {
    initialState[key] = newState[key]
  }
})

//子应用向主应用传值
//子应用使用 setGlobalState 更新全局状态数据
// parentStore 为 `mount` 中设置到 Vue 原型属性中的值
// this.parentStore.setGlobalState({
//   lang: 'ZN'
// })

// 定义一个获取state的方法下发到子应用；是为了下发到子应用
actions.getGlobalState = (key) => {
  // 有key，表示取globalState下的某个子级对象
  // 无key，表示取全部

  return key ? initialState[key] : initialState
}

export default actions
