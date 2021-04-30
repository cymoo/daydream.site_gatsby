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
   # 当访问 / 且请求方法为 GET 时，会调用函数 foo
   @app.get('/')
   def foo(req): pass
   
   # 支持 URL 参数
   @app.post('/user/<name>')
   def bar(req, name): pass
   
   # 当访问 /upload 且方法为 GET 或 POST 时，会调用函数 baz
   @app.route('/upload', methods=['GET', 'POST'])
   def baz(req): pass
   ```

2. 显式的传递 `Request`对象

   我们没有像 Flask 一样使用 thread local，即 `request` 可以像全局变量一样使用，但它的每个属性却是线程独立的，可被多个线程读写而不互相干扰。它是个很好的设计，当为框架编写扩展时尤为方便。正因如此，它只能与使用了线程（或 greenlet）的 server 做搭档，在后面的文章中，我们会实现一个异步IO的 server 和框架，这样本文的代码就可以得到最大程度的复用。

   ```python
   @app.route('/user/<name>', methods=['GET', 'POST'])
   def user(req: Request, name: str):
       print(req.cookies)
       # req.GET 为一个解析了 query string 的 dict
       print(req.GET)
       # req.POST 为一个包含了用户上传的表单和文件的 dict
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

回忆以下，`environ` 包含了类似以下的内容：

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
class Request:
    def __init__(self, environ: dict) -> None:
        self._environ = environ
    
    # cached_property 的使用与 property 一样，但它只有第一次访问时才被计算；
    # 随后被缓存起来，避免重复计算。稍后会给出它的实现。
    @cached_property
    def headers(self) -> dict:
        rv = {}

        for key, value in self._environ.items():
            # environ 中大部分请求头以 HTTP_ 开始，为了看起来好看些，我们把前缀移除。
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
        # PATH_INFO 中的特殊字符一般都会被转义，比如空格会表示为 %20；
        # 这里使用标准库中的 unquote 函数把它还原。
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
		
    # Server 一般运行在反向代理的后面，为了获取真实的客户端IP，
    # 首先检查 HTTP_X_FORWARDED_FOR，因为可能存在多层代理，所以取第一个，它最有可能是真实IP，
    # 如果没有，再取 REMOTE_ADDR。当然，IP地址可以轻松的任意伪造，所以别太信赖它。
    @property
    def remote_addr(self) -> str:
        env = self._environ
        xff = env.get('HTTP_X_FORWARDED_FOR')

        if xff is not None:
            addr = xff.split(',')[0].strip()
        else:
            addr = env.get('REMOTE_ADDR', '0.0.0.0')
        return addr
    
    # HTTP_COOKIE 是类似于 "a=1; b=3" 这种形式的字符串，我们把它解析为 {'a': 1, 'b': 3}，
    # 为了偷懒，继续使用标准库，当然自己解析也很简单。
    @cached_property
    def cookies(self) -> dict:
        http_cookie = self._environ.get('HTTP_COOKIE', '')
        return {
            cookie.key: unquote(cookie.value)
            for cookie in SimpleCookie(http_cookie).values()
        }
    
    # 解析 query string，使用标准库中的 parse_qs 函数，
    # 它会把 "name=foo&num=1&num=3" 解析为 {'name': ['foo'], 'num': ['1', '3']}；
    # 为了方便使用，当value是仅包含一个元素的数组时，提取出那个元素。
    # 命名规范：PEP8 建议函数名是小写字母，但 Django 等框架这样命名的，我们约定俗成。
    @cached_property
    def GET(self) -> dict:
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
        # 某些情况下，客户端开始发送数据时，无法知道其长度，例如该数据是根据某些条件动态产生的，
        # 这时数据就以若干系列分块的形式发送，此时请求头中就没有 Content-Length，
        # 取而代之的是 Transfer-Encoding: chunked，
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

        # 写完再读，需置指针回到开头，否则 EOF。
        fp.seek(0)
        # 替换掉原始的 wsgi.input，其使命已完成，不再能被读取。
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
            # 后面会实现 HTTPError。
            raise HTTPError(400, 'Invalid JSON', exception=err)
```

最后解析表单域或文件，即 ` Content-Type` 为 `application/x-www-form-urlencoded`，或 `multipart/form-data`。form-urlencoded 十分简单，它与 query string 的格式一样，即形如 `name1=value1&name2=value2`，而 form-multipart 解析就复杂的多。 

比如通过 HTML form 长这样：

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
    # 使用标准库解析表单或文件，比如对于以上的form，它会返回如下的dict：
  	# {'description': 'some text', 'myFile': <FileStorage>}，
    # 其中 req.POST['myfile'] 是FileStorage的一个实例，可以直接调用它的save方法保存文件。
    @cached_property
    def POST(self) -> dict:
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

最后是几个简单的方法：

```python
    def __iter__(self) -> Iterable:
        return iter(self._environ)

    def __len__(self) -> int:
        return len(self._environ)

    def __str__(self) -> str:
        return '<{}: {} {}>'.format(self.__class__.__name__, self.method, self.path)

    __repr__ = __str__
```



###Response

...

###Router

...

###MiniWeb

...

