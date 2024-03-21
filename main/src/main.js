/*
 * @Description:
 * @Autor: zengbotao@myhexin.com
 * @Date: 2022-08-14 09:50:41
 * @LastEditTime: 2022-08-19 10:28:34
 */
import Vue from 'vue'
import App from './App.vue'
import { registerMicroApps, start, setDefaultMountApp } from 'qiankun'
import microApps from './micro-app'
import 'nprogress/nprogress.css'//vue使用nprogress页面加载进度条https://blog.csdn.net/adz41455/article/details/101648624

Vue.config.productionTip = false

const instance = new Vue({
  render: h => h(App)
}).$mount('#app')

// 4、定义loader方法，loading改变时，将变量赋值给App.vue的data中的isLoading
function loader (loading) {
  if (instance && instance.$children) {
    // instance.$children[0] 是App.vue，此时直接改动App.vue的isLoading 
    instance.$children[0].isLoading = loading
  }
}

// 3、给子应用配置加上loader方法
const apps = microApps.map(item => {
  return {
    ...item,
    loader
  }
})

// registerMicroApps(apps, lifeCycles?)
// apps - Array<RegistrableApp> - 必选，微应用的一些注册信息
// lifeCycles - LifeCycles - 可选，全局的微应用生命周期钩子
registerMicroApps(apps, {
  beforeLoad: app => {
    console.log('before load app.name====>>>>>', app.name)
  },
  beforeMount: [
    app => {
      console.log('[LifeCycle] before mount %c%s', 'color: green;', app.name)
    }
  ],
  afterMount: [
    app => {
      console.log('[LifeCycle] after mount %c%s', 'color: green;', app.name)
    }
  ],
  afterUnmount: [
    app => {
      console.log('[LifeCycle] after unmount %c%s', 'color: green;', app.name)
    }
  ]
})
setDefaultMountApp('/sub-vue')
// 设置主应用启动后默认进入的微应用。


// 在 qiankun 中，frameworkStartedDefer 是一个用于控制主应用启动时机的 Promise 对象。
// 当主应用启动时，它会在加载和初始化微应用之前等待 frameworkStartedDefer Promise 对象的解决（即 Promise 对象被 resolve 或 reject）。
// 只有当 frameworkStartedDefer Promise 对象被解决后，主应用才会继续加载和初始化微应用。
// const frameworkStartedDefer = new Promise((resolve, reject) => {
//   // 执行一些异步操作，例如获取用户信息、初始化权限等
//   // 在操作完成后，调用 resolve 或 reject 解决 Promise 对象
//   // 这里使用 setTimeout 模拟异步操作
//   setTimeout(() => {
//     resolve();
//   }, 2000);
// });

// // 在异步操作完成后，启动主应用和微应用
// frameworkStartedDefer.then(() => {
//   start();
// });


start({
  prefetch: false ,// 可选，关闭预加载
  singular: true, // 可选，是否为单实例场景，单实例指的是同一时间只会渲染一个微应用。默认为 true。
})
//https://www.jianshu.com/p/36f415bd2cbe?u_atoken=ecdca6fd-3682-4a3d-a5f9-5d2d297a311d&u_asession=01niLjQ_8GmCIMoxFl8UcBSlAYMeGH5PYy4vnB9tMx7zAh3z3Xcu64GQC_TLCcCsBkX0KNBwm7Lovlpxjd_P_q4JsKWYrT3W_NKPr8w6oU7K9gDkkTe_UE5h0fvPtQYbCF3TYvls7v_Epik-OyKXq1TWBkFo3NEHBv0PZUm6pbxQU&u_asig=05EMpCYTQwkHLvyfViyF1-fCLpcWYddFY6tpcXMSXTKAdvw6YCDs97fkjRbEp1TNf8J3iBO2Yd5QRmQFR4FaGt-0Mk1Ms7lD-NYzohGifQRCJCRdYuzu8Ce6OHR-iKZeyehqxjAnhtsbOUypRsl-P5kFPnQdvlVhm89LlvY_DB6iT9JS7q8ZD7Xtz2Ly-b0kmuyAKRFSVJkkdwVUnyHAIJze3RE1ntwYkKqNHeHJB2_-HS2aHbC-j6s9AKLGIAgezByZo170oZzfjmGNwwqqFezu3h9VXwMyh6PgyDIVSG1W_pnTxhH6JR2unybJMzzvld4dzCexi7SaZALAJLfqPnqNvlWf9IFP3anJp16u3uzhUwnGIWcT1o0NwzGLhZQwP6mWspDxyAEEo4kbsryBKb9Q&u_aref=FPMaANHYGPqfs9FSIFxz35rbS%2BI%3D

// start里面说可以配置沙箱，默认情况下沙箱可以确保单实例场景子应用之间的样式隔离，但是无法确保主应用跟子应用、或者多实例场景的子应用样式隔离。


// 注意问题
// 1.样式隔离问题
// 2.Js隔离问题
// 3.路由跳转问题：子项目跳转到另一个子项目
// 4.通信问题：主应用与微应用的通信；微应用之间的通信； Actions 通信
// 5.主项目路由模式如何选择
// 由于 `qiankun` 是通过 `location.pathname` 值来判断当前应该加载哪个子项目的，所以需要给每个子项目注入不同的路由 `path`，而 `hash` 模式子项目路由跳转不改变 `path`，所以无影响，`history` 模式子项目路由设置 `base` 属性即可。

// 6.微应用打包之后 css 中的字体文件和图片加载 404
// 7.qiankun 是否兼容 ie
// 8.全局状态管理
//https://www.jianshu.com/p/36f415bd2cbe?u_atoken=ecdca6fd-3682-4a3d-a5f9-5d2d297a311d&u_asession=01niLjQ_8GmCIMoxFl8UcBSlAYMeGH5PYy4vnB9tMx7zAh3z3Xcu64GQC_TLCcCsBkX0KNBwm7Lovlpxjd_P_q4JsKWYrT3W_NKPr8w6oU7K9gDkkTe_UE5h0fvPtQYbCF3TYvls7v_Epik-OyKXq1TWBkFo3NEHBv0PZUm6pbxQU&u_asig=05EMpCYTQwkHLvyfViyF1-fCLpcWYddFY6tpcXMSXTKAdvw6YCDs97fkjRbEp1TNf8J3iBO2Yd5QRmQFR4FaGt-0Mk1Ms7lD-NYzohGifQRCJCRdYuzu8Ce6OHR-iKZeyehqxjAnhtsbOUypRsl-P5kFPnQdvlVhm89LlvY_DB6iT9JS7q8ZD7Xtz2Ly-b0kmuyAKRFSVJkkdwVUnyHAIJze3RE1ntwYkKqNHeHJB2_-HS2aHbC-j6s9AKLGIAgezByZo170oZzfjmGNwwqqFezu3h9VXwMyh6PgyDIVSG1W_pnTxhH6JR2unybJMzzvld4dzCexi7SaZALAJLfqPnqNvlWf9IFP3anJp16u3uzhUwnGIWcT1o0NwzGLhZQwP6mWspDxyAEEo4kbsryBKb9Q&u_aref=FPMaANHYGPqfs9FSIFxz35rbS%2BI%3D