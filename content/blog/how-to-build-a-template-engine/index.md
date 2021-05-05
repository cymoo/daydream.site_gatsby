---
title: 从零实现 template engine
visible: true
date: 2021-05-02
description: 极简模板引擎，与 Jinja 有相似的语法
toc: true
---

本篇我们要实现一个模板引擎，它也是 web 开发中被频繁使用到技术。它与 Django 或 Flask 等框架中内置的模板语法很相似，代码在这儿 [mini_template](https://github.com/cymoo/mini_template)。

## 背景

在上一篇我们实现了一个 web 框架，但仍有个问题有待解决，即如何方便的生成 HTML 响应。比如对于这两个变量 `user = 'Neo'`，`fruit = ['apple', 'orange', 'mango']`，我们想生成以下的 HTML：

```html
<h1>Hi, Neo.</h1>
<p>Fruit:</p>
<ul>
  <li>Apple</li>
  <li>Orange</li>
  <li>Mango</li>
</ul>
```

最朴素的想法就是拼接字符串，比如：

```python
@app.get('/')
def index(req):
    user = 'Neo'
    fruit = ['Apple', 'Orange', 'Mango']
    
    output = '<h1>Hi, {}.</h1>'.format(user)
    output += '<p>Fruit:</p><ul>'
    
    for item in fruit:
        output += '<li>{}</li>'.format(item)

    output += '</ul>'
    
    return output
```

在 web 的上古时代，CGI 编程就用了类似的方法。对于简单的页面，这样的方法倒也还好。但如果页面比较复杂，包含了大量的逻辑、循环及其之间的嵌套，类似这样的做法，不提拼接字符串的糟糕性能，对于书写和维护也是一个噩梦。

观察 HTML，它分为两部分：静态的标签和文本；动态的数据，比如从数据库中读取的产品列表等。自然的想法就是有一个模板，它用特殊的符号标识出动态的部分，比如：

```html
<h1>Hi, {{ user }}.</h1>
<p>Fruit:</p>
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
        user='Neo',
        fruit = ['Apple', 'Orange', 'Mango']
    )
```

此即为模板引擎：解析一个模板，处理特殊的标记，生成目标 HTML。它总体分为两个阶段：parse 和 render。parse 阶段输入的是模板文本，输出某种中间形式，中间形式既可以是某种数据结构，也可以是能直接执行的函数；render 阶段接受 parse 的输入，结合动态的数据，生成最终的 HTML。

实现模板引擎的常见方式有两种，本文均会给出实现：

1. 把模板直接编译为目标语言（如Python）的函数，调用之，生成最终的 HTML。
2. 把模板解析成一棵语法树，遍历该树，生成最终的 HTML。

在当下的 web 开发实践中，模板渲染越来越多的被前移到了前端，后端仅仅提供数据。不过，方法是相通的，随后的代码也可以用 JavaScript 来实现，而且几乎不需要大的改动。

## 模板语法

本文的模板引擎支持以下模板语法，另一些常见的功能，诸如 `extend`、`include` 和 `try` 等在本文实现的基础上也很好搞定，鉴于篇幅和简洁考量，本文暂忽略之。

1. 表达式：`{{ expr }}`

   ```
   {{ user }}
   
   # “点”访问语法，对象属性或item的获取可以使用"."
   # 例如user={'name': 'neo', 'addr': ['Shanghai', 'Beijing']}
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

这种方法比较直观 ，但它要求编程语言具有动态执行代码的能力，比如在 Python 中，函数 `exec` 等能够将字符串解析为一系列 Python 语句并执行。常见的“动态”语言均具备这种能力，比如 JavaScript、Ruby 和 Scheme 等均有的 `eval` 函数。

这种方法首先将模板转为符合 Python 语法规则的字符串，比如上面提到的模板：

```python
>>> text = """
... <h1>Hi, {{ user }}.</h1>
... <p>Fruit:</p>
... <ul>
...   {% for item in fruit %}
...   <li>{{ item }}</li>
...   {% end %}
... </ul>
... """
```

我们解析这个模板，把它翻译成以下的字符串（忽略空格和换行符）：

```python
>>> code_text = """
... def render():
...     output = []
...     output.extend(['<h1>Hi, ', str(user), '.</h1><p>Fruit:</p><ul>'])
...     for item in fruit:
...         output.extend(['<li>', str(item), '</li>'])
...     output.extend(['</ul>'])
...     return "".join(output)
... """
```

随后调用 `compile` 和 `exec` ，即可得到能够直接运行的函数 `render`。如果对它们感到陌生，这儿有个不错的文章：[What's the difference between eval, exec, and compile?](https://stackoverflow.com/questions/2220699/whats-the-difference-between-eval-exec-and-compile)

```python
>>> code = compile(code_text, '<string>', 'exec')
>>> namespace = {'user': 'Neo', 'fruit': ['Apple', 'Orange', 'Mango']}
>>> exec(code, namespace)
>>> render = namespace['render']
```

调用 `render` 函数，就得到生成的 HTML：

```python
>>> render()
<h1>Hi, Neo.</h1>
<p>Fruit:</p>
<ul>
    <li>Apple</li>
    <li>Orange</li>
    <li>Mango</li>
</ul>
```

上面的先 `compile`，然后 `exec` 的操作可以合并成一步，即 `exec(code_text, namespace)`。不过，通常应该把 `compile` 后的 `code` 对象缓存起来，以提升性能。

下面开始我们的实现。首先定义一个帮助类，很简单，它辅助我们构建 Python 代码，主要是管理缩进和添加代码行。

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

比如我们用它来“写”代码：

```python
>>> writer = CodeWriter()
>>> writer.add_line('def sum(x, y):').indent()
>>> writer.add_line('return x + y').dedent()
>>> str(writer)
def sum(x, y):
    return x + y
```

### 生成 Python 函数

接下来，解析模板，生成符合 Python 语法规则的代码。我们使用正则表达式帮我们识别并分割特殊的标记，即 `{{ }}`、`{% %}` 和 `{# #}`。

```python
import re

FRAGMENT_PATTERN = re.compile(r'({{.*?}}|{%.*?%}|{#.*?#})')
```

例如，使用这个正则对以上的模板做分割：

```python
# 输出的结果忽略了换行符和多余的空格
>>> FRAGMENT_PATTERN.split(text)
['<h1>Hi, ',                 # 静态文本
 '{{ user }}',               # 表达式
 '.</h1><p>Fruit:</p><ul>',  # 静态文本
 '{% for item in fruit %}',  # for语句
 '<li>',                     # 静态文本
 '{{ item }}',               # 表达式
 '</li>',                    # 静态文本
 '{% end %}',                # 结束标记
 '</ul>']                    # 静态文本
```

开始解析，并生成 Python 代码。

```python
class Template:
    def __init__(self, **options) -> None:
        # 模板引擎的常见设置，
        # 比如模板文件的根路径，是否需要转义HTML等，
        # 不过这里没用到它。
        self.options = options

    @staticmethod
    def parse(text: str) -> 'CodeWriter':
        code = CodeWriter()
        
        # 在解析的过程中，首先把字符串添加到buffer中，
        # 每当遇到缩进点，即if或for等时，
        # 把buffer的内容写回到code中。
        buffer = []

        def flush_buffer():
            if not buffer:
                return
            code.add_line('output.extend([{}])'.format(', '.join(buffer)))
            del buffer[:]

        code.add_line('def render():').indent()
        code.add_line('output = []')

        for fragment in FRAGMENT_PATTERN.split(text):
            # 如果是{# text #}，忽略之。
            if fragment.startswith('{#'):
                continue
            # 如果是{{ expr }}，将str(expr)添加到buffer中，
            # expr的结果可以是任意类型，所以需要转为字符串。
            elif fragment.startswith('{{'):
                expr = fragment[2:-2].strip()
                buffer.append(f'str({expr})')
            elif fragment.startswith('{%'):
                # 达到缩进点，需要缓冲buffer。
                flush_buffer()
                
                # statement形如if expr 或 for item in expr等。
                statement = fragment[2:-2].strip().strip(':')
                # instruction为if, for, end等。
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
                # 以end开始的标记表示if或for块的结束，比如：
                # {% end %}，{% endif %}，{% endfor %}。
                # 这里为了代码简洁，没有检查标记是否配对。
                elif instruction.startswith('end'):
                    code.dedent()
                else:
                    raise SyntaxError(f'cannot understand tag: {fragment}')
            else:
              	# 正则表达式分割时，会产生空字符串，同时也没必要添加连续的空白字符
                if fragment.strip():
                    buffer.append(repr(fragment))

        flush_buffer()
        code.add_line('return "".join(output)')
        code.dedent()

        return code
```

我们使用之前的模板来动手测试一下：

```python
>>> code_text = Template.parse(text)
>>> str(code_text)
def render():
    output = []
    output.extend(['<h1>Hi, ', str(user), '.</h1><p>Fruit:</p><ul>'])
    for item in fruit:
        output.extend(['<li>', str(item), '</li>'])
    output.extend(['</ul>'])
    return "".join(output)
```

### Render

完成以上的步骤，基本就搞定了，剩下的就是前文提到的对生成的代码执行 `compile` 和 `exec` 。此外，模板引擎一般均会内置一些常见的函数或变量，可以类比 Python 中的 `__builtins__` 中的东东，如 `sum`、`len`等，你不需要 import 或自定定义就可以使用。

```python
    # 模板引擎内置的公共的函数或变量，如escape_html。
    global_ctx = {}
    
    @classmethod
    def update_global_ctx(cls, ctx: dict) -> None:
        cls.global_ctx.update(ctx)

    def render(self, text: str, **ctx):
        # 注意：我们应把该code缓存在某个地方，以免重复compile。
        code = compile(str(self.parse(text)), '<string>', 'exec')
        # 将用户的context与公共的做合并
        namespace = self.global_ctx.copy()
        namespace.update(ctx)
        
        # DotSon是一个代理类，即对象可以使用dot nonation：
        # my_dict['a'] -> my_dict.a
        namespace = {key: DotSon(value) for key, value in namespace.items()}

        exec(code, namespace)
        return namespace['render']()
```

模板中大量的使用 `obj['a']['b']` 不甚友好，所以我们定义一个类，让我们可以这样 `obj.a.b`。给它起个闪亮的名字吧：DotSon，dot for JSON-like object。

```python
from collections import abc
from keyword import iskeyword


class DotSon(abc.Mapping):
    """ `DotSon`是一个特殊的类字典对象，支持dot notation。
    当获取深度嵌套的item时会有性能损失。
    >>> d = DotSon({'name': 'foo', 'hobbits': [{'name': 'bar'}]})
    >>> d.name
    'foo'
    >>> d.hobbits[0].name
    'bar'
    >>> type(d.hobbits[0]) == DotSon
    True
    """

    def __new__(cls, obj):
        if isinstance(obj, abc.Mapping):
            return super().__new__(cls)
        elif isinstance(obj, abc.MutableSequence):
            return [cls(item) for item in obj]
        else:
            return obj

    def __init__(self, mapping):
        # create a shallow copy for security
        self._data = {}
        for key, value in mapping.items():
            if not key.isidentifier():
                raise AttributeError("invalid identifier: {!r}".format(key))
            if iskeyword(key):
                key += '_'
            self._data[key] = value

    def __getattr__(self, name: str):
        if hasattr(self._data, name):
            return getattr(self._data, name)
        try:
            return DotSon(self._data[name])
        except KeyError:
            raise AttributeError('{!r} has no attribute {!r}'.format(self, name))

    def __getitem__(self, item):
        return self._data[item]

    def keys(self):
        return self._data.keys()

    def values(self):
        return self._data.values()

    def items(self):
        return self._data.items()

    def get(self, key, default=None):
        return self._data.get(key, default)

    def __len__(self):
        return len(self._data)

    def __iter__(self):
        return iter(self._data)

    def __str__(self):
        return str(self._data)
```

至此，这个简单的模板引擎就完成了，有效代码不及100行。然而它很灵活，你可以在 `{{ }}` 中写任何合法的 Python 表达式，比如 `{{ 'foo' if True else 'bar' }}`、`{{ __import__('os').listdir() }}` 等，所以我们就没有太大必要再实现管道语法等。

最后，再来个小例子：

```python
>>> text = """
... <h1>Hi, {% if user %}{{ user }}{% else %}traveler{% end %}</h1>
... <p>Fruit:</p>
... <ul>
...   {% for item in fruit %}
...   <li>{{ item }}</li>
...   {% end %}
... </ul>
... """
>>> template = Template()
>>> template.render(
...     text,
...     user='Neo',
...     fruit=['apple', 'banana']
... )
<h1>Hi, Neo</h1>
<p>Fruit:</p>
<ul>
  <li>apple</li>
  <li>banana</li>
</ul>
```

### 如何改进

1. 安全

   这是所有提供了类似 `eval` 功能的语言均会面临的问题，你没法确保字符串或用户输入中不包含恶意代码。假如模板中存在这么个恶毒的东西 `{{ __import__('shutil').rmtree('/') }}`，而且 server 又被很粗心的以 root 运行，那么首个用户访问相应的页面之时，便是核爆至日。可参考两篇不错的文章：[Eval really is dangerous](https://nedbatchelder.com/blog/201206/eval_really_is_dangerous.html)，[Be careful with exec and eval in Python](https://lucumr.pocoo.org/2011/2/1/exec-in-python/)。

   那么怎么办呢？完全不用 `eval` 或 `exec` 了吗？No，模板引擎是使用它们的少数合理的场景。通过某些方法可以降低或消除它们的危险性，比如使用白名单或黑名单，严格限制或过滤表达式中的函数。例如：`__import__`、`delattr`、`setattr`、`input`、`globals` 和 `locals` 等绝不该出现。你可以使用正则表达式来做个简单的过滤，或是使用标准库中 `ast` 模块来遍历并识别危险的 nodes。这儿有个参考：[restricted "safe" eval](https://code.activestate.com/recipes/496746-restricted-safe-/)。

   如果用好了 `eval` 或 `exec` 等，你的工具箱里便多了一把瑞士军刀。

2. 性能

   ...

3. 错误信息

   ...

## 方法2：编译至语法树

### 解析标记

### 定义节点类型

### 构造语法树

### 实现 Template 类

### 如何改进

## 示例

## 参考

本文的实现参考了以下的代码或文章，如果你想了解更多，比如如何实现更多的语法，如果提高渲染性能，如何改进调试体验，不妨深入这些优秀项目的源码。

1. [Tornado 的模板引擎：template.py](https://github.com/tornadoweb/tornado/blob/master/tornado/template.py)

2. [Django 的模板引擎：django/template](https://github.com/django/django/tree/main/django/template)

3. [Flask 默认的模板引擎：Jinja](https://github.com/pallets/jinja)

4. [500 Lines or Less: A Template Engine ](http://aosabook.org/en/500L/a-template-engine.html)

5. [How a template engine works](https://fengsp.github.io/blog/2016/8/how-a-template-engine-works/)

6. [Approach: Building a toy template engine in Python](http://alexmic.net/building-a-template-engine/)