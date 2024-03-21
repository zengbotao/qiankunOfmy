<<<<<<< HEAD
# weiqianduan

#### 介绍
微前端及其部署

#### 软件架构
软件架构说明


#### 安装教程

1.  xxxx
2.  xxxx
3.  xxxx

#### 使用说明

1.  xxxx
2.  xxxx
3.  xxxx

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request


#### 特技

1.  使用 Readme\_XXX.md 来支持不同的语言，例如 Readme\_en.md, Readme\_zh.md
2.  Gitee 官方博客 [blog.gitee.com](https://blog.gitee.com)
3.  你可以 [https://gitee.com/explore](https://gitee.com/explore) 这个地址来了解 Gitee 上的优秀开源项目
4.  [GVP](https://gitee.com/gvp) 全称是 Gitee 最有价值开源项目，是综合评定出的优秀开源项目
5.  Gitee 官方提供的使用手册 [https://gitee.com/help](https://gitee.com/help)
6.  Gitee 封面人物是一档用来展示 Gitee 会员风采的栏目 [https://gitee.com/gitee-stars/](https://gitee.com/gitee-stars/)
=======



# qiankun 介绍
=======
示例源码与笔记

[微前端qiankun从搭建到部署的实践](https://juejin.im/post/6875462470593904653)

https://github.com/zengbotao/qiankun-example

## 开始
安装根目录工程依赖
>>>>>>> 4981806f8bf3ec8a765100dc6df38d8e85b52a9d

qiankun 是基于 single-spa 做了二次封装的微前端框架，解决了 single-spa 的一些弊端和不足。在非Umijs中的乾坤案例

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
# 通信：

自定义事件通信：

主应用和子应用可以使用自定义事件进行通信。主应用可以使用 window.dispatchEvent(event) 方法触发自定义事件，子应用可以通过监听 window.addEventListener(eventType, listener) 来接收事件并执行相应的逻辑。
通过自定义事件，可以实现简单的消息传递和触发特定操作。



HTML5 事件总线：

主应用和子应用可以使用 HTML5 事件总线（如 window.postMessage）进行跨域通信。
通过在主应用或子应用中使用 window.postMessage(message, targetOrigin) 方法，可以向指定的目标应用发送消息，并通过监听 window.addEventListener('message', listener) 来接收消息。



全局状态管理：

主应用和子应用可以使用共享的全局状态管理库（如 Redux、Vuex）来实现状态的共享和通信。
主应用和子应用可以通过读取和修改共享的状态来进行通信，从而实现跨应用的数据共享和通信。



跨应用路由传参：

主应用和子应用之间可以通过 URL 参数进行通信。主应用可以在加载子应用时将参数传递给子应用的路由，子应用可以通过解析 URL 参数来获取通信所需的数据。

# 常见问题

## 1.参数传递方式，每种方式都有其优点和缺点

URL参数传递：
优点：

- 直接将参数包含在URL中，易于理解和调试。
- 可以直接通过浏览器的地址栏传递参数。
- 适用于简单的参数传递场景。

缺点：
- 参数会暴露在URL中，可能会导致安全风险，特别是涉及敏感信息时。
- URL参数长度有限，过多的参数或参数值过长可能会受到限制。
- 随着参数数量增加，URL会变得冗长和复杂。

事件参数传递：
优点：

- 通过事件机制实现松耦合的通信，不同模块之间可以解耦。
- 可以在事件中传递复杂的数据结构。
- 支持一对多的事件订阅模式。

缺点：
- 事件机制增加了代码的复杂性，需要在适当的时候发布和订阅事件。
- 事件传递通常是异步的，依赖于事件的订阅者是否已准备就绪。
- 事件传递涉及到全局事件总线或事件管理器的维护，可能增加系统的复杂性。

共享状态传递：
优点：

- 共享状态可以在应用程序中全局维护，方便访问和更新。
- 可以实现实时的数据共享和同步。
- 适用于多个组件或模块之间需要共享数据的场景。

缺点：
- 共享状态需要在主应用程序中维护，可能导致主应用程序的复杂性增加。
- 多个应用程序共享同一状态时，需要处理状态的一致性和同步问题。
- 共享状态可能导致应用程序之间的耦合性增加，难以维护和调试。

选择合适的参数传递方式取决于具体的应用场景和需求。通常情况下，URL参数适合简单的参数传递，事件参数适合解耦和异步通信，共享状态适合需要实时共享和同步的场景。在设计系统时，可以根据需求综合考虑这些因素，并选择适合的参数传递方式。

跨应用程序通信：为了实现无缝的页面切换和传递参数，微前端应用程序之间需要进行跨应用程序通信。可以使用共享状态管理工具，如Redux或MobX，来管理应用程序之间的共享状态。这样，当进行页面切换时，目标应用程序可以获取到之前应用程序的状态，并进行相应的展示和处理。

## 2. 样式隔离： 防止样式冲突和影响其他应用程序的问题。
### CSS scope：  
* CSS Modules
* CSS-in-JS

### Shadow DOM：  
Shadow DOM 是一种浏览器技术，用于创建封装的组件，使其具有隔离的作用域和样式。它可以将一个 DOM 子树与文档的主 DOM 树分开，以创建独立的作用域。

Shadow DOM 的原理可以总结为以下几个关键点：

封装性：Shadow DOM 允许将 DOM 结构、样式和行为封装到一个独立的组件中，以防止其与其他组件或文档的 DOM 结构发生冲突。

Shadow Root：每个 Shadow DOM 都有一个关联的 Shadow Root，它是 Shadow DOM 的根节点。Shadow Root 是一个独立的 DOM 子树，它包含了组件的私有 DOM 结构。

影子节点：Shadow DOM 内部的元素称为影子节点。这些节点只在 Shadow Root 内部可见，而在外部文档的 DOM 树中不可见。通过将元素放置在 Shadow Root 中，可以隐藏它们的实现细节。
样式隔离：Shadow DOM 具有样式隔离的特性。在 Shadow DOM 内部定义的样式规则只会应用于 Shadow DOM 内部的元素，不会影响外部文档的样式。

封装样式和事件：Shadow DOM 允许在组件内部定义样式和事件处理程序，这些样式和事件只会应用于组件内部的元素，不会干扰其他组件或文档。

## 3. 乾坤如何拦截浏览器的路由变化事件
* 原生拦截：乾坤会监听浏览器的 popstate 和 hashchange 事件，这些事件是浏览器在 URL 发生变化时触发的。

popstate 事件：在现代浏览器中，当通过浏览器的前进或后退按钮导航时，会触发 popstate 事件。
hashchange 事件：在 Hash 模式下，当 URL 的哈希部分发生变化时，会触发 hashchange 事件。
乾坤通过监听这些事件，获取当前的 URL 变化，并根据乾坤的路由匹配规则判断应该加载哪个子应用。

* history 拦截：在乾坤中，可以通过重写浏览器的 history 对象的方法来拦截路由变化事件。

pushState 方法：通过重写 history.pushState 方法，在每次调用该方法时拦截路由变化事件。
replaceState 方法：通过重写 history.replaceState 方法，在每次调用该方法时拦截路由变化事件。
乾坤通过重写这些方法，可以捕获主应用中的路由变化，并根据配置的路由规则来判断应该加载哪个子应用。

```
history.pushState (null, 'sub-react', '/sub-react')
history.pushState(state, title, URL);
```

state：一个表示新历史状态的对象，可以在 popstate 事件中获取到。这个对象可以包含任何序列化的数据，用于描述新的历史状态。
title：一个可选的字符串，表示新历史记录的标题。大多数现代浏览器中，这个参数并不起作用，可以传入一个空字符串。
URL：一个可选的字符串，表示新的 URL。该 URL 可以是相对 URL 或绝对 URL。

当调用 pushState() 方法时，浏览器会创建一个新的历史记录条目，并将其添加到历史记录栈中。页面的 URL 会被修改为指定的新 URL，但页面本身并不会被加载或刷新。这意味着页面的内容保持不变，但 URL 发生了变化。

注意事项：

pushState() 方法并不会触发页面的实际导航或加载新的页面内容。它只是修改了浏览器的历史记录和当前页面的 URL。
修改 URL 并不会导致页面的刷新或重新加载，因此，对于使用 pushState() 进行 URL 修改的应用程序，需要通过监听 popstate 事件来处理 URL 的变化，并根据需要更新页面内容。

```
window.addEventListener('popstate', this.bindCurrent)
```



## 4.qiankun是如何处理子应用的link与script标签的

在 qiankun 微前端框架中，处理子应用的 <link> 和 <script> 标签是通过两个主要的机制来实现的：预加载和资源隔离。

预加载（Prefetching）：qiankun 使用自定义的 prefetch 策略来处理子应用的资源预加载。当主应用渲染时，qiankun 会自动解析子应用的入口文件，提取其中的 <link> 和 <script> 标签，并以异步方式加载这些资源。这样可以在用户浏览到子应用时，提前加载所需的资源，减少加载时间。

资源隔离（Resource Isolation）：qiankun 使用 Shadow DOM 技术来实现子应用的资源隔离。每个子应用都被封装在一个 Shadow DOM 中，这意味着子应用内部的 <link> 和 <script> 标签只会影响子应用自身的 DOM 范围，不会影响其他子应用或主应用的 DOM。这种隔离性确保了每个子应用的样式和脚本不会相互干扰。

通过预加载和资源隔离，qiankun 能够在微前端架构中有效地处理子应用的 <link> 和 <script> 标签，从而实现独立的子应用加载和隔离的资源环境。

* script

qiankun 使用 JavaScript 沙箱来劫持 <script> 标签，以实现对子应用代码的隔离和控制。当子应用的代码被加载时，qiankun 会拦截 <script> 标签的加载，并将其执行环境切换到 JavaScript 沙箱中。

具体来说，qiankun 使用一种称为 "proxy 沙箱" 的技术来劫持 <script> 标签。这种沙箱技术通过代理（proxy）方式，对子应用的代码进行拦截和处理，从而实现对全局变量、DOM 操作、事件处理等的隔离。

当子应用的代码被加载时，qiankun 会创建一个独立的 JavaScript 沙箱环境，该环境包含一个代理对象，用于拦截子应用的代码执行。当子应用的代码试图访问全局变量时，代理对象会拦截并根据沙箱的规则进行处理。这样，子应用的代码无法直接访问或修改主应用的全局变量，从而实现了变量的隔离。

同样地，当子应用的代码尝试操作 DOM、添加事件监听器等操作时，代理对象也会进行拦截和处理。代理对象会将这些操作转发到主应用提供的沙箱 API 中，通过主应用来管理和控制这些操作，确保其在主应用的上下文中执行，从而实现对 DOM 操作和事件的隔离。

通过这种方式，qiankun 实现了对子应用代码的隔离，保护了主应用的全局环境和 DOM 结构，确保主应用和子应用之间的安全和稳定性。

* link

在 qiankun 微前端框架中，对于 <link> 标签的劫持和处理是可选的，而不像 <script> 标签一样是必需的。这是因为 <link> 标签一般用于加载样式表，对于样式表的加载，qiankun 默认会进行一些处理以避免样式冲突。

具体来说，qiankun 在加载子应用的样式表时，会将样式表中的选择器添加一个前缀，以确保子应用的样式不会直接影响到其他子应用或主应用的样式。这样可以实现样式的隔离，避免冲突。

因此，对于 <link> 标签，qiankun 的 JavaScript 沙箱并不需要对其进行劫持或处理。默认情况下，qiankun 会自动处理样式表的加载，并在渲染子应用时应用样式表的隔离机制。

需要注意的是，如果子应用中存在涉及动态生成样式的情况，可能需要进行额外的处理以确保样式的隔离和正确加载。这可以通过使用 CSS-in-JS 库或其他样式隔离的解决方案来实现。

总结起来，对于 <link> 标签，qiankun 默认会处理样式表的加载过程，并应用样式的隔离机制，因此不需要额外的劫持或处理。而对于 <script> 标签，qiankun 的 JavaScript 沙箱会劫持其加载和执行过程，以实现子应用的隔离和安全性。
>>>>>>> c9bcbe4... 本次提交的说明
