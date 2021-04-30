---
title: 从零实现 web server
visible: true
date: 2021-04-07
description: 极简多线程 server，实现了 WSGI 协议
---

作为本系列的开山之作，我们来实现一个简单的 web server，它应该也是本系列最简单的一篇，去除空行后，代码行数不及100，但它能与 Python 中流行的框架，如 Flask、Django 等一起工作（或许吧）。如果你没有耐心，可以去 [github](https://github.com/cymoo/mini_server) 查看。

## 什么是 web server

Web server 是运行在物理机器上的一个软件，它接收用户的请求，比如你输入的某个网址，然后生成某些内容，比如文本或图片，并将内容发送给用户。对于 web 而言，用户和 server 沟通主要使用 HTTP 协议，所以 server 主要的功能就包括根据 HTTP的规范，解析 HTTP header 和 body，发送静态文件或动态的内容。

我们要实现的 server 需要使用 socket，如果你对 socket 不了解，建议先去阅读 [Unix 网络编程](https://book.douban.com/subject/26434583/)。当然，如果你真去看，那就回不来这了。不过，作为网络编程中圣经般的存在，800+页，你可以买来一本垫显示器，很合适。关于 socket，可以暂时把其理解成一根连接客户端和服务器的管子，你可以向管子里注水（发送数据），也可以放水（读取数据），管子的另一端，也可以这么做。

如下，是一个不能够更简单的 server。

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('127.0.0.1', 5000))
sock.listen(1)
print('Server listening on port: 5000...')

while True:
    conn, addr = sock.accept()

    recv_data = conn.recv(1024)
    print(recv_data.decode())

    sent_data = b"""\
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
"""
    conn.sendall(sent_data)

    conn.close()
```

运行以上代码，在浏览器上输入 <http://127.0.0.1:5000>，你会看到熟悉的 hello world。

## 什么是 WSGI

为了让我们的 server 能与 Python 中的大部分 web 框架一起工作，我们需要遵循 WSGI 协议，全称为 Python Web Server Gateway Interface，它规定了 web server 和 web 框架之间的标准接口，以提高 web 应用在不同 web server 之间的可移植性，如果你对 Java 熟悉，可以理解它与 servlet API 类似。

WSGI 规定，web 程序需要有一个可调用对象，它可以是函数、实现 `__iter__`的类、或是实现`__call__`的类的对象。该对象接收两个参数：1. `environ`，为一个包含所有请求信息的 `dict`；2. `start_response`，为一个函数，用来发起响应，其参数包括状态码和响应的 headers。该对象需要返回一个可迭代对象。

WSGI 很简单，如下，我们使用标准库中它的简单的实现，继续来一个 hello world。

```python
from wsgiref.simple_server import make_server


def hello(environ, start_response):
    print(f'Ip: {environ["REMOTE_ADDR"]}')
    status_line = '200 OK'
    headers = [('Content-Type', 'text/html')]
    start_response(status_line, headers)
    return [b'Hello, World, Again!']


server = make_server('127.0.0.1', 5000, hello)
server.serve_forever()
```

## 从零实现

我们会部分遵守 WSGI 协议来实现一个 server，但它仍然可以与 Python 中的大部分 web 框架一起工作。为什么不完整实现呢，因为懒啊，如果你对完整的 WSGI 有兴趣，[PEP3333](https://www.python.org/dev/peps/pep-3333/) 是你的朋友，完整的实现可以去看标准库中的 wsgiref 模块，麻雀虽小五脏俱全。

### 总体流程

1. 创建一个监听套接字（listening socket）`sock = socket(...)`，并`bind` 和 `listen`。
2. 调用 `sock.accept()`，如果没有请求到来，会阻塞在原地，否则返回一个连接套接字（connected socket） `conn`。
3. 为了方便的读取请求头部信息和写入响应内容，创建两个与 socket 关联的文件，分别用于读和写：`rfile=conn.makefile('rb')`和`wfile=conn.makefile('wb')`，可以认为它们等效于`conn.recv(...)`和`conn.send(...)`；这样就可以像读取常规文件一样，按行从 socket 中读取数据，即`rfile.readline()`。
4. 调用一次`rfile.readline()`，首先解析出请求的方法和路径；然后一直调用`rfile.readline()`，解析请求的headers，直至遇到`\r\n`，这代表请求头的结束；使用上面解析到的信息，构造出该次请求的环境`environ`，它是一个`dict`；注意，我们不会继续解析该请求的内容，而是让应用或框架自行解析`environ['wsgi.input'] = rfile`。
5. 定义一个函数`start_response(status_line, response_headers)`，它会将响应的头部信息发送给客户端；然后我们调用 web 应用对象`app`：`app(start_response, environ)`，该`app`内部会根据`environ`信息，调用`start_response`，并返回一个可迭代对象，比如数组等，这将是发送给客户端的内容，比如文本，图片或视频等。
6. 使用`wfile.write(xxx)`，将上述返回的内容写入 socket；并关闭相关的文件，做善后工作等。

为了支持基本的并发请求，此 server 会使用线程池，它用一个 `Queue`轻松实现。

### 初始化

在初始化函数中创建 socket，并绑定地址和端口。值得注意的是，函数 `listen` 的参数为排队的连接数，即 server 拒绝连接之前，操作系统可以挂起的最大连接数，对于我们的 server来说，随便指定一个数值均可。

```python
import socket
import sys
from queue import Queue
from threading import Thread
from typing import Callable, Tuple, List, Dict


class MiniServer:
    REQUEST_QUEUE_SIZE = 32

    def __init__(self, server_addr: Tuple[str, int]) -> None:
        self.sock = sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(server_addr)
        sock.listen(self.REQUEST_QUEUE_SIZE)

        host, port = sock.getsockname()[:2]
        self.server_name = socket.getfqdn(host)
        self.server_port = port
```

### 准备请求环境

因为 WSGI 协议要求我们需要给 web 应用或框架提供一个 `environ`，类型为 `dict`。在解析了请求的 headers之后，调用函数 `setup_environ`，并随之传递给 web 应用。

```python
    @property
    def base_environ(self) -> dict:
        return {
            'SERVER_NAME': self.server_name,
            'SERVER_PORT': self.server_port,
            'SERVER_SOFTWARE': 'MiniServer/0.1',
            'SERVER_PROTOCOL': 'HTTP/1.0',
            'wsgi.version': (1, 0),
            'wsgi.url_scheme': 'http',
            'wsgi.multithread': True,
            'wsgi.multiprocess': False,
            'wsgi.run_once': False,
            'wsgi.errors': sys.stderr,

            # The values will be override
            'PATH_INFO': '/',
            'REQUEST_METHOD': 'GET',
            'QUERY_STRING': '',
            'CONTENT_TYPE': '',
            'CONTENT_LENGTH': 0,
            'REMOTE_ADDR': '127.0.0.1',
            'wsgi.input': sys.stdin.buffer,
        }

    def setup_environ(self, **kw) -> dict:
        environ = self.base_environ.copy()
        environ.update(kw)
        return environ
```

### 解析请求行

请求行是 HTTP 的第一行，它的形式为 `GET /index.html HTTP/1.1`，即分别是请求方法，路径和 HTTP 协议版本。

注意，该函数的参数为一个文件对象，这使得我们可以像读文件一样，`rfile.readline`，从 socket 中读取数据。当然，也可以使用 `socket.recv(num_read)`来读数据。但是，HTTP的头部都以`\r\n`来分割，而使用函数 recv 时需要传入读取的字节数，这会让解析 header 变得稍微麻烦些。

从 socket 读取的数据为字节流，所以需要将其 decode 为 `unicode`。

```python
    @staticmethod
    def parse_request_line(rfile) -> Dict[str, str]:
        line = rfile.readline().decode().strip()
        request_method, path, _ = line.split()
        parts = path.split('?', maxsplit=1)

        if len(parts) == 1:
            path_info, query_string = parts[0], ''
        else:
            path_info, query_string = parts

        return {
            'REQUEST_METHOD': request_method,
            'PATH_INFO': path_info,
            'QUERY_STRING': query_string,
        }
```

### 解析请求 headers

逐行读取，然后将 header 转成协议要求的 `XXX_XXX` 或 `HTTP_XXX_XXX` 形式。

```python
    @staticmethod
    def parse_request_headers(rfile) -> Dict[str, str]:
        headers = {}

        while True:
            line = rfile.readline().decode()
            if line in ('\r\n', '\n', ''):
                break

            key, value = line.strip().split(': ', maxsplit=1)
            key = key.upper().replace('-', '_')

            if key not in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
                key = 'HTTP_' + key
            headers[key] = value
        return headers
```

### 处理请求

该函数的参数为 `queue`，调用`queue.get()` ，会返回连接套接字，即 `conn`，和地址信息，即 `addr`。

 `handle_request`会被多个线程调用，`queue` 是线程安全的，如果没有请求到来时，线程会阻塞在 `queue.get()`处。

函数`start_response`会发送请求头，由web 框架或应用调用它，这是 server 和框架之间的约定。然后我们调用 `app` 对象，它会返回一个可迭代对象。对于请求 headers 和 body，都不加修饰的直接将其发送出去。严肃的 web server 一般都会对其进行进一步处理，比如修改或添加某些 header，修改或压缩返回的数据，和检查数据的有效性等。

这里的 `start_response`与 WSGI 规范不一致，规范要求它要返回一个 `write` 函数，用来写数据。而且，一些错误检查和异常处理也被忽略了。

```python
    def handle_request(self, queue: Queue) -> None:
        while True:
            conn, addr = queue.get()
            rfile = conn.makefile('rb')
            wfile = conn.makefile('wb')

            def start_response(status_line: str,
                               response_headers: List[Tuple[str, str]],
                               exc_info=None):
                response = f'HTTP/1.0 {status_line}\r\n'
                for header in response_headers:
                    response += f'{header[0]}: {header[1]}\r\n'
                response += '\r\n'
                wfile.write(response.encode())

            environ = self.setup_environ(**self.parse_request_line(rfile),
                                         **self.parse_request_headers(rfile))
            environ['REMOTE_ADDR'] = addr[0]
            environ['wsgi.input'] = rfile

            try:
                result = self.app(environ, start_response)
                for data in result:
                    wfile.write(data)
            finally:
                if hasattr(result, 'close'):
                    result.close()
                rfile.close()
                wfile.close()
                conn.close()
```

### 线程池

我们线程池的实现很呆萌，它容量固定，不支持动态的扩容和收缩，也没有超时或重启机制。但在很多情况下，也够用了。

为什么不每个请求创建一个线程呢？如果那样的话，可能会有人试图发送大量请求，从而创造大量线程导致服务器资源枯竭。Web 的世界狂野而危险。通过预先初始化的线程池，可以缓解这种攻击。同时线程池也不应过大，假如数千个线程同时被唤醒并立即在 CPU 上执行，辅之以 Python 的传家宝---全局解释锁，那画面也挺美的。

Python 标准库 `concurrent.futures`中有个类 `ThreadPoolExecutor`，也可以选择使用它，而且相比我们的手工实现，它多了几个好用的功能。但是文章标题是__从零实现__，为了提高逼格，标准库能不用就不用。

```python
    def make_threads(self, num_threads: int) -> Queue:
        queue = Queue()
        for _ in range(num_threads):
            thread = Thread(target=self.handle_request, args=(queue, ))
            thread.daemon = True
            thread.start()
        return queue
```

### Run forever

```python
    def set_application(self, app: Callable) -> None:
        self.app = app

    def run_forever(self, num_threads: int = 16) -> None:
        print(f'Serving HTTP server on port {self.server_port}...')
        queue = self.make_threads(num_threads)
        while True:
            conn, addr = self.sock.accept()
            queue.put((conn, addr))
```

OK，以上就是全部代码，让我们试试让它与 Flask 一起工作。

## 例子

以下为一个简单的 hello world，文件上传。

```python
from flask import Flask, jsonify, request
from server import MiniServer


app = Flask(__name__)


@app.route('/')
def index():
    return 'Hello, World!'


# test file uploads
@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'GET':
        return """
        <html>
            <head><title>upload file</title></head>
            <body>
                <h1>upload file</h1>
                <form action="/upload" method="post" enctype="multipart/form-data">
                    <input type="file" name="file" />
                    <hr>
                    <button type="submit">submit</button>
                </form>
            </body>
        </html>
        """
    else:
        file = request.files['file']
        file.save(file.filename)
        return jsonify(status='ok', message='file uploaded')


server = MiniServer(('0.0.0.0', 8888))
server.set_application(app)
server.run_forever()
```



## 遗漏了啥

太多了，此处就不说了，有兴趣可以看产品级的实现，[Gunicorn](https://docs.gunicorn.org/en/latest/install.html)，简单易用功能也丰富。

以后的文章中，我们会用协程和`epoll`实现另一种风格的 web server，会比本篇有趣。在下一篇，先来实现一个类似于 Flask 的 web 框架。

