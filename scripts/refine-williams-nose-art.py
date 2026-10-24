from pathlib import Path
from PIL import Image, ImageDraw
import json
import numpy as np
ROOT=Path('/Users/sk/PORTFOLIO/artifacts/williams');T=ROOT/'textures'
probe=json.loads(Path('/tmp/williams-nose-probe.json').read_text())['result']['widths']
gz=np.array([p[0] for p in probe]);width=np.array([p[1] for p in probe])
# A sensor aperture must not pull the edge stripe into the middle of the nose.
med=np.array([np.median(width[max(0,i-4):i+5]) for i in range(len(width))])
width=np.maximum(width,med)
width=np.array([np.median(width[max(0,i-2):i+3]) for i in range(len(width))])
W,H=2048,8192;im=Image.new('RGBA',(W,H),'#0054da');d=ImageDraw.Draw(im)
def xy(x,g):return ((x+.25)/.5*W,(g-.90)/1.965*H)
for side in (-1,1):
    pts=[xy(side*max(.012,w-.008),g) for g,w in zip(gz,width)]
    d.line(pts,fill='#ffffff',width=10,joint='curve')
    pts=[xy(side*max(.006,w-.012),g) for g,w in zip(gz,width)]
    d.line(pts,fill='#ea3540',width=5,joint='curve')
specs=[('atlassian_symbol',.96,.14,.085),('atlassian',1.025,.22,.023),('n_barclays',1.22,.26,.047),('n_23',1.36,.24,.155),('n_bny',1.49,.235,.055),('gulf',1.98,.15,.15),('n_komatsu',2.17,.19,.043),('n_betway',2.30,.17,.048),('n_brillio',2.43,.15,.055),('n_vast',2.55,.14,.036),('n_keeper',2.65,.14,.032),('n_pirelli',2.74,.14,.035),('n_w',2.815,.06,.04)]
for name,g,w,h in specs:
    a=Image.open(T/(name+'.png')).convert('RGBA').resize((round(w/.5*W),round(h/1.965*H)),Image.Resampling.LANCZOS)
    x,y=xy(0,g);im.alpha_composite(a,(round(x-a.width/2),round(y-a.height/2)))
im.convert('RGB').save(T/'nose-refinement-01.png')
(ROOT/'nose-placements.json').write_text(json.dumps(specs,indent=2))
