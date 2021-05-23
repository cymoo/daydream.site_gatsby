---
title: hello world
visible: true
date: 2021-04-03
description: I create then I understand
---

> “当我不能创造时，我也无法真正理解“ --- Richard Feynman

接下来的一些天内，我们会从零开始实现一些有趣的东西。这里说的“零“指的是不会使用除了编程语言及其标准库之外的东西。当然，与产品级的实现相比，我们的可能是个 toy，然而一叶不一定会障目，说不定你会因为发现一片新奇、美丽的叶子，而喜欢上了探索整片森林呢。

- [x] [Web server，支持基本的并发](/web-server/)
- [x] [Web 框架，简单易用，包含路由、表单和文件处理等](/web-framework/)
- [x] [Template engine，模板渲染引擎，与 Jinja2 类似](/template-engine/)
- [x] [ORM，对象映射，使用 type hints 来定义数据模型](/object-mapper)
- [x] [Task scheduler 及异步 server，基于协程](#)
- [ ] 爬虫框架，多线程下载，多进程解析，简单易用
- [ ] 前端 JavaScript 框架，数据驱动，与 React 有相似的 API
- [ ] 富文本编辑器，基于**受控**的 contenteditable 来实现
- [ ] Linux shell，实现管道，重定向，进程管理等
- [ ] 简单的解释器，使用 Lisp 语法风格
- [ ] 极简的深度学习框架，实现自动微分，支持基本算子，并用它训练若干经典网络
- [ ] More...

每一篇的代码将被尽量控制在600行以内，为了实现的简洁，错误检查、运行效率和复杂的特性等一般都会被忽略掉，当然这些在严肃的框架中是至关重要的。关于语言，web 后端使用 Python，前端用 JavaScript，解释器用 Java，数据库和 shell 的实现用 C。

系列的内容将会不断更新，相关的代码在 [我的 github](https://github.com/cymoo) 上可以找到，如果对实现有疑问，可在对应的代码仓下创建 issue。

让我们开启这一段旅程吧。

> 我听过，然后我忘却

![see](./hear.png)

> 我看过，然后我记得

![see](./see.png)

> 我动手，然后我理解

![do](./do.png)
=======
---

ps. 为什么要写这个系列呢？时光飞逝，在把它们遗忘干净之前，是得搜寻下记忆的碎片，还原粗略的拼图，封存以作纪念了。

参考

1. 文中的漫画来源于 <https://ruslanspivak.com/lsbaws-part1/>