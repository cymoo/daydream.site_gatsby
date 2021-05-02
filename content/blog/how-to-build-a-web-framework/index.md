---
title: 从零实现 web 框架
visible: true
date: 2021-04-16
description: 极简框架，与 Flask 有类似的 API
---

本篇我们会来实现一个 web 框架，如果你熟悉 Python 中的 Django 或 Flask，就会觉得它很亲切，完整代码在这儿  [Github](https://github.com/cymoo/mini_web)。

## 往期回顾

上一篇文章我们实现了一个 WSGI server，它解析了请求的 headers，并负责将响应的数据发送给客户端，而且它还使用了一个线程池，具有并发处理请求的能力。我们已经迈出了一大步，然后对于开发 web 应用，它还远远不够。比如请求的 body，它还安安静静的以字节流的形式待在内核缓冲区或是仍在网络中传输，尚待读取和解析；对于响应的发送，它唯一做的就是把一堆 bytes 仍出去，如果我们想发送文本、图片或视频，还需要一堆繁琐和重复的工作。

先来看一个简单的示例。

```python
def app(environ, start_response):
    path = environ['PATH_INFO']
    method = environ['REQUEST_METHOD']
    
    # 当用户访问 / 路径，并且请求方法为GET
    if path == '/' and method == 'GET':
        content = b'hello world'
        start_response('200 OK',
                       [('Content-Type', 'text/plain'),
                        ('Content-Length', str(len(content)))])
        return [content]

    # 当用户使用POST方法，向/upload路径上传一个文件
    elif path == '/upload' and method == 'POST':
        # 1. 从environ['wsgi.input']中读取数据，如果数据较大，把它保存在临时文件中，如果太大，返回错误
        # 2. 从读取好的数据中解析出文件域，这是个dirty work
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

使用我们将要实现的框架， 实现上述同样的功能，代码是这样的：

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

我们会实现以下几个类：

* `Request`：它包含用户的请求信息，相比 `environ` 对象，它解析了请求体，而且提供了更友好的访问接口。
* `Response`：它表示要发送的响应，提供了设置响应的 status、header 和 body 等的方法。
* `Router`：它根据请求的路径和方法匹配一个函数。
* `MiniWeb`：它代表一个 web 应用，包含了路由、错误处理函数和应用的配置等，它的实例是一个可被调用的 WSGI 应用。

框架的主要特点：

1. 基于装饰器的路由分发

   ```python
   # 当访问 / 且请求方法为GET时，会调用函数foo
   @app.get('/')
   def foo(req): pass
   
   # 支持URL参数
   @app.post('/user/<name>')
   def bar(req, name): pass
   
   # 当访问/upload且方法为GET或POST时，会调用函数baz
   @app.route('/upload', methods=['GET', 'POST'])
   def baz(req): pass
   ```

2. 显式的传递 `Request`对象

   我们没有像 Flask 一样使用 thread local，即 `request` 可以像全局变量一样使用，但它的每个属性却是线程独立的，可被多个线程读写而不互相干扰。它是个很好的设计，当为框架编写扩展时尤为方便。正因如此，它只能与使用了线程（或 greenlet）的 server 做搭档，在后面的文章中，我们会实现一个异步IO的 server 和框架，这样本文的代码就可以得到最大程度的复用。

   ```python
   @app.route('/user/<name>', methods=['GET', 'POST'])
   def user(req: Request, name: str):
       print(req.cookies)
       # req.GET为一个解析了query string的dict
       print(req.GET)
       # req.POST为一个包含了用户上传的表单和文件的dict
       print(req.POST)
       # ...
   ```

4. `Response` 类

   `Response` 代表 HTTP 响应，`JSONResponse`，`FileResponse`，`Redirect`，`HTTPError` 等都是它的子类；视图函数返回的 `dict` 或 `list` 会自动转为 `JSONResponse`。

   ```python
   @app.get('/resp')
   def many_resp(req: Request):
       num = random()
       if num > 0.8:
           raise HTTPError(500, 'Oops, server error!')
       elif num > 0.6:
           return FileResponse('myfile.png', '/path/to/dir')
       elif num > 0.4:
           return Redirect('https://www.google.com')
       elif num > 0.2:
           return {'status': 'ok'}
       else:
           return 'hello world'
   ```

5. 基于装饰器的全局 error handler

   `@app.error(error_code)` 装饰的函数会捕获对应的 `HTTPError`。
   
   ```python
   @app.error(403)
   def handle_403(req: Request, err: HTTPError):
       resp = JSONResponse({'status': 'failed', 'message': 'access denied'})
       resp.status_code = 403
       return resp
   ```

## 实现

### Request

回忆一下，`environ` 包含了类似以下的内容：

```python
{
  'PATH_INFO': '/',
  'REQUEST_METHOD': 'GET',
  'QUERY_STRING': 'user=foo&pwd=123',
  'CONTENT_TYPE': 'application/json',
  'CONTENT_LENGTH': '1024',
  'REMOTE_ADDR': '127.0.0.1',
  'wsgi.input': sock,
  'HTTP_HOST': 'example.com',
  'HTTP_COOKIE': 'foo=1; bar=3',
  # ...
}
```

`Request` 即是对 `environ` 的 封装，提供了更友好的访问接口；它的属性几乎都是只读的。

```python
import cgi
import hashlib
import json
import logging
import mimetypes
import os
import re
import sys
from http.client import responses
from http.cookies import SimpleCookie
from io import BytesIO
from typing import *
from tempfile import TemporaryFile
from urllib.parse import unquote, parse_qs, quote


class Request:
    def __init__(self, environ: dict) -> None:
        self._environ = environ
        # 把wsgi app对象挂在request上，
        # 这样我们就可以方便的读取诸如全局配置等信息。
        self.app = None
    
    # cached_property的使用与property一样，但它只有第一次访问时才被计算；
    # 随后被缓存起来，避免重复计算。稍后会给出它的实现。
    @cached_property
    def headers(self) -> dict:
        rv = {}

        for key, value in self._environ.items():
            # environ中大部分请求头以HTTP_开始，为了看起来好看些，我们把前缀移除。
            if key.startswith('HTTP_'):
                name = key[5:].replace('_', '-').upper()
                rv[name] = value

        return rv

    def get_header(self, name: str) -> Optional[str]:
        return self.headers.get(name.upper().replace('_', '-'))
      
    @property
    def query_string(self) -> str:
        return self._environ.get('QUERY_STRING', '')

    @property
    def method(self) -> str:
        return self._environ['REQUEST_METHOD']

    @property
    def path(self) -> str:
        # PATH_INFO中的特殊字符一般都会被转义，比如空格会表示为%20；
        # 这里使用标准库中的unquote函数把它还原。
        return unquote(self._environ.get('PATH_INFO', ''))

    @property
    def content_type(self) -> str:
        return self._environ.get('CONTENT_TYPE', '')

    @property
    def content_length(self) -> int:
        return int(self._environ.get('CONTENT_LENGTH') or -1)

    @property
    def host(self) -> str:
        return self._environ.get('HTTP_HOST', '')
		
    @property
    def remote_addr(self) -> str:
        """获取客户端的IP地址。
        Server一般运行在反向代理的后面，为了获取真实的客户端IP，
        首先检查HTTP_X_FORWARDED_FOR，可能有多层代理，取第一个，最有可能是真实IP，
        如果没有，再取REMOTE_ADDR。
        当然，IP地址可以轻松的任意伪造，所以别太信赖它。
        """
        env = self._environ
        xff = env.get('HTTP_X_FORWARDED_FOR')

        if xff is not None:
            addr = xff.split(',')[0].strip()
        else:
            addr = env.get('REMOTE_ADDR', '0.0.0.0')
        return addr
    
    @cached_property
    def cookies(self) -> dict:
        """获取cookies。
        HTTP_COOKIE是类似于"a=1; b=3"这种形式的字符串，
        返回 {'a': 1, 'b': 3}。
        """
        http_cookie = self._environ.get('HTTP_COOKIE', '')
        return {
            cookie.key: unquote(cookie.value)
            # 为了偷懒，继续使用标准库，当然自己解析也很简单。
            for cookie in SimpleCookie(http_cookie).values()
        }
    
    # 命名规范：PEP8建议函数名是小写字母，但Django等框架这样命名的，约定俗成之。
    @cached_property
    def GET(self) -> dict:
        """使用标准库的parse_qs函数，解析query string。
        Query string是类似于"name=foo&num=1&num=3"这种形式的字符串，
        返回 {'name': ['foo'], 'num': ['1', '3']}。
        为了方便使用，当value是仅包含一个元素的数组时，提取出那个元素。
        """
        return {
            key: squeeze(value)
            for key, value in parse_qs(self.query_string).items()
        }
```

以上的实现都很简单，下面开始解析请求体，它可能是文本或二进制。在解析之前，我们先把数据从 `environ['wsgi.input']` 中一股脑读出来，当然也可以边读边解析，那些效率高些，对内存也更友好，但是实现会麻烦些。

```python
    # 如果超过这个长度，即4M，就先把数据写到一个临时文件中。
    MAX_BODY_SIZE = 1024 * 1024 * 4
    
    @cached_property
    def _body(self) -> Union[BytesIO, TemporaryFile]:
        """从'wsgi.input'中读取数据至内存或临时文件中。"""
        
        # 某些情况下，客户端开始发送数据时，无法知道其长度，例如该数据是根据某些条件动态产生的，
        # 这时数据就以若干系列分块的形式发送，此时请求头中就没有Content-Length，
        # 取而代之的是Transfer-Encoding: chunked，
        # 每一块的开头是当前块的长度，后面紧跟着'\r\n'，随后是内容本身；终止块也是个常规的块，不过长度为0。
        # 解析分块传输的数据也不复杂，不过秉持着有懒就偷的精神，这里就忽略它了。
        chunked = 'chunked' in self.headers.get('TRANSFER-ENCODING', '')
        if chunked:
            raise NotImplementedError('Chunked data are not supported')

        stream = self._environ['wsgi.input']
        
        # 如果数据较大，防止占用过多内存，先将其写入文件；否则直接写入内存。
        # 其实还应该施加一个限制，如果数据过大，比如超过配置的阈值，则不读取，直接甩一个bad request。
        if self.content_length > self.MAX_BODY_SIZE:
            fp = TemporaryFile()
        else:
            fp = BytesIO()

        max_read = max(0, self.content_length)
        while True:
            bs = stream.read(min(max_read, 8192))
            if not bs:
                break
            fp.write(bs)
            max_read -= len(bs)

        # 写完再读，需置指针回到开头，否则EOF。
        fp.seek(0)
        # 替换掉原始的wsgi.input，其使命已完成，不再能被读取。
        self._environ['wsgi.input'] = fp
        return fp
    
    @property
    def body(self) -> Union[BytesIO, TemporaryFile]:
        self._body.seek(0)
        return self._body

    @cached_property
    def json(self) -> Optional[dict]:
        ctype = self.content_type.lower().split(';')[0]
        if ctype != 'application/json':
            return None

        try:
            # 使用标准库的json模块，将body转为dict。
            return json.loads(self.body)
        except (ValueError, TypeError) as err:
            # 后面会实现HTTPError。
            raise HTTPError(400, 'Invalid JSON', exception=err)
```

最后解析表单域或文件，即 ` Content-Type` 为 `application/x-www-form-urlencoded`，或 `multipart/form-data`。form-urlencoded 十分简单，它与 query string 的格式一样，即形如 `name1=value1&name2=value2`，而 form-multipart 解析就复杂的多。 

比如某个 HTML form 长这样：

```html
<form action="/" method="post" enctype="multipart/form-data">
  <input type="text" name="description" value="some text">
  <input type="file" name="myFile">
  <button type="submit">Submit</button>
</form>
```

那么提交时，用户代理（浏览器）会生成类似这样的请求（忽略一些headers），每部分以 boundary 的值作为分隔符：

```
POST /foo HTTP/1.1
Content-Length: 68137
Content-Type: multipart/form-data; boundary=---------------------------974767299852498929531610575

---------------------------974767299852498929531610575
Content-Disposition: form-data; name="description"

some text
---------------------------974767299852498929531610575
Content-Disposition: form-data; name="myFile"; filename="foo.txt"
Content-Type: text/plain

(content of the uploaded file foo.txt)
---------------------------974767299852498929531610575
```

你可以自己尝试解析它，实现一个高效且健壮的解析算法是一个很好的编程练习，可以参考 Flask 的代码 [formparser.py](https://github.com/pallets/werkzeug/blob/master/src/werkzeug/formparser.py)。本文我们不准备自己动手实现，因为标准库里提供了解析的功能，然而，略微遗憾的是，标准库（cgi.FieldStorage）的实现好像有bug（也有可能是feature）。在~2013年我第一次阅读那段代码时，它还很粗糙，在写本文时，我又去撇了一眼，那个模块由 [Guido Van Rossum]([https://gvanrossum.github.io) 重写并维护，不过好像仍有问题。好在可以规避，不影响使用。

```python
    @cached_property
    def POST(self) -> dict:
        """使用标准库解析表单或文件。
        比如对于以上的form，它会返回如下的dict：
        {'description': 'some text', 'myFile': <FileStorage>}，
        其中'myfile'对应的值是FileStorage的一个实例，可以直接调用它的save方法保存文件。
        """
        fields = cgi.FieldStorage(fp=self.body,
                                  environ=self._environ,
                                  keep_blank_values=True)
        # 我们在实例上保存一个FieldStorage的引用，如果不这样做，**稍后**读文件时，文件却被莫名关闭了。
        self.__dict__['_cgi.FieldStorage'] = fields

        fields = fields.list or []
        post = dict()

        for item in fields:
          	# 如果item有属性filename，说明该item是一个文件域；
            # 为了方便使用，用相关属性构一个FileStorage，它是我们自己实现的类，
            # 是item的薄薄的一个封装，可以调用它的save方法，把文件保存在指定路径，
            # 比如 req.POST['myfile'].save('/path/to/dir')
            if item.filename:
                post[item.name] = FileStorage(item.file, item.name,
                                              item.filename, item.headers)
            # 是普通的表单域
            else:
                post[item.name] = item.value
        return post
```

```python
    def __str__(self) -> str:
    		"""
        >>> Request({'REQUEST_METHOD': 'POST', 'PATH_INFO': '/upload'})
        <Request: POST /upload>
        """
        return '<{}: {} {}>'.format(self.__class__.__name__, self.method, self.path)

    __repr__ = __str__
```



前面用到了几个辅助类和函数：

```python
def squeeze(value):
    """
    >>> squeeze([1, 2])
    [1, 2]
    >>> squeeze([1])
    1
    """
    if isinstance(value, list) and len(value) == 1:
        return value[0]
    else:
        return value
```

```python
class cached_property:
    """一个装饰器，把一个函数转为惰性的属性。
    被装饰的函数只会被调用一次，随后它的值会被缓存起来。
    Python3.8及以上版本的functools中已经有了这个类。
    """
    def __init__(self, func):
        self.__doc__ = func.__doc__
        self.func = func

    def __get__(self, obj, cls):
        if obj is None:
            return self
        # 对于一个对象中属性的查找，优先级如下：
        # 1. 数据描述符：即属性定义了__get__，__set__ 方法
        # 2. 实例字典：即__dict__
        # 3. 属性描述符：即属性定义了__get__ 方法
        # 4. __getattr__
        # 我们可以在第一次访问时把返回的值放在__dict__中，
        # 这样下次就不会再计算__get__，达到了缓存的目的。
        value = obj.__dict__[self.func.__name__] = self.func(obj)
        return value
```

```python
class FileStorage:
    """简单的对上传的文件的封装，提供save方法，用于保存文件。"""

    def __init__(self,
                 stream: BytesIO,
                 name: str,
                 filename: str,
                 headers: Optional[dict] = None) -> None:
        self.stream = stream or BytesIO()
        self.name = name
        self.raw_filename = filename
        self.headers = headers or {}

    @staticmethod
    def secure_filename(filename: str) -> str:
        """使用正则表达式过滤除了常见中英文和数字之外的其他字符。
        不要相信用户输入的任何东西，包括上传文件的文件名。
        文件名有可能经过精心的构造，有可能攻击你的系统。
        """
        filename = re.sub(r'[^\u4e00-\u9fa5\w\-.]+', '', filename).strip()
        filename = re.sub(r'[-\s]+', '-', filename).strip('.-')
        return filename[:255] or 'empty'

    def save(self, dst: str, overwrite=False) -> None:
        """保存上传的文件。
        :param dst: 文件保存的位置，可以是文件夹或是完整的路径。
        :param overwrite: 如果已存在同名的文件，是否覆盖。
        """
        if os.path.isdir(dst):
            filepath = os.path.join(dst, self.secure_filename(self.raw_filename))
        else:
            filepath = dst

        if os.path.exists(filepath) and not overwrite:
            raise IOError(500, 'File exists: {}.'.format(filepath))

        # 保存读取前文件指针的偏移，读取完成后，恢复之。
        offset = self.stream.tell()

        with open(filepath, 'wb') as fp:
            stream = self.stream
            while True:
                buf = stream.read(8192)
                if not buf:
                    break
                fp.write(buf)

        self.stream.seek(offset)
```



###Response

HTTP 响应包括响应头和响应体，响应头用于描述响应，响应体则是响应的消息主体。

响应头的第一行被称为 status line，它指示 HTTP 的请求是否成功完成，它分为5类：信息响应（100–199），成功响应（200–299），重定向（300–399），客户端错误（400–499）和服务器错误 （500–599）。比如常见的 200 OK，404 Not Found 和 500 Server Error 等。

以下是一个 HTTP 响应的简单示例：

```
HTTP/1.1 200 OK
Connection: keep-alive
Content-Encoding: gzip
Content-Type: application/json
Content-Length: 22
Date: Sat, 01 May 2021 11:20:31 GMT
ETag: W/"608cf7b4-4ad6"
Expires: Sat, 01 May 2021 11:20:30 GMT
Last-Modified: Sat, 01 May 2021 06:39:48 GMT
Server: nginx/1.18.0

{"msg": "hello world"}
```

`Response` 类提供了设置响应头和体的方法。我们先定义一个常量，它包含了大部分 status line。它的值为：`{200: '200 OK', 400: '400 Bad Request', 405: '405 Method Not Allowed', ...}`。

```python
HTTP_STATUS_LINES = {
    key: f'{key} {value}'
    for key, value in responses.items() # responses来自标准库http.client
}
```

再定义一个简单的函数：

```python
def tr(key: str) -> str:
    """把请求头的名字转为符合规范的格式。
    >>> tr('content_type')
    'Content-Type'
    """
    return key.title().replace('_', '-')
```

```python
class Response:
    """示例：
    Response('hello world', {'content-type': 'text/plain'})
    """
    default_status_code = 200
    default_content_type = 'text/html; charset=UTF-8'

    def __init__(self,
                 # FileWrapper把一个类文件对象转为iterable，稍后实现。
                 data: Union[str, bytes, FileWrapper],
                 headers: Optional[dict] = None) -> None:
        self.status_code = self.default_status_code
        self._cookies = SimpleCookie()
        # self._headers键的值为数组，
        # 比如{'Cache-Control': ['no-cache', 'no-store']}。
        self._headers = {}
        
        # data必须是bytes或bytes的可迭代容器。
        if isinstance(data, str):
            data = data.encode()

        self.set_header('Content-Length', str(len(data)))
        # 回忆上篇文章，WSGI要求应用返回的是一个包含bytes的可迭代对象，
        # 如果不把它放在数组里，socket就会一个字节一个字节的send，
        # 那样的效率会极其感人。
        self.data = [data]

        # 调用者传入的headers的格式不一定正确，
        # 所以不能直接self._headers = headers。
        if headers:
            for key, value in headers.items():
                if isinstance(value, (list, tuple)):
                    for item in value:
                        self.add_header(key, item)
                elif isinstance(value, str):
                    self.add_header(key, value)

    def get_header(self, name: str) -> Optional[str]:
        rv = self._headers.get(tr(name))
        if rv is None:
            return None
        return squeeze(rv)

    def set_header(self, name: str, value: str) -> None:
        self._headers[tr(name)] = [value]

    def add_header(self, name: str, value: str) -> None:
        self._headers.setdefault(tr(name), []).append(value)

    def unset_header(self, name: str) -> None:
        del self._headers[tr(name)]

    def has_header(self, name: str) -> bool:
        return tr(name) in self._headers

    @property
    def headers(self) -> dict:
        return self._headers

    @property
    def header_list(self) -> List[Tuple[str, str]]:
        """把headers转成符合WSGI规范的形式，即[(name, value), ...]。
        >>> res = Response(data='', headers={'a': [1, 2], 'b': 3})
        >>> res.header_list
        [('A', 1), ('A', 2), ('B', 3)]
        """
        headers = list(self._headers.items())

        if 'Content-Type' not in self._headers:
            headers.append(('Content-Type', [self.default_content_type]))

        headers = [(name, val) for (name, values) in headers for val in values]

        if self._cookies:
            for cookie in self._cookies.values():
                headers.append(('Set-Cookie', cookie.OutputString()))

        return headers

    @property
    def status_line(self) -> str:
      	"""
        >>> Response('').status_line
        '200 OK'
        >>> res = Response('')
        >>> res.status_code = 404
        >>> res.status_line
        '404 Not Found'
        """
        return HTTP_STATUS_LINES.get(self.status_code, f'{self.status_code} Unknown')

    def set_cookie(
        self,
        name: str,
        value: str,
        path: str = '/',
        secure: bool = False,
        httponly: bool = False,
        domain: Optional[str] = None,
        max_age: Optional[int] = None,
      	# Python处理时间和日期的标准库的API十分不好用，
      	# 尤其涉及到时区的处理，所以我们就忽略掉expires。
        # 这个库好用的多：https://arrow.readthedocs.io
        # expires: Optional[Union[str, datetime, int, float]] = None,
    ) -> None:
        self._cookies[name] = value

        if path:
            self._cookies[name]['path'] = path
        if secure:
            self._cookies[name]['secure'] = secure
        if httponly:
            self._cookies[name]['httponly'] = httponly
        if domain:
            self._cookies[name]['domain'] = domain
        if max_age:
            self._cookies[name]['max-age'] = max_age

    def unset_cookie(self, name: str, **kw) -> None:
      	# 删掉cookie，把max_age和expires设置<=0的值即可。
        kw['max_age'] = -1
        kw['expires'] = 0
        self.set_cookie(name, '', **kw)

    def __str__(self) -> str:
        rv = ''
        for name, value in self.header_list:
            rv += '{}: {}\n'.format(name.title(), value.strip())
        return rv
    
    __repr__ = __str__
```

JSON 或许现在是最常见的请求或响应的类型了，所以也要默认支持它。它的实现很简单，调用标准库序列化下，然后设置下 `Content-Type` 即可。

```python
class JSONResponse(Response):
    """示例：
    JSONResponse({'msg': 'hello world'})
    """
    def __init__(self,
                 data: Union[list, dict],
                 headers: Optional[dict] = None,
                 **kw) -> None:
        data = json.dumps(data, **kw).encode()
        super().__init__(data, headers)
        self.set_header('Content-Type', 'application/json')
```

很多时候，我们还需要重定向一个请求，实现也很简单，设置 `status_code` 为301或303，然后在 header 里添加重定向的目标路径或 URL 即可。

```python
class Redirect(Response):
    """示例：
    Redirect('https://bing.com')
    Redirect('/foo', 303)
    """
    def __init__(self,
                 redirect_to: str,
                 status_code: int = 301,
                 headers: Optional[dict] = None):
        assert status_code in (301, 303), 'status code must be in (301, 303)'

        super().__init__('', headers)
        self.status_code = status_code
        # 应该对url进行quote，为了安全，除了保留字符外，其他均应转义。
        self.set_header('Location',
                        quote(redirect_to, safe="/#%[]=:;$&()+,!?*@'~"))
```

或早或晚，我们的服务一定会出现错误，某些是能够预料到的，比如用户权限不足，请求的文件消失了，另一些是无法预料到的，比如内容或磁盘空间不够了，数据库连接不上了。这些时候，我们需要返回一个错误响应告知用户。

`HTTPError` 同时继承 `Response` 和 `Exception`，这样我们就可以在代码中这么做了：`raise HTTPError(405)`。不过，多继承的使用场景极少，除非有十分正当的理由，否则不要使用它。

```python
class HTTPError(Response, Exception):
    """示例：
    raise HTTPError(405)
    raise HTTPError(500, '电线被拔了')
    raise HTTPError(500, 'oh, no', Exception('caused by me...'))
    """
    def __init__(self,
                 status_code: int = 500,
                 description: Optional[str] = None,
                 exception: Optional[Exception] = None,
                 headers: Optional[dict] = None):
        assert status_code in range(400, 600), 'status code must be 4XX or 5XX'

        super(HTTPError,
              self).__init__(description or HTTP_STATUS_LINES[status_code], headers)
        super(Exception, self).__init__(description)
        self.status_code = status_code
        self.exception = exception

    def __str__(self):
        return "<{} '{}'>".format(type(self).__name__, self.status_line)
```

通过 HTTP 发送文件也是常见的场景，相比以上几种响应类型，它稍微麻烦一些。我们得多做一些检查，比如文件是否存在与可读；还要考虑缓存，比如根据缓存协商设置对应的头 `Etag`，`Last-Modified` 等；还要权衡是否支持断点续传等。

```python
class FileResponse(Response):
    """示例：
    FileResponse('me.jpg', '/path/to/dir')
    FileResponse('hot.avi', '/path/to/dir', downloadable=True)
    """
    def __init__(
        self,
        filename: str,
        root_path: str,
        headers: Optional[dict] = None,
        request: Optional[Request] = None,
        downloadable: bool = False,
    ) -> None:
        super().__init__('', headers)
        self.root_path = root_path = os.path.abspath(root_path)
        self.file_path = file_path = os.path.abspath(
            os.path.join(root_path, filename))
        
        # 检查文件权限，必不可少，因为可能存在目录遍历攻击等
        self.check_file()

        stats = os.stat(file_path)
        self.set_header('Content-Length', str(stats.st_size))

        mimetype, encoding = mimetypes.guess_type(filename)
        if mimetype:
            self.set_header('Content-Type', mimetype)
        else:
            self.set_header('Content-Type', 'application/octet-stream')
        if encoding:
            self.set_header('Content-Encoding', encoding)
        
        # 如果加上这个头，浏览器会将文件下载到本地，而不是在浏览器中显示。
        if downloadable:
            self.set_header('Content-Disposition',
                            'attachment; filename="%s"' % filename)
        # 如果用户传入了request参数，我们可以做到更多，
        # 比如协商缓存，断点续传等。作为示例，设置个etag。
        if request:
            etag = '{}:{}:{}:{}'.format(stats.st_dev, stats.st_ino, stats.st_mtime, filename)
            etag = hashlib.sha1(etag.encode()).hexdigest()
            self.set_header('ETag', etag)

            # 注意：某些浏览器不一定会发送'If-None-Match'，
            # 如果它们在响应行中看到 'HTTP/1.0'。
            if request.get_header('IF-NONE-MATCH') == etag:
                self.status_code = 304
                return

            # 检查更多的头，比如'If-Modified-Since', 'Accept-ranges'...
            # ...
				
        # 将文件流转为可迭代对象
        self.data = FileWrapper(open(file_path, 'rb'))

    def check_file(self) -> None:
        if not self.file_path.startswith(self.root_path):
            raise HTTPError(403, 'Access denied.')
        if not os.path.exists(self.file_path) or not os.path.isfile(self.file_path):
            raise HTTPError(404, 'File does not exist.')
        if not os.access(self.file_path, os.R_OK):
            raise HTTPError(403, 'No permission to access the file.')
```

下面是 `FileWrapper` 的实现，因为按照 WSGI，应用需要返回一个可迭代对象。

```python
class FileWrapper:
    """把一个文件流转为可迭代对象"""

    def __init__(self, stream, buffer_size: int = 8192):
        self.stream = stream
        self.buffer_size = buffer_size
        # WSGI server负责关闭这个文件，
        # 还记得吗，上一篇有这么行代码：
        # if hasattr(result, 'close'): result.close()
        if hasattr(stream, 'close'):
            self.close = stream.close

    def __iter__(self) -> 'FileWrapper':
        return self

    def __next__(self) -> bytes:
        data = self.stream.read(self.buffer_size)
        if data:
            return data
        raise StopIteration
```



###Router

路由，通常指的是数据包从出发地到目的地，如何选择一条合适的路径。而对 web 开发来说，路由指的是如何根据请求的信息，找到能处理该请求的函数。我们可以建立一个规则，即“路由表”，根据请求的 URL 和方法能唯一确定一个函数：

```
(/, GET) -> function A
(/foo, POST) -> function B
(/bar, GET) -> function C
```

很多时候，不同的 URL 需要对应同一个函数：

```
(/user/a, GET) -> function D
(/user/b, GET) -> function D
```

为此，也需要能够在 URL 中添加变量：

```
(/user/<name>, GET) -> function D
```

我们支持三种类型的变量，即 `<var_name>`，`<var_name:int>`，和 `<var_name:path>`。

```
(/user/<name>, GET) -> function D
(/page/<num:int>, GET) -> function E
(/static/<filename:path>, GET) -> function F
```

`<var_name>` 接受任何不包含**斜杠**的字符串，`<var_name:int>` 接受正整数，`<var_name:path>` 类似第一种，但可以包含**斜杠**。你可以选择支持更多的类型，比如 `float`，`uuid` 等。

下面是 `Router` 的实现：

```python
class Router:
    """路由用于把请求匹配到一个函数。"""
    
    # patterns用于把URL变量替换为正则表达式，比如：
    # <num:int>会被转为(\d+)
    patterns = [
        (r'<\w+>', r'([\\w-]+)'),
        (r'<\w+:\s*int>', r'(\\d+)'),
        (r'<\w+:\s*path>', r'([\\w\\./-]+)'),
    ]

    def __init__(self) -> None:
        self.rules = []

    def add(self, rule: str, method: str, func: Callable) -> None:
      	# 替换URL变量为正则表达式
        for pat, repl in self.patterns:
            rule = re.sub(pat, repl, rule)
        rule = '^' + rule + '$'
        self.rules.append([re.compile(rule), method, func])

    def match(self, path: str, method: str) -> Tuple[Callable, tuple]:
        path_matched = False
        for rule, mtd, func in self.rules:
            match = rule.match(path)
            if match:
                path_matched = True
                if method == mtd:
                    # 提取匹配到的URL参数，
                    # 它们会按照顺序传给对应的函数
                    args = match.groups()
                    return func, args
        # 如果路径匹配到了，但方法没匹配，
        # 抛 405 error，即'method not allowed'。
        if path_matched:
            raise HTTPError(405)
        else:
            raise HTTPError(404)

    def __str__(self) -> str:
        return str(self.rules)

    __repr__ = __str__
```

来做个简单的测试：

```python
>>> router = Router()
>>> router.add('/', 'GET', lambda req: 'hello world')
>>> router.add(
... '/user/<id:int>/delete',
... 'POST',
... lambda req, id: f'delete user {id}'
... )
>>> func, args = router.match('/user/13/delete', 'POST')
>>> func({}, *args)
'delete user 13'
```

我们的 `Router` 很简单，如果你有兴趣，可以看看高级一些的实现，[bottle: a simple micro-framework](https://github.com/bottlepy/bottle)。

或许你有个疑问，为啥不直接支持正则表达式，还要绕个圈子，例如把 `<xxx:int>` 转成 `\d+` 呢？主要原因在于，正则表达式想写好没那么简单，尤其是模式比较复杂时，它很容易出错；更重要的是，它还可能会导致拒绝服务：[Regular expression Denial of Service ](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)。我们可能会认为正则匹配的时间复杂度是 `O(n)`，`n` 是输入字符串的长度，很多场景下确实是这样。但，有些时候它的复杂度甚至会达到 `O(n^2)`。所以，不给选择有时反而是最好的选择。

###MiniWeb

这个类，将 `Request`、`Response` 和 `Router` 串联了起来，管理从请求到响应的整个流程。

```python
class MiniWeb:
    """代表一个web应用，包含了路由，装饰器和配置等，其实例是一个WSGI的应用。
    示例：
    app = MiniWeb()
    
    @app.get('/'):
    def foo(req):
        return 'hello world'
    
    app.run()
    """

    def __init__(self, config: Optional[dict] = None):
        self.router = Router()
        # 全局错误处理器
        self.error_handlers = {}
        # 全局配置，诸如{'ENV': 'development', 'SECRET_KEY': '123', ...}
        self.config = config or {}

    def add_rule(self, rule: str, method: str, func: Callable) -> None:
        self.router.add(rule, method, func)

    def route(self, rule: str, methods: Union[str, List[str]]) -> Callable:
        """装饰器，用于添加路由规则。
        示例：
        @app.route('/upload', methods=['GET', 'POST'])
        def upload(req):
            pass
        """
        def wrapper(func):
            if isinstance(methods, list):
                for mtd in methods:
                    self.add_rule(rule, mtd, func)
            else:
                self.add_rule(rule, methods, func)
            return func

        return wrapper

    def get(self, rule: str) -> Callable:
        """装饰器，用于添加路由规则，方法为GET。
        示例：
        @app.get('/')
        def index(req):
            pass
        """
        return self.route(rule, 'GET')

    def post(self, rule: str) -> Callable:
        return self.route(rule, 'POST')

    def put(self, rule: str) -> Callable:
        return self.route(rule, 'PUT')

    def delete(self, rule: str) -> Callable:
        return self.route(rule, 'DELETE')

    def error(self, status_code: int) -> Callable:
        """装饰器，用于添加全局错误处理器。
        示例：
        @app.error(404)
        def handle_404(req, err):
            pass
        """
        def wrapper(func):
            self.error_handlers[status_code] = func
            return func

        return wrapper
      
    def wsgi(self, environ: dict, start_response: Callable) -> Iterable[bytes]:
        """即为WSGI应用，可将app.wsgi传给WSGI server。
        它的主要步骤为：
        1. 根据environ构造Request对象。
        2. 根据请求路径和方法从router中查找处理函数。
        3. 调用该函数，对返回的结果做转换和检查，生成Response对象。
        4. 若以上发生错误，根据错误码，查找并调用全局处理函数。
        5. 最后，调用start_response，并返回最终的响应数据。
        """
        request = Request(environ)
        request.app = self
        try:
            func, args = self.router.match(request.path, request.method)
            # 视图函数返回的可能是list或dict等，所以需要对结果做转换。
            response = self._cast(func(request, *args))
        except HTTPError as err:
            logging.exception(err)
            response = err
        except Exception as err:
            logging.exception(err)
            # 如果返回的不是HTTPError，将其包装为500 error。
            response = HTTPError(500, exception=err)

        if isinstance(response, HTTPError):
            # 调用错误处理函数，如果该函数有返回值，
            # 那么将该值作为最终响应。
            result = self._handle_error(request, response)
            if result:
                response = result

        start_response(response.status_line, response.header_list)
        return response.data
      
    def __call__(self, environ: dict, start_response: Callable):
        """app对象本身也是个WSGI应用，可将app传给WSGI server。"""
        return self.wsgi(environ, start_response)
      
    @staticmethod
    def _cast(response: Any) -> Response:
        if isinstance(response, Response):
            return response
        if isinstance(response, (str, bytes)):
            return Response(response)
        if isinstance(response, (list, dict)):
            return JSONResponse(response)
        raise ValueError('Invalid response')

    def _handle_error(self, req: Request, error: HTTPError) -> Optional[Any]:
        handler = self.error_handlers.get(error.status_code)
        if handler:
            result = handler(req, error)
            if result:
                return self._cast(result)
```

Serve 某个目录是太常见的功能了，所以默认支持它吧：

```python
    def serve_static(self,
                     root_path: str,
                     url_prefix: str = '/static',
                     headers: Optional[dict] = None) -> None:
        """示例：
        app.serve_static('/path/to/dir')
        
        比如存在/path/to/dir/images/me.jpg，
        用户则可以用以下URL访问：
        example.com/static/images/me.jpg
        """
        self.add_rule(
            url_prefix + '/<filename:path>',
            'GET', lambda request, filename: FileResponse(
                filename, root_path, headers, request))
```

最后，支持用标准库中的一个简单 server 来直接 run 我们的应用：

```python
    def run(self, host='127.0.0.1', port=9000):
        """示例：
        app.run()
        app.run('0.0.0.0')
        app.run(port=8888)
        """
        from wsgiref.simple_server import make_server

        sys.stderr.write('Server running on http://{}:{}/\n'.format(host, port))
        server = make_server(host, port, self)
        server.serve_forever()
```

## 例子

```python
import os
from random import random
from web import (
    MiniWeb,
    Request,
    Response,
    JSONResponse,
    HTTPError
)

app = MiniWeb()

app.serve_static(os.path.dirname(__file__))


@app.get('/')
def index(req: Request):
    return 'hello world'

@app.get('/user/<name>')
def index(req: Request, name: str):
    return {'status': 'ok', 'message': f'Hello, {name}; your ip: {req.remote_addr}'}

@app.error(404)
def handle_404(req: Request, err: HTTPError):
    resp = JSONResponse({'status': 'failed', 'message': 'page not found'})
    resp.status_code = 404
    return resp
  

app.run()
```

更多的例子可以去 [mini_web/examples.py](https://github.com/cymoo/mini_web/blob/main/examples.py) 查看。

## 总结

我们用了~600行实现了一个精简的 web 框架。它能够让你从整体上理解  web 的运作机制，几乎所有的框架都遵循着类似的处理流程，不论使用的是哪种编程语言。总体而言，它并不难，难点在于要关注很多细节，比如安全和性能优化，而这些我们并没有太多考虑。

下一章会实现一个类似 Django 或 Flask 的模板引擎。

