import asyncio
import subprocess
from urllib.parse import urlparse, urlunparse

import websockets

PORT = 5777


def remove_url_parameters(url):
    parsed_url = urlparse(url)
    # 如果路径是 youtube.com，则不处理
    if parsed_url.netloc.endswith("youtube.com"):
        return url
    new_url = parsed_url._replace(query="")
    return urlunparse(new_url)


async def handler(websocket, path):
    async for message in websocket:
        print(f"Received: {message}")

        # 使用 mpv 播放收到的字符串
        subprocess.run(["mpv", remove_url_parameters(message)])

        # 如果需要，可以向客户端发送确认消息
        await websocket.send("Received and processed")


async def ws():
    try:
        async with websockets.serve(handler, "localhost", PORT):
            print(f"WebSocket server listening on port {PORT}")
            await asyncio.Future()
    except asyncio.exceptions.CancelledError:
        print("Server stopped")
        exit(0)
    except Exception as e:
        print(f"Server got an error: {e}")


def main():
    while True:
        asyncio.run(ws())
