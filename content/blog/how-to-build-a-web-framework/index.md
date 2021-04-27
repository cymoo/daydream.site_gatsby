---
title: 从零实现 web 框架
visible: true
date: 2021-04-16
description: 极简框架，与 Flask 有类似的 API
---

本篇我们会来实现一个 web 框架，如果你熟悉 Python 中的 Django 或 Flask，就会觉得它很亲切，代码在这儿  [Github](https://github.com/cymoo/mini_web)。

## 什么是 Web 框架

简而言之，它就是一组工具的结合，包含了 web 开发中公共的处理逻辑，极大简化 web 应用的开发。

如果没有 web 框架，仅使用上一篇实现的 server 来写一个最简单的 web 应用，代码会是这样的：

```python
def app(environ, start_response):
    path = environ['PATH_INFO']

    if path == '/':
        content = b'hello world'
        start_response('200 OK',
                       [('Content-Type', 'text/plain'),
                        ('Content-Length', str(len(content)))])
        return [content]
    else:
        content = b'page not found'
        start_response('404 Not Found',
                       [('Content-Type', 'text/plain'),
                        ('Content-Length', str(len(content)))])
        return [content]
  
```

以上，我们得重复的设置 headers、计算响应的长度，小心翼翼的确保返回的内容是 bytes。对于正常的 web 应用，我们还需要路由分发、缓存、session、表单处理、文件上传下载和错误处理等。如果不使用框架， 1) 在开发的过程中自己实现一个框架；2）你是个疯子。

使用我们将要实现的框架，代码又是这样的：

```python
@app.get('/')
def index(req):
    return 'hello world'
```

## 框架设计

1. 基于装饰器的路由分发

   ```python
   @app.get('/')
   
   # 支持 URL 参数
   @app.post('/user/<name>')
   
   @app.route('/upload', methods=['GET', 'POST'])
   ```

2. 显式的传递 `Request`对象

   我们使用 Django 的方式，而没有像 Flask 一样使用 thread local，当然它是个很好的设计，而且当为框架编写扩展时尤为方便。

   ```python
   @app.get('/user')
   def user(request: Request): pass
   ```

3. GET 与 POST 属性

   ```python
   # 获取 query string 的参数
   request.GET.get('arg')
   
   # Content-Type 为 'multipart/form-data' 或 'application/x-www-form-urlencoded' 均可用 request.POST 获取
   request.POST.get('myfile')
   request.POST.get('username')
   
   # Content-Type 为 'application/json' 可使用 request.json 获取
   request.json
   ```

4. Response 类

   响应的类包括：`Response`，`JSONResponse`，`FileResponse`，`Redirect`，`HTTPError`，视图函数返回的 `dict` 或 `list` 会自动转为 `JSONResponse`。

   ```python
   @app.get('/resp')
   def many_resp(req: Request):
       num = random()
       if num > 0.8:
           raise HTTPError(500, 'Oops, server error!')
       elif num > 0.6:
           return FileResponse('myfile.png', '/path/to/mydir')
       elif num > 0.4:
           return Redirect('https://www.bing.com')
       elif num > 0.2:
           return {'status': 'ok'}
       else:
           return 'hello world'
   ```

5. 基于装饰器的全局 error handler

   `@app.error(status_code)` 装饰的函数会捕获对应的 `HTTPError`。
   
   ```python
   @app.error(403)
   def handle_403(req: Request, err: HTTPError):
       resp = JSONResponse({'status': 'failed', 'message': 'access denied'})
       resp.status_code = 403
       return resp
   ```

