---
title: 从零实现 web 框架
visible: true
date: 2021-04-16
description: 极简框架，与 Flask 有类似的 API
---

本篇我们会来实现一个 web 框架，如果你熟悉 Python 中的 Django 或 Flask，就会觉得它很亲切，代码在这儿  [Github](https://github.com/cymoo/mini_web)。

## 往期回顾

上一篇文章我们实现了一个 WSGI server，它解析了请求的 headers，并负责将响应的数据发送给客户端，而且它还使用了一个线程池，具有并发处理请求的能力。我们已经迈出了一大步，然后对于开发 web 应用，它还远远不够。比如请求的 body，它还安安静静的以字节流的形式待在内核缓冲区或是仍在网络中传输，尚待读取和解析；对于响应的发送，它唯一做的就是把一堆 bytes 仍出去，如果我们想发送文本、图片或视频，还需要一堆繁琐和重复的工作。

先来看一个简单的示例。

```python
def app(environ, start_response):
    path = environ['PATH_INFO']
    method = environ['REQUEST_METHOD']
    
    # 当用户访问 / 路径，并且请求方法为 GET
    if path == '/' and method == 'GET':
        content = b'hello world'
        start_response('200 OK',
                       [('Content-Type', 'text/plain'),
                        ('Content-Length', str(len(content)))])
        return [content]

    # 当用户使用 POST 方法，向 /upload 路径上传一个文件
    elif path == '/upload' and method == 'POST':
        # 1. 从 environ['wsgi.input'] 中读取数据，如果数据较大，把它保存在临时文件中，如果太大，返回错误
        # 2. 从读取好的数据中解析出文件域，这是个 dirty work
        # 3. 再将文件保存在指定的目录，同时要留意文件名或目录是否有问题
        # 4. 返回合适的响应数据

    # 其他情况时返回404
    else:
        content = b'page not found'
        start_response('404 Not Found',
                       [('Content-Type', 'text/plain'),
                        ('Content-Length', str(len(content)))])
        return [content]
```

以上，我们得重复的设置 headers、计算响应的长度，小心翼翼的确保返回的内容是 bytes，并且还要自己动手解析数据，天哪！

## 什么是 Web 框架

简而言之，它就是一组功能的集合，包含了 web 开发中公共的处理逻辑，诸如路由分发、缓存、session、表单处理、文件上传下载和错误处理等。它可以帮助我们从大量的重复工作和易错的细节中解脱出来。

对于流行的 web 框架，往往可以分为两类，大而全 vs 小而美，诸如 Python 中的 Django 与 Flask，Ruby 中的 Rails 和 Sinatra，Node.js 中的 Egg 和 Express。对于大框架，它提供了更多的功能，像一个大管家，方方面面均为你考虑到了；而对于微框架，它仅提供了框架作者所理解的最小且最核心的功能集合，所以它带来了更高的可定制型，即可玩性更高。但总的说来，框架一般均会解决两类比较重要的问题：

1. 如何将用户请求的 URL 映射到某个类或函数，即路由。
2. 如何更方便的生成响应内容，比如根据模板生成 HTML。

框架的核心处理逻辑是类似的，而也是比较简单的。搞定了一个，便可以轻松将所学的迁移到其他的 web 框架上，即一通百通。

使用我们将要实现的框架， 实现上述同样的功能，代码又是这样的：

```python
@app.get('/')
def index(req):
    return 'hello world'
  
@app.post('/upload')
def upload(req):
    # 忽略一些异常处理
    req.POST['file'].save('/path/to/dir')
    return {'status': 'ok', 'data': 'file uploaded'}
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

   我们没有像 Flask 一样使用 thread local，当然它是个很好的设计，而且当为框架编写扩展时尤为方便。

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

## 实现

### 实现 `Request` 类

回忆上一篇文章，一个 HTTP 请求的所有信息都存放于一个 `dict`，即 `environ` 中。它是由 server 生成的，包含了请求头的内容，而请求体尚待解析。我们要实现的 `Request` 类就是对 `environ` 的包装，提供更友好的访问的接口。