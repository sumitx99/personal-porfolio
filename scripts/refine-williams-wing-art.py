from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');T=R/'textures'
W,H=4096,2048
yy,xx=np.mgrid[:H,:W];weave=((xx+yy)//5)%2
rgb=np.where(weave[...,None],np.array([13,16,21]),np.array([7,9,13])).astype('uint8')
im=Image.fromarray(rgb).convert('RGBA');d=ImageDraw.Draw(im)
d.rectangle((0,int(.72*H),W,H),fill='#f0f2f9')
def put(name,x,t,w,h,col=None):
    logo=Image.open(T/(name+'.png')).convert('RGBA')
    if col:
        new=Image.new('RGBA',logo.size,col);new.putalpha(logo.getchannel('A'));logo=new
    logo=logo.resize((round(w/2*W),round(h*H)),Image.Resampling.LANCZOS)
    im.alpha_composite(logo,(round((x+1)/2*W-logo.width/2),round(t*H-logo.height/2)))
for x in (-.385,.385):
    put('atlassian_symbol',x,.135,.125,.18)
    put('atlassian',x,.405,.39,.14)
    put('kraken',x,.855,.40,.15,'#5927c9')
im.convert('RGB').save(T/'front-wing-refinement-01.png')
# Separate outside and inside faces prevent sponsor text crossing onto fences.
for side in ('left','right'):
    im=Image.new('RGBA',(2048,1024),'#080b10')
    for name,g,z,w,h in [('betway',2.37,.282,.30,.070),('jackpot',2.37,.215,.37,.040)]:
        logo=Image.open(T/(name+'.png')).convert('RGBA')
        if side=='left':logo=logo.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        logo=logo.resize((round(w/.95*2048),round(h/.35*1024)),Image.Resampling.LANCZOS)
        im.alpha_composite(logo,(round((g-1.95)/.95*2048-logo.width/2),round((.45-z)/.35*1024-logo.height/2)))
    im.convert('RGB').save(T/('front-endplate-'+side+'.png'))
print('Prepared swept wing flap artwork')
