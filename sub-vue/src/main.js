/*
 * @Description: 
 * @Autor: zengbotao@myhexin.com
 * @Date: 2022-08-11 19:18:14
 * @LastEditors: 
 * @LastEditTime: 2022-08-19 10:16:53
 */
import './public-path'//3、 window.__POWERED_BY_QIANKUN__ 乾坤的内置变量，判断是在父级还是在子级
import Vue from 'vue'
import App from './App.vue'//6、注意组件一定要渲染进去
import routes from './router'
import { store as commonStore } from '../../common'
import store from './store'
import VueRouter from 'vue-router'

Vue.config.productionTip = false
let instance = null
console.log(commonStore)

//3、 window.__POWERED_BY_QIANKUN__ 乾坤的内置变量，判断是在父级还是在子级
function render (props = {}) {
  const { container, routerBase } = props
  const router = new VueRouter({
    base: window.__POWERED_BY_QIANKUN__ ? routerBase : process.env.BASE_URL,
    mode: 'history',
    routes
  })//4、注册不同环境下的路由对象

  instance = new Vue({
    router,
    store,
    render: (h) => h(App)//6、注意组件一定要渲染进去
  }).$mount(container ? container.querySelector('#app') : '#app')
  //5、看看是否挂载到container的#app还是主目录的#app；function mount
}



if (!window.__POWERED_BY_QIANKUN__) {
  // 2、 默认独立运行,这里是子应用独立运行的环境，实现子应用的登录逻辑,
  //注意有2个render()出口

  // 独立运行时，也注册一个名为global的store module
  commonStore.globalRegister(store)
  // 模拟登录后，存储用户信息到global module
  const userInfo = { name: '我是独立运行时名字叫张三' } // 假设登录后取到的用户信息
  store.commit('global/setGlobalState', { user: userInfo })

  render()
}

export async function bootstrap () {
  console.log('[vue] vue app bootstraped')
}

export async function mount (props) {
  // 注意，这里有props
  console.log('[vue] props from main framework', props)

  commonStore.globalRegister(store, props)

  // 1、并不是一上来就加载子应用，需要在调用mount方法时判断（2），再进行加载；
  // 是否重新加载和挂载
  render(props)
}

export async function unmount () {
  instance.$destroy()
  instance.$el.innerHTML = ''
  instance = null
}
