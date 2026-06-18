import asyncio
import os
import base64
import urllib.request
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT = "/app/frontend/public"

PAIRS = [
    {
        "after": "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "name": "1",
        "prompt": "Edit this exact same bedroom photo, keeping the identical room, furniture, camera angle, lighting and composition. Make it look messy and dirty BEFORE cleaning: add scattered clothes on the bed and floor, crumpled blankets, some empty bottles and trash, scattered papers, dust and dirt on surfaces, an unmade bed and general clutter. Photorealistic, same perspective.",
    },
    {
        "after": "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "name": "2",
        "prompt": "Edit this exact same office/interior photo, keeping the identical room, furniture, camera angle, lighting and composition. Make it look messy and dirty BEFORE cleaning: add scattered papers and trash on the floor, coffee cups, clutter on desks, overflowing bin, dust and stains on the floor and surfaces, general disorder. Photorealistic, same perspective.",
    },
]


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r:
        data = r.read()
    with open(path, "wb") as f:
        f.write(data)
    return data


async def main():
    for p in PAIRS:
        after_path = f"{OUT}/after-{p['name']}.png"
        before_path = f"{OUT}/before-{p['name']}.png"
        print("downloading after", p["name"])
        clean_bytes = download(p["after"], after_path)
        b64 = base64.b64encode(clean_bytes).decode("utf-8")

        chat = LlmChat(api_key=API_KEY, session_id=f"before-{p['name']}", system_message="You are an expert photo editor.")
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        msg = UserMessage(text=p["prompt"], file_contents=[ImageContent(b64)])
        print("editing before", p["name"])
        text, images = await chat.send_message_multimodal_response(msg)
        if images:
            img_bytes = base64.b64decode(images[0]["data"])
            with open(before_path, "wb") as f:
                f.write(img_bytes)
            print("saved", before_path, len(img_bytes), "bytes")
        else:
            print("NO IMAGE returned for", p["name"], "text:", str(text)[:120])


if __name__ == "__main__":
    asyncio.run(main())
