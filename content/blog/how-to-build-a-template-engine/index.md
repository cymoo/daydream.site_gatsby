---
title: 从零实现 template engine
visible: true
date: 2021-05-02
description: 极简模板引擎，与 Jinja 有相似的语法
toc: true
---

本篇我们要实现一个模板引擎，它也是 web 开发中被频繁使用到技术。它与 Django 或 Flask 等框架中内置的模板语法很相似，代码在这儿 [mini_template](https://github.com/cymoo/mini_template)。

## 背景

在上一篇我们实现了一个 web 框架，但仍有个问题有待解决，即如何方便的生成 HTML 响应。比如对于这两个变量 `user = 'Rina'`，`fruit = ['apple', 'orange', 'mango']`，我们想生成以下的 HTML：

```html
<h1>Hi, Rina.</h1>
<p>Do you like:</p>
<ul>
  <li>apple</li>
  <li>orange</li>
  <li>mango</li>
</ul>
```

最朴素的想法就是拼接字符串，比如：

```python
@app.get('/')
def index(req):
    user = 'Rina'
    fruit = ['apple', 'orange', 'mango']
    
    output = '<h1>Hi, {}.</h1>'.format(user)
    output += '<p>Do you like:</p><ul>'
    
    for item in fruit:
        output += '<li>{}</li>'.format(item)

    output += '</ul>'
    
    return output
```

在 web 的上古时代，CGI 编程就用了类似的方法。对于简单的页面，这样的方法倒也还好。但如果页面比较复杂，包含了大量的逻辑、循环及其之间的嵌套，类似这样的做法，不提拼接字符串的糟糕性能，对于书写和维护也是一个噩梦。

观察 HTML，它分为两部分：静态的标签和文本；动态的数据，比如从数据库中读取的产品列表等。自然的想法就是有一个模板，它用特殊的符号标识出动态的部分，比如：

```html
<h1>Hi, {{ user }}.</h1>
<p>Do you like:</p>
<ul>
  {% for item in fruit %}
  <li>{{ item }}</li>
  {% end %}
</ul>
```

然后对这个模板加以处理，结合动态部分的数据，生成结果：

```python
@app.get('/')
def index(req):
    return render(
        'template-file.html',
        user='Rina',
        fruit = ['apple', 'orange', 'mango']
    )
```

此即为模板引擎：解析一个模板，处理特殊的标记，生成目标 HTML。它总体分为两个阶段：parse 和 render。parse 阶段输入的是模板文本，输出某种中间形式，中间形式既可以是某种数据结构，也可以是能直接执行的函数；render 阶段接受 parse 的输入，结合动态的数据，生成最终的 HTML。

实现模板引擎的常见方式有两种，本文均会给出实现：

1. 把模板直接编译为目标语言（如Python）的函数，调用之，生成最终的 HTML。
2. 把模板解析成一棵语法树，遍历该树，生成最终的 HTML。

在当下的 web 开发实践中，模板渲染越来越多的被前移到了前端，后端仅仅提供数据。不过，方法是相通的，随后的代码也可以用 JavaScript 来实现，而且几乎不需要大的改动。

## 模板语法

本文的模板引擎支持以下模板语法，另一些常见的功能，诸如 `extend`、`include` 和 `try` 等在本文实现的基础上也很好搞定，鉴于一贯的能省则省的精神，暂忽略之。

1. 表达式：`{{ expr }}`

   ```
   {{ user }}
   
   # “点”访问，对象属性或item的获取可以使用"."
   # 例如user={'name': 'foo', 'addr': ['Shanghai', 'Beijing']}
   {{ user.name }}
   {{ user.addr.1 }}
   
   # 管道
   {{ user.name | upper }}
   ```

2. 条件：`{% if expr %}`

   ```
   {% if passed %}
       <p>You passed!</p>
   {% end %}
   
   {% if score > 80 %}
       <p>Excellent!</p>
   {% elif score > 60 %}
       <p>Good!</p>
   {% else %}
       <p>Failed!</p>
   {% end %}
   ```

3. 循环：`{% for var_name in expr %}`

   ```
   {% for book in books %}
       <li>{{ book }}</li>
   {% endfor %}
   ```

4. 注释：`{# text #}`

   ```
   {# It' a comment that will not be rendered. #}
   ```

## 方法1：编译至 Python

### CodeWriter

```python
class CodeWriter:
    INDENT_STEP = 4

    def __init__(self, indents: int = 0) -> None:
        self.code = []
        self.indents = indents

    def add_line(self, line: str) -> 'CodeWriter':
        self.code.append(' ' * self.indents)
        self.code.append(line)
        self.code.append('\n')
        return self

    def indent(self) -> 'CodeWriter':
        self.indents += self.INDENT_STEP
        return self

    def dedent(self) -> 'CodeWriter':
        self.indents -= self.INDENT_STEP
        return self

    def __str__(self) -> str:
        return ''.join(str(c) for c in self.code)
```



### 生成 Python 函数

```python
import re

FRAGMENT_PATTERN = re.compile(r'({{.*?}}|{%.*?%}|{#.*?#})')
```

```python
class Template:
    global_ctx = {}

    def __init__(self, **options) -> None:
        self.options = options

    @classmethod
    def update_global_ctx(cls, ctx: dict) -> None:
        cls.global_ctx.update(ctx)

    def render(self, text: str, **ctx):
        # 为了提高性能，模板仅应被编译一次，然后被缓存起来
        code = compile(str(self.parse(text)), '<string>', 'exec')

        namespace = self.global_ctx.copy()
        namespace.update(ctx)
        namespace = {key: DotSon(value) for key, value in namespace.items()}

        exec(code, namespace)
        return namespace['render']()

    @staticmethod
    def parse(text: str) -> 'CodeWriter':
        code = CodeWriter()
        buffer = []

        def flush_buffer():
            if not buffer:
                return
            code.add_line('output.extend([{}])'.format(', '.join(buffer)))
            del buffer[:]

        code.add_line('def render():').indent()
        code.add_line('output = []')

        for fragment in FRAGMENT_PATTERN.split(text):
            if fragment.startswith('{#'):
                continue
            elif fragment.startswith('{{'):
                expr = fragment[2:-2].strip()
                buffer.append(f'str({expr})')
            elif fragment.startswith('{%'):
                flush_buffer()

                statement = fragment[2:-2].strip().strip(':')
                instruction = statement.split(maxsplit=1)[0]

                if instruction == 'if':
                    code.add_line(statement + ':')
                    code.indent()
                elif instruction in ('else', 'elif'):
                    code.dedent()
                    code.add_line(statement + ':')
                    code.indent()
                elif instruction == 'for':
                    code.add_line(statement + ':')
                    code.indent()
                elif instruction.startswith('end'):
                    code.dedent()
                else:
                    raise SyntaxError(f'cannot understand tag: {fragment}')
            else:
                if fragment.strip():
                    buffer.append(repr(fragment))

        flush_buffer()
        code.add_line('return "".join(output)')
        code.dedent()

        return code
```



## 方法2：编译至语法树

### 解析标记

### 定义节点类型

### 构造语法树

### 实现 Template 类

## 如何改进

## 示例

## 参考

本文的实现参考了以下的代码或文章，如果你想了解更多，比如如何实现更多的语法，如果提高渲染性能，如何改进调试体验，不妨深入这些优秀项目的源码。

1. [Tornado 的模板引擎：template.py](https://github.com/tornadoweb/tornado/blob/master/tornado/template.py)

2. [Django 的模板引擎：django/template](https://github.com/django/django/tree/main/django/template)

3. [Flask 默认的模板引擎：Jinja](https://github.com/pallets/jinja)

4. [500 Lines or Less: A Template Engine ](http://aosabook.org/en/500L/a-template-engine.html)

5. [How a template engine works](https://fengsp.github.io/blog/2016/8/how-a-template-engine-works/)

6. [Approach: Building a toy template engine in Python](http://alexmic.net/building-a-template-engine/)