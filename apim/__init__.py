import asyncio
import logging as log
from urllib.parse import urlparse, urlunparse

import websockets
from validators import url as is_valid_url

PORT = 5777
log.basicConfig(level=log.INFO)


async def run(command: str):
    process = await asyncio.create_subprocess_shell(
        command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode == 0:
        print(f"Command output: {stdout.decode()}")
    else:
        print(f"Error output: {stderr.decode()}")


def remove_url_parameters(url: str):
    parsed_url = urlparse(url)
    # 如果路径是 youtube.com，则不处理
    if parsed_url.netloc.endswith("youtube.com"):
        return url
    new_url = parsed_url._replace(query="")
    return urlunparse(new_url)


async def handler(websocket: websockets.WebSocketServerProtocol, path):
    async for message in websocket:
        recv = str(message).strip()
        log.info(f"Received: {recv}")
        if not is_valid_url(recv):
            log.info("Invalid URL, do nothing...")
            continue
        recv = remove_url_parameters(recv)
        handle = asyncio.create_task(websocket.send("ACK"))
        shell = run(f"mpv {recv}")
        await asyncio.gather(handle, shell)


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
