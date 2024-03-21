/*
 * @Description: 
 * @Autor: zengbotao@myhexin.com
 * @Date: 2022-08-11 19:18:14
 * @LastEditors: 
 * @LastEditTime: 2022-08-19 10:17:11
 */
import store from './store'
// 1、microApps.entry
// 配置为字符串时，表示微应用的访问地址，例如 https://qiankun.umijs.org/guide/。
// 配置为对象时，html 的值是微应用的 html 内容字符串如 '<span>子应用<span>'，而不是微应用的访问地址。微应用的 publicPath 将会被设置为 /。

// 2、activeRule - string |function (location)-必选，浏览器 url 发生变化会调用 activeRule 里的规则，当配置为字符串时会直接跟 url 中的路径部分做前缀匹配，匹配成功表明当前应用会被激活
// 为函数时，函数会传入当前location作为参数，包含当前的请求路径等信息，根据函数返回值判断是否激活，如location.pathname.startsWith('/app1')

const microApps = [
  {
    name: 'sub-vue',//string - 必选，微应用的名称，微应用之间必须确保唯一。
    entry: process.env.VUE_APP_SUB_VUE,// string | html - 必选，微应用的入口。
    activeRule: '/sub-vue'
  },
  {
    name: 'sub-react',
    entry: process.env.VUE_APP_SUB_REACT,
    activeRule: '/sub-react'
  }
]

const apps = microApps.map(item => {
  return {
    ...item,
    container: '#subapp-viewport', // 子应用挂载的div
    props: {
      routerBase: item.activeRule, // 下发基础路由
      getGlobalState: store.getGlobalState // 下发getGlobalState方法，下发获取初始全局数据方法
    }
  }
})

export default apps
