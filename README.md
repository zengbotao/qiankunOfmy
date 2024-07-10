
# 微前端qiankun 



# 介绍
示例源码与笔记
[微前端qiankun从搭建到部署的实践](https://juejin.im/post/6875462470593904653)

[qiankun 微前端方案实践及总结](https://juejin.cn/post/6844904185910018062#heading-18)

[qiankun 微前端实践总结（二）](https://juejin.cn/post/6856569463950639117)

https://github.com/zengbotao/qiankun-example

## 开始
安装根目录工程依赖

qiankun 是基于 single-spa 做了二次封装的微前端框架，解决了 single-spa 的一些弊端和不足。

在非Umijs中的乾坤案例

qiankun 实战 demo，父应用 vue，子应用使用 `react`, `vue` 和 `原生HTML`。

## 为什么要在 single-spa 上封装

single-spa 作为一个基础的微前端框架，它主要提供了以下两个能力

1. 加载子应用的**入口**，注意这里是入口，加载子应用的方法还是需要二次开发的
2. 维护子应用和路由的状态，包括子应用的初始化、挂载和卸载，同时也监听了路由的变化来切换子应用

那我们通常接入 single-spa 会做以下几个步骤

1. 路由区分，因为我们需要区分不同的子应用，一般是通过添加路由前缀实现的
2. 入口改造，因为我们要提供给 single-spa 的子应用加载方法，所以通常需要将多入口改造成单入口（mpa to spa）
3. 打包环境修改，因为我们需要同时将所有子应用打包进 single-spa 里面，这样才能找到加载子应用的方法

到这里如果对构建有经验的读者就意识到了，single-spa 这种加载的方法我们称之为 JS-Entry。由于 JS 执行还不支持远端调用，所以我们修改打包构建。那么这对于一个已经在线上正常跑的业务代码几乎是无法接受的，

其次，即使是能够接受把所有的代码打包到一起，由于所有代码都需要在运行前加载，这对于页面的体验尤其是性能优化很难做，比如 js 的按需加载，懒加载，css 的独立打包等常规方案就不可做。

最后，如果从 CI-CD 的角度看，我们每次修改一个子应用的代码，就需要把所有的代码都打包一遍上线。目前需要用到微前端的场景，大部分都已经是古早的业务，也基本上都是所谓的“巨石应用”。这样的构建流程对于团队合作来说也是危机重重，一不小心就会踩了大坑。

以上的这一些问题我们可以归纳为，single-spa 对于应用的侵入性太强，导致无法很好的集成之前的业务代码。

## qiankun 改进了什么

刚刚除了提到 single-spa 的侵入问题以外，qiankun 框架还封装了以下能力，这一些能力也是 single-spa 没有提供给我们的：

1. 样式和 js 的隔离问题：如何确保 js 和 css 之间互相不产生影响，又或者子应用 A 修改了全局变量，怎么保证子应用 B 拿到的全局变量还是之前的环境。
2. 资源预加载：如何保证在子应用 A 切换子应用 B 的时候体验良好。
3. 应用间通信：主子应用之间是怎么相互同步通用的状态的。  

[微前端qiankun从搭建到部署的实践](https://juejin.im/post/6875462470593904653)

## loadApp

![loadApp](https://user-images.githubusercontent.com/20638429/235907418-f1d8e076-8ae9-4693-bb64-44bafa716e99.png)

```js
/**
 * 核心方法，完成以下几件事
 * 1. 通过HTML-entry的方式远程加载微应用
 * 2. 样式隔离，使用css scoped或者shadow-dom
 * 3. 渲染子应用
 * 4. 运行时沙箱，js沙箱、全局沙箱
 * 5. 生命周期方法
 * 6. 注册相关通信方法
 * @param app 
 * @param configuration 
 * @param lifeCycles 
 * @returns 
 */
export async function loadApp<T extends ObjectType>(
  app: LoadableApp<T>,
  configuration: FrameworkConfiguration = {},
  lifeCycles?: FrameworkLifeCycles<T>,
): Promise<ParcelConfigObjectGetter> {
  const { entry, name: appName } = app;
  // 获取app实例
  const appInstanceId = genAppInstanceIdByName(appName);
  // 生成时间戳
  const markName = `[qiankun] App ${appInstanceId} Loading`;
  if (process.env.NODE_ENV === 'development') {
    performanceMark(markName);
  }

  // 配置信息
  const {
    singular = false,
    sandbox = true,
    excludeAssetFilter,
    globalContext = window,
    ...importEntryOpts
  } = configuration;

  // 调用import-html-entry, 获取子应用的入口html和脚本执行器
  /**
   * template时link替换为style后的模版
   * execScripts是在指定的js上下文环境中执行代码
   * assetPublicPath静态资源地址
   */
  // get the entry html content and script executor
  const { template, execScripts, assetPublicPath } = await importEntry(entry, importEntryOpts);

  // as single-spa load and bootstrap new app parallel with other apps unmounting
  // (see https://github.com/CanopyTax/single-spa/blob/master/src/navigation/reroute.js#L74)
  // we need wait to load the app until all apps are finishing unmount in singular mode
  // 这里是single-spa的限制，加载、初始化、卸载不能同时执行，所以使用了一个promise控制调用流
  if (await validateSingularMode(singular, app)) {
    await (prevAppUnmountedDeferred && prevAppUnmountedDeferred.promise);
  }

  /** 样式隔离开始 */
  // 用一个容器元素包裹子应用的html入口
  // appContent = `<div id="__qiankun_microapp_wrapper_for_${appInstanceId}__" data-name="${appName}">${template}</div>`
  const appContent = getDefaultTplWrapper(appInstanceId)(template);
  // 是否严格样式隔离
  const strictStyleIsolation = typeof sandbox === 'object' && !!sandbox.strictStyleIsolation;

  if (process.env.NODE_ENV === 'development' && strictStyleIsolation) {
    console.warn(
      "[qiankun] strictStyleIsolation configuration will be removed in 3.0, pls don't depend on it or use experimentalStyleIsolation instead!",
    );
  }
  //scope css
  const scopedCSS = isEnableScopedCSS(sandbox);
  // 将appContent由字符串模版转换成html的dom，如果需要严格样式隔离，这里使用了shadow-dom
  let initialAppWrapperElement: HTMLElement | null = createElement(
    appContent,
    strictStyleIsolation,
    scopedCSS,
    appInstanceId,
  );

   /** 子应用渲染开始 */
  const initialContainer = 'container' in app ? app.container : undefined;
  const legacyRender = 'render' in app ? app.render : undefined;

  const render = getRender(appInstanceId, appContent, legacyRender);

  // 第一次加载设置应用可见区域 dom 结构
  // 确保每次应用加载前容器 dom 结构已经设置完毕
  // 渲染子应用到容器节点，并且展示loading状态
  render({ element: initialAppWrapperElement, loading: true, container: initialContainer }, 'loading');

  // 得到一个 getter 函数
  // 通过该函数可以获取 <div id="__qiankun_microapp_wrapper_for_${appInstanceId}__" data-name="${appName}">${template}</div>
  const initialAppWrapperGetter = getAppWrapperGetter(
    appInstanceId,
    !!legacyRender,
    strictStyleIsolation,
    scopedCSS,
    () => initialAppWrapperElement,
  );

  /** 运行时沙箱开始 */
  let global = globalContext;
  // 挂载的异步控制流程
  let mountSandbox = () => Promise.resolve();
  let unmountSandbox = () => Promise.resolve();
  const useLooseSandbox = typeof sandbox === 'object' && !!sandbox.loose;
  let sandboxContainer;
  if (sandbox) {
    /**
     * 运行时沙箱，由JS的沙箱和css的沙箱两部分
     * 在正常情况下，返回了window的proxy对象
     * unmount方法卸载子应用，并且恢复到之前的环境
     * mount方法挂载子应用，并且增强相关函数，接下来会讲解
     */
    sandboxContainer = createSandboxContainer(
      appInstanceId,
      // FIXME should use a strict sandbox logic while remount, see https://github.com/umijs/qiankun/issues/518
      initialAppWrapperGetter,
      scopedCSS,
      useLooseSandbox,
      excludeAssetFilter,
      global,
    );
    // 用沙箱的代理对象作为接下来使用的全局对象
    global = sandboxContainer.instance.proxy as typeof window;
    mountSandbox = sandboxContainer.mount;
    unmountSandbox = sandboxContainer.unmount;
  }

  // 将传的生命周期函数合并，一些addon看起来是打了一些标记
  const {
    beforeUnmount = [],
    afterUnmount = [],
    afterMount = [],
    beforeMount = [],
    beforeLoad = [],
  } = mergeWith({}, getAddOns(global, assetPublicPath), lifeCycles, (v1, v2) => concat(v1 ?? [], v2 ?? []));

  // 按照顺序执行beforeLoad生命周期
  await execHooksChain(toArray(beforeLoad), app, global);

  // get the lifecycle hooks from module exports
  // 获取微任务暴露出来的生命周期函数
  const scriptExports: any = await execScripts(global, sandbox && !useLooseSandbox);
  const { bootstrap, mount, unmount, update } = getLifecyclesFromExports(
    scriptExports,
    appName,
    global,
    sandboxContainer?.instance?.latestSetProp,
  );

  // 注册通信方法，通过props会传递给子应用
  const { onGlobalStateChange, setGlobalState, offGlobalStateChange }: Record<string, CallableFunction> =
    getMicroAppStateActions(appInstanceId);

  // FIXME temporary way
  const syncAppWrapperElement2Sandbox = (element: HTMLElement | null) => (initialAppWrapperElement = element);

  const parcelConfigGetter: ParcelConfigObjectGetter = (remountContainer = initialContainer) => {
    let appWrapperElement: HTMLElement | null;
    let appWrapperGetter: ReturnType<typeof getAppWrapperGetter>;

    const parcelConfig: ParcelConfigObject = {
      name: appInstanceId,
      bootstrap,
      // 挂载阶段的生命周期
      mount: [
        async () => {
          if (process.env.NODE_ENV === 'development') {
            const marks = performanceGetEntriesByName(markName, 'mark');
            // mark length is zero means the app is remounting
            if (marks && !marks.length) {
              performanceMark(markName);
            }
          }
        },
        // 如果是单例模式的沙箱，则需要等微应用卸载完成之后才能执行挂载任务
        async () => {
          if ((await validateSingularMode(singular, app)) && prevAppUnmountedDeferred) {
            return prevAppUnmountedDeferred.promise;
          }

          return undefined;
        },
        // initial wrapper element before app mount/remount
      
        async () => {
          appWrapperElement = initialAppWrapperElement;
          // 重新初始化模版
          appWrapperGetter = getAppWrapperGetter(
            appInstanceId,
            !!legacyRender,
            strictStyleIsolation,
            scopedCSS,
            () => appWrapperElement,
          );
        },
        // 添加 mount hook, 确保每次应用加载前容器 dom 结构已经设置完毕
        async () => {
          const useNewContainer = remountContainer !== initialContainer;
          // 这种情况是主应用的容器换掉了，所以需要执行一系列的方法rebuild
          if (useNewContainer || !appWrapperElement) {
            // element will be destroyed after unmounted, we need to recreate it if it not exist
            // or we try to remount into a new container
            appWrapperElement = createElement(appContent, strictStyleIsolation, scopedCSS, appInstanceId);
            syncAppWrapperElement2Sandbox(appWrapperElement);
          }
          // 渲染微应用到容器节点，展示mounted状态
          render({ element: appWrapperElement, loading: true, container: remountContainer }, 'mounting');
        },
        // 运行时沙箱导出的mount
        mountSandbox,
        // exec the chain after rendering to keep the behavior with beforeLoad
        // 执行beforeMount
        async () => execHooksChain(toArray(beforeMount), app, global),
        // 向子应用的mount生命周期函数传递参数
        async (props) => mount({ ...props, container: appWrapperGetter(), setGlobalState, onGlobalStateChange }),
        // finish loading after app mounted
        async () => render({ element: appWrapperElement, loading: false, container: remountContainer }, 'mounted'),
        async () => execHooksChain(toArray(afterMount), app, global),
        // initialize the unmount defer after app mounted and resolve the defer after it unmounted
        // 子应用挂载完成之后初始化这个promise，并且在微应用卸载以后resolve这个promise
        async () => {
          if (await validateSingularMode(singular, app)) {
            prevAppUnmountedDeferred = new Deferred<void>();
          }
        },
        async () => {
          if (process.env.NODE_ENV === 'development') {
            const measureName = `[qiankun] App ${appInstanceId} Loading Consuming`;
            performanceMeasure(measureName, markName);
          }
        },
      ],
      // 卸载微应用
      unmount: [
        async () => execHooksChain(toArray(beforeUnmount), app, global),
        // 执行微应用的生命周期函数
        async (props) => unmount({ ...props, container: appWrapperGetter() }),
        // 沙箱导出的unmount方法
        unmountSandbox,
        async () => execHooksChain(toArray(afterUnmount), app, global),
        async () => {
          render({ element: null, loading: false, container: remountContainer }, 'unmounted');
          offGlobalStateChange(appInstanceId);
          // for gc
          appWrapperElement = null;
          syncAppWrapperElement2Sandbox(appWrapperElement);
        },
        // 子应用卸载的时候会resolve这个promise，确保框架能进行后续的工作
        async () => {
          if ((await validateSingularMode(singular, app)) && prevAppUnmountedDeferred) {
            prevAppUnmountedDeferred.resolve();
          }
        },
      ],
    };

    // 子应用有可能定义了update方法，覆盖
    if (typeof update === 'function') {
      parcelConfig.update = update;
    }

    return parcelConfig;
  };

  return parcelConfigGetter;
}
```





# Qiankun的使用过程

## 主应用：  
在主应用中，你需要配置Qiankun，包括注册子应用、设置路由规则以及配置子应用的样式等。主应用是整个微前端应用的容器，它负责管理子应用的加载和通信。

1. 在主应用的入口文件中，引入Qiankun的registerMicroApps方法和主应用的路由组件。
2. 配置Qiankun的注册表，包括子应用的名字，入口和路由规则。“micro-app.js”
3. 主应用的入口文件中注册App，start

## 子应用：  
每个子应用都是一个独立的前端应用，可以使用任何前端框架，如React、Vue、Angular等。你需要为每个子应用创建独立的项目，并在其中配置Qiankun的子应用适配器。
每个子应用是一个独立的Vue应用。

1. 创建public-path.js文件
2. 写渲染方法，创建实例，挂载到相应的div
3. 配置子应用的适配器和生命周期钩子。

# 在非Umijs中的乾坤应用通信：  
Qiankun提供了API来实现主应用和子应用之间的通信。你可以使用这些API来传递数据、调用子应用的方法等。  
### 1全局状态管理--store.js：
通过Qiankun的initGlobalState方法和onGlobalStateChange方法，你可以在主应用和子应用之间共享全局状态。

在主应用中，使用initGlobalState来初始化全局状态，并通过setGlobalState来更新状态。
在子应用中，使用onGlobalStateChange来订阅全局状态的变化，并通过回调函数处理状态变化。

### 2子应用调用主应用方法：
使用Qiankun的invoke方法，子应用可以调用主应用暴露的方法。

在主应用中，通过props参数将方法暴露给子应用。
在子应用中，使用invoke方法调用主应用的方法。

# 部署：  

在完成开发后，你需要将主应用和子应用进行构建，并将它们部署到相应的服务器上。

- 将主应用的构建产物（例如 `dist/main-app` 目录下的文件）部署到Web服务器上，确保服务器可以提供这些静态文件。
- 同样，将每个子应用的构建产物（例如 `dist/sub-app1` 和 `dist/sub-app2` 目录下的文件）部署到各自的Web服务器上。
- 部署主应用和子应用：

https://qiankun.umijs.org/zh/cookbook#%E5%A6%82%E4%BD%95%E9%83%A8%E7%BD%B2



UMD 模式

`qiankun` 是一个基于 single-spa 的微前端实现库，它允许你将多个前端应用集成到一个主应用中。在使用 `qiankun` 时，子应用需要打包成 UMD（Universal Module Definition）模式的原因有以下几点：

1. **模块兼容性**：UMD 模式是一种兼容多种模块定义方式的打包格式，它既支持 CommonJS，也支持 AMD，同时还支持全局变量的方式。这意味着无论是在 Node.js 环境、RequireJS 环境，还是在普通的浏览器环境中，UMD 模块都能够正常工作。
2. **动态加载**：`qiankun` 需要动态加载子应用，这意味着子应用需要以一种可以被动态导入的方式打包。UMD 格式正好满足这一点，因为它不依赖于特定的模块加载器，可以直接通过 `<script>` 标签加载。
3. **全局变量暴露**：在 UMD 模式中，子应用可以通过全局变量暴露自己的生命周期钩子（如 `bootstrap`、`mount`、`unmount`），这样 `qiankun` 主应用可以在加载子应用时，通过这些全局变量来调用子应用的生命周期函数。
4. **简化集成**：使用 UMD 模式打包子应用可以简化集成过程，因为子应用不需要依赖于特定的构建工具或模块系统，可以独立于主应用的技术栈进行开发和部署。

总之，将子应用打包成 UMD 模式是为了确保子应用可以在 `qiankun` 微前端架构中以最小的依赖和最大的兼容性运行。这样做可以使得微前端架构更加灵活和健壮