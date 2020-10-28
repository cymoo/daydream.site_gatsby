import os
from flask import Flask, request, abort
from hashlib import sha256
import hmac


app = Flask(__name__)


@app.route('/', methods=['POST'])
def hello_world():
    payload = request.get_data()
    if verify_signature(payload):
        build_daydream()
        return 'success'
    else:
        app.logger.error(f'Cannot verify signature from {request.remote_addr}!')
        abort(400)


def verify_signature(payload):
    signature = hmac.new(
        os.environ['SECRET_KEY'].encode(),
        payload, digestmod=sha256
    ).hexdigest()

    return request.headers['X-Hub-Signature-256'] == 'sha256=' + signature


def build_daydream():
    pass


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555)
