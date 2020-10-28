#! /usr/bin/env python3

from fabric import Connection, task
import os


def build_site():
    conn = Connection(host='47.116.68.177', user=os.environ['USER'])
    conn.run('cd /var/www/daydream.site && git pull && npm run build')


@task
def build(ctx):
    build_site()


if __name__ == '__main__':
    build_site()
