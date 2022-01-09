#! /usr/bin/env python3

from datetime import datetime
from fabric import Connection, task
import os

MAX_BACKUPS = 20

HOST = '47.117.133.111'
SITE_DIR = '/var/www/daydream.site'
BACK_DIR = f'{SITE_DIR}/archives'
REPO_DIR = '/var/www/repo/daydream.site'
USER = 'jie'


def build_site(gitpull=True, local=False):
    conn = Connection(host=HOST, user=USER)
    if local:
        exec_cmd = conn.local
    else:
        exec_cmd = conn.run

    if gitpull:
        exec_cmd(f'cd {REPO_DIR} && git pull')

    # XXX: when running locally, PATH is not set properly.
    exec_cmd(f'cd {REPO_DIR} && export PATH=/usr/local/node/bin:$PATH && npm install && npm run build')
    backup(exec_cmd)
    exec_cmd(f'cp -r {REPO_DIR}/public {SITE_DIR}')


def backup(exec_cmd):
    exec_cmd(f'mkdir {BACK_DIR}', hide=True, warn=True)
    backup_nums = exec_cmd(f'ls {BACK_DIR} | wc -l', hide=True).stdout

    if int(backup_nums) >= MAX_BACKUPS:
        first_dir = exec_cmd(f'ls {BACK_DIR} | head -1', hide=True).stdout.strip()
        print(f'remove the oldest backup: {first_dir}')
        exec_cmd(f'rm -rf {BACK_DIR}/{first_dir}')

    now = datetime.now().strftime('%Y-%m-%d_%H:%M:%S')
    if exec_cmd(f'test -d {SITE_DIR}/public', warn=True).exited == 0:
        exec_cmd(f'mv {SITE_DIR}/public {BACK_DIR}/{now}')


@task
def build(ctx):
    if os.environ.get('gitpull') in ('0', 'false'):
        build_site(gitpull=False)
    else:
        build_site(gitpull=True)


def test(host):
    conn = Connection(host=host, user=USER)
    conn.run('ls -l ~')
    conn.local('ls -l ~')


if __name__ == '__main__':
    pass
