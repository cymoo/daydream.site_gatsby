#! /usr/bin/env python3

from datetime import datetime
from fabric import Connection, task
import os

MAX_BACKUPS = 50

HOST = '47.116.68.177'
SITE_DIR = '/var/www/daydream.site'
BACK_DIR = f'{SITE_DIR}/archives'
REPO_DIR = '/var/www/repo/daydream.site'


def build_site(host):
    conn = Connection(host=host, user=os.environ['USER'])
    conn.run(f'cd {REPO_DIR} && git pull && npm run build')
    backup(conn)
    conn.run(f'cp -r {REPO_DIR}/public {SITE_DIR}')


def backup(conn):
    backup_nums = conn.run(f'ls {BACK_DIR} | wc -l', hide=True).stdout

    if int(backup_nums) >= MAX_BACKUPS:
        first_dir = conn.run(f'ls {BACK_DIR} | head -1', hide=True).stdout.strip()
        print(f'remove the oldest backup: {first_dir}')
        conn.run(f'rm -rf {BACK_DIR}/{first_dir}')

    now = datetime.now().strftime('%Y-%m-%d_%H:%M:%S')
    if conn.run(f'test -d {SITE_DIR}/public', warn=True).exited == 0:
        conn.run(f'mv {SITE_DIR}/public {BACK_DIR}/{now}')


@task
def build(ctx):
    build_site(HOST)


if __name__ == '__main__':
    build_site(HOST)
