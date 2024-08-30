import asyncio
import logging
import logging as log
import subprocess
from typing import Any
from urllib.parse import urlparse, urlunparse

import websockets
from validators import url as is_valid_url

PORT = 5777
log.basicConfig(level=log.INFO)


def run(s: str, **kwargs):
    kwargs.setdefault("check", True)
    kwargs.setdefault("shell", True)
    try:
        result: Any = subprocess.run(s, **kwargs)
        return result
    except subprocess.CalledProcessError as e:
        logging.error(
            f"Command '{e.cmd}' returned non-zero exit status {e.returncode}."
        )
        raise


def remove_url_parameters(url):
    parsed_url = urlparse(url)
    # 如果路径是 youtube.com，则不处理
    if parsed_url.netloc.endswith("youtube.com"):
        return url
    new_url = parsed_url._replace(query="")
    return urlunparse(new_url)


async def handler(websocket, path):
    async for message in websocket:
        log.info(f"Received: {message}")
        if not is_valid_url(message):
            log.info("Invalid URL, do nothing...")
            continue
        parsed = remove_url_parameters(message)

        # 使用 mpv 播放收到的字符串
        run(f"mpv {parsed}")


async def ws():
    try:
        async with websockets.serve(handler, "localhost", PORT):
            await asyncio.Future()
    except asyncio.exceptions.CancelledError:
        log.info("Server stopped")
        exit(0)
    except websockets.exceptions.ConnectionClosedError:
        pass
    except Exception as e:
        log.error(f"Server got an error: {e}")


def main():
    while True:
        asyncio.run(ws())
