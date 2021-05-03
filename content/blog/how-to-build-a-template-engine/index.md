---
title: 从零实现 template engine
visible: true
date: 2021-05-02
description: 极简模板引擎，与 Jinja2 有相似的语法
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

然后在函数中使用数据来生成最终的 HTML：

```python
@app.get('/')
def index(req):
    return render(
        'template-file.html',
        user='Rina',
        fruit = ['apple', 'orange', 'mango']
    )
```

本篇我们就会实现一个模板引擎，即解析一个模板，处理特殊的标记，然后生成目标 HTML。

实现模板引擎的常见方式有两种：

1. 把模板直接编译为目标语言（如Python）的函数，调用之，即可生成最终的 HTML。
2. 把模板解析成一棵语法树，遍历该树，生成最终的 HTML。

在当下的 web 开发实践中，模板渲染越来越多的被前移到了前端，后端仅提供数据。不过，本文介绍的方法是通用的，随后的代码也可以用 JavaScript 来实现，而且代码几乎不需要大的改动。

## 方法1：编译至 Python

### CodeWriter

### 生成 Python 函数

## 方法2：编译至语法树

### 解析标记

### 定义节点类型

### 构造语法树

### 实现 Template 类

## 如何改进

## 示例

## 总结