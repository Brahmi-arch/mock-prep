import os
import httpx

asset_prefix = "https://www.figma.com/api/mcp/asset/52f3dbd4-5800-470c-8e86-52ac3c2803f0"
assets = [
    "6f2ab.svg", "dd36d.svg", "e2a5e.svg", "e255f.svg", "0c4dd.svg",
    "ff95a.svg", "3c6a6.svg", "4327e.svg", "7bcaf.svg", "5a506.svg",
    "7b6a7.svg", "0325a.svg", "ea296.svg", "e3b6a.svg", "2a669.svg",
    "9e058.svg", "1aa9a.svg", "37bee.svg", "dfd72.svg", "e9bc8.svg",
    "076ab.svg", "e29a2.svg", "ca19c.svg", "513c9.svg", "cc633.svg",
    "79ed1.svg", "d50cc.svg", "f7cb5.svg", "e1d93.svg", "ceb64.svg",
    "4f6ad.svg", "512d1.svg", "14d9b.svg", "3b26a.svg"
]

os.makedirs("static/assets", exist_ok=True)

with httpx.Client(timeout=30) as client:
    for a in assets:
        url = f"{asset_prefix}/{a}"
        r = client.get(url)
        if r.status_code == 200:
            with open(f"static/assets/{a}", "wb") as f:
                f.write(r.content)
            print(f"Downloaded {a} ({len(r.content)} bytes)")
        else:
            print(f"Failed {a}: {r.status_code}")
