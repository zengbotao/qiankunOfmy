module.exports = {
  publicPath: "/subapp/micro/main",
  outputDir:'main',
  transpileDependencies: ["common"],
  lintOnSave: false,
  configureWebpack: {
    output: {
      // 把子应用打包成 umd 库格式
      library: `main-[name]`, //库名，与主应用注册的微应用name保持一致
      libraryTarget: "umd", //UMD，一种javascript打包模式，让你打包好的代码模块能被主应用访问
      jsonpFunction: `webpackJsonp_main`
    }
  },
  chainWebpack: config => {
    config.plugin("html").tap(args => {
      args[0].title = "qiankun-example";
      return args;
    });
    config.resolve.symlinks(false);
  }
};
