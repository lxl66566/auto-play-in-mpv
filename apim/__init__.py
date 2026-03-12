import asyncio
import logging as log
from urllib.parse import parse_qs, urlencode, urlparse

import websockets
from validators import url as is_valid_url

PORT = 5777
log.basicConfig(level=log.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


async def run(url: str):
    process = await asyncio.create_subprocess_exec(
        "mpv", url, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode == 0:
        log.info(f"mpv finished playing: {url}")
    else:
        log.error(f"mpv error output: {stderr.decode()}")


def remove_url_parameters(url: str):
    parsed_url = urlparse(url)
    if "youtube.com" in parsed_url.netloc or "bilibili.com" in parsed_url.netloc:
        # 解析原始查询参数，保留空值
        query_params = parse_qs(parsed_url.query, keep_blank_values=True)
        # 只保留键为 'p' 的参数
        p_params = {k: v for k, v in query_params.items() if k == "p"}
        if p_params:
            new_query = urlencode(p_params, doseq=True)
        else:
            new_query = ""
        new_url = parsed_url._replace(query=new_query)
        return new_url.geturl()
    else:
        # 非视频网站：移除所有参数
        new_url = parsed_url._replace(query="")
        return new_url.geturl()


async def handler(websocket, path):
    try:
        async for message in websocket:
            recv = str(message).strip()
            log.info(f"Received: {recv}")
            if not is_valid_url(recv):
                log.info("Invalid URL, do nothing...")
                continue

            recv = remove_url_parameters(recv)
            await websocket.send("ACK")
            asyncio.create_task(run(recv))

    except websockets.exceptions.ConnectionClosed:
        log.info("Client disconnected.")


async def ws():
    async with websockets.serve(handler, "localhost", PORT):
        log.info(f"Server started on ws://localhost:{PORT}")
        await asyncio.Future()  # run forever


def main():
    while True:
        try:
            asyncio.run(ws())
        except KeyboardInterrupt:
            log.info("Server manually stopped.")
            break
        except Exception as e:
            log.error(f"Server got an error: {e}, restarting...")
            import time

            time.sleep(1)


if __name__ == "__main__":
    main()
