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

