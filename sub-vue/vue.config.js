/*
 * @Description: 
 * @Autor: zengbotao@myhexin.com
 * @Date: 2022-08-11 19:18:14
 * @LastEditors: 
 * @LastEditTime: 2022-08-19 10:16:59
 */
const { name } = require('../package.json')

module.exports = {
  publicPath: '/subapp/sub-vue',//注意不要配错了，容易和主目录的混淆
  transpileDependencies: ['common'],
  lintOnSave:false,
  chainWebpack: config => config.resolve.symlinks(false),
  configureWebpack: {
    output: {
      // 把子应用打包成 umd 库格式
      library: `${name}-[name]`,//库名，与主应用注册的微应用name保持一致
      libraryTarget: 'umd',//UMD，一种javascript打包模式，让你打包好的代码模块能被主应用访问
      jsonpFunction: `webpackJsonp_${name}`
    }
  },
  devServer: {
    port: process.env.VUE_APP_PORT,
    headers: {
      'Access-Control-Allow-Origin': '*' //子应用开启跨域
    }
  }
}
// 在webpack打包增加如下配置使主应用能正确识别微应用暴露出来的一些信息
