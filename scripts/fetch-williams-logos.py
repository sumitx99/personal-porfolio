"""Download partner vector artwork published by Williams, preserving provenance."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json, re, urllib.request

root=Path('/Users/sk/PORTFOLIO/artifacts/williams/reference/official-logos')
root.mkdir(exist_ok=True)
logos=json.loads(Path('/tmp/williams-partner-logos.json').read_text())
manifest={}
def get(item):
    name,value=item
    ref=value['asset']['_ref'].removeprefix('image-')
    asset,ext=ref.rsplit('-',1)
    url='https://cdn.sanity.io/images/fnx611yr/productionv2/'+asset+'.'+ext
    filename=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')+'.'+ext
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req,timeout=35) as response:
        (root/filename).write_bytes(response.read())
    return name,{'url':url,'file':filename,'source':'https://www.williamsf1.com/partners'}
with ThreadPoolExecutor(max_workers=5) as pool:
    for name,value in pool.map(get,logos.items()):manifest[name]=value;print(name,flush=True)
(root/'sources.json').write_text(json.dumps(manifest,indent=2))
