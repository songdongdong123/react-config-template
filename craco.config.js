const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const chokidar = require('chokidar');
const mockDataPath = path.resolve(__dirname, 'mock');
console.log(JSON.stringify(process.env.NODE_ENV)); // 环境变量
const creatAjaxUrl = function(method, pathname) {
  const pattern = /\d{17}[\dXx]/;
  const path = pathname.replace(pattern, '') // 处理动态路由，将动态部分转为空
  switch(method) {
    case 'GET':
      if (pattern.test(pathname)) {
        // GET  请求下如果是动态路由，一般是用来请求详情数据的
        return `${path}/detail.js`
      }
      return `${path}/read.js`;
    case 'POST':
      return `${path}/create.js`;
    case 'PUT':
      return `${path}/update.js`;
    case 'PATCH':
      return `${path}/update.js`;
    case 'DELETE':
      return `${path}/delete.js`;
  }
}
module.exports = {
  devServer: {
    onBeforeSetupMiddleware(devServer) {
      // 先快速实现mock服务，后续在优化
      /**
       * todo:
       * 1. 灵活配置接口前缀（可有可无）；
       * 2. 在mockdata侧，可以接收到请求参数，请求方法；// done
       * 3. 动态路由问题（/api/question/xxx）
       * 4. mock资源修改时，devserver动态清除mock资源缓存 // done
       */
      devServer.app.use(bodyParser.json()); // 非GET请求参数解析
      devServer.app.use((req, res, next) => {
        if (req.url.startsWith('/api')) {
          const mockUrl = req.url.replace('/api/', ''); // 处理请求URL
          const urlObject = url.parse(mockUrl); // 解析请求
          const { pathname } = urlObject;
          const apiPath = creatAjaxUrl(req.method, pathname)
          const mockFilePath = path.resolve(mockDataPath, apiPath); // 解析相对路径为绝对路径
          const mockData = require(mockFilePath); // 加载mockData
          console.log(req.body)
          if (typeof mockData === 'function') {
            // 给mock数据传递参数
            res.send(mockData({
              query: Object.assign({}, req.query, req.body),
              method: req.method
            }));
          } else {
            // 静态文件，无法传递参数
            res.send(mockData)
          }
        } else {
          next();
        }
      });
    },
    onAfterSetupMiddleware(devServer) {
      // 监听 mock 数据目录的变化
      const watcher = chokidar.watch(mockDataPath);
      watcher.on('change', (path) => {
        console.log(`Mock data changed: ${path}`);
        // 清除 require 缓存
        Object.keys(require.cache).forEach((key) => {
          if (key.startsWith(mockDataPath)) {
            delete require.cache[key];
          }
        });
      });
    },
    port: 9000,
  }
};
