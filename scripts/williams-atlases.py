"""Build clean paint textures using the team's official vector partner artwork."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np

ROOT=Path('/Users/sk/PORTFOLIO/artifacts/williams');T=ROOT/'textures';O=ROOT/'reference/official-logos'
def official(name):
    im=Image.open(O/(name+'.png')).convert('RGBA');return im.crop(im.getbbox())
def recolor(im,col):
    out=Image.new('RGBA',im.size,col);out.putalpha(im.getchannel('A'));return out
mapping={'komatsu':'komatsu','rear_komatsu':'komatsu','stephens':'stephens','kraken':'kraken','brillio':'brillio','duracell':'duracell','barclays':'barclays','nwe':'nmc','airia':'airia','wilkinson':'wilkinson-sword','n_bny':'bny','betway':'betway','n_pirelli':'pirelli','nuveen':'nuveen'}
for dst,src in mapping.items():official(src).save(T/(dst+'.png'))
recolor(official('komatsu'),'#07147f').save(T/'komatsu.png')
atl=official('atlassian');atl.crop((169,0,atl.width,atl.height)).save(T/'atlassian.png');atl.crop((0,0,122,atl.height)).save(T/'atlassian_symbol.png')
for name,split,col in [('claude',.215,'#eb774e'),('keeper-security',.195,'#d1a21b')]:
    im=official(name);a=np.array(im);a[:,:int(im.width*split),:3]=tuple(bytes.fromhex(col[1:]));Image.fromarray(a).save(T/('claude.png' if name=='claude' else 'keeper.png'))
official('airia').save(T/'airia.png')
official('keeper-security').save(T/'n_keeper.png')
for src,dst in [('barclays','n_barclays'),('komatsu','n_komatsu'),('betway','n_betway'),('brillio','n_brillio')]:official(src).save(T/(dst+'.png'))
# VAST's mark and wordmark are horizontal on the nose.
vast=official('vast-data');mid=int(vast.height*.64)
icon=vast.crop((0,0,vast.width,mid));icon=icon.crop(icon.getbbox())
word=vast.crop((0,mid,vast.width,vast.height));word=word.crop(word.getbbox())
icon=icon.resize((word.height,word.height),Image.Resampling.LANCZOS)
out=Image.new('RGBA',(word.width+icon.width+30,word.height));out.alpha_composite(icon);out.alpha_composite(word,(icon.width+30,0));out.save(T/'n_vast.png')
jackpot=official('jackpot-city');jackpot=jackpot.crop((0,57,jackpot.width,152));jackpot=jackpot.crop(jackpot.getbbox());jackpot.save(T/'jackpot.png')
# Recreate the simple Gulf colour field behind the official vector mark.
gulf=official('gulf-oil-international');gulf=recolor(gulf,'#09336b')
N=1000;badge=Image.new('RGBA',(N,N));d=ImageDraw.Draw(badge)
d.ellipse((12,12,988,988),fill='#ffffff');d.ellipse((39,39,961,961),fill='#ef7425',outline='#123975',width=13)
d.rectangle((20,350,980,650),fill='white')
gulf.thumbnail((1000,1000));badge.alpha_composite(gulf,((N-gulf.width)//2,(N-gulf.height)//2));badge.save(T/'n_gulf.png')

def art(name):return Image.open(T/(name+'.png')).convert('RGBA')
def put(im,name,cx,cy,w,h,flip=False,col=None):
    logo=art(name)
    if col:logo=recolor(logo,col)
    if flip:logo=ImageOps.mirror(logo)
    logo=logo.resize((max(1,round(w)),max(1,round(h))),Image.Resampling.LANCZOS)
    im.alpha_composite(logo,(round(cx-w/2),round(cy-h/2)))

specs=[
 ('atlassian',-1.10,.690,.84,.10),('atlassian_symbol',-1.09,.885,.24,.24),
 ('kraken',-.43,.680,.33,.063),('claude',-.055,.680,.30,.063),
 ('barclays',-.10,.558,.58,.090),('komatsu',-.84,.450,.67,.115),
 ('gulf',-1.47,.565,.14,.14),('wilkinson',-1.65,.865,.16,.070),
 ('duracell',-.73,.987,.235,.041),('brillio',.86,.645,.18,.061),
 ('stephens',1.01,.567,.38,.10),('keeper',.62,.245,.42,.060),
 ('nwe',2.07,.435,.20,.10),('betway',2.37,.282,.30,.073),
 ('jackpot',2.37,.215,.39,.047),('rear_komatsu',-2.25,.865,.44,.085),
]
# Editable placement specification, in metres, with the front at positive gz.
(ROOT/'placements.json').write_text(json.dumps(specs,indent=2))
for side in ('right','left'):
    im=Image.open(T/'sidepod-paint.png').convert('RGBA').resize((8192,2048),Image.Resampling.LANCZOS)
    a=np.array(im);ys=np.linspace(1.3,0,2048)[:,None];gzs=np.linspace(-2.6,2.9,8192)[None,:]
    carbon=(ys<.50)&(gzs<.75)&(gzs> -1.7)&(a[:,:,0]<40)&(a[:,:,1]<130)&(a[:,:,2]>100)
    a[carbon,:3]=[7,9,13];im=Image.fromarray(a);d=ImageDraw.Draw(im)
    W,H=im.size
    def xy(gz,z):return ((gz+2.6)/5.5*W,(1-z/1.3)*H)
    # All exposed lower surfaces are carbon, with smooth white/cyan paint panels.
    d.rectangle((0,xy(0,.245)[1],W,H),fill='#07090d')
    # Copper with small circumferential dark ribs, camera housing in black.
    x0,y0=xy(-.50,1.085);x1,y1=xy(-.12,.90)
    d.rectangle((x0,y0,x1,y1),fill='#c57530')
    for x in range(int(x0),int(x1),9):d.line((x,y0,x,y1),fill='#e6a257',width=3)
    d.rectangle((x0,0,x1,y0),fill='#080a0d')
    # Rear endplates: solid blue cap over the broad white lower section.
    d.rectangle((*xy(-2.6,1.3),*xy(-1.90,.28)),fill='#eef2fb')
    d.polygon([xy(-2.6,1.3),xy(-1.90,1.3),xy(-1.90,.755),xy(-2.6,.825)],fill='#002a9a')
    for name,gz,z,w,h in specs:
        put(im,name,*xy(gz,z),w/5.5*W,h/1.3*H,flip=side=='left')
    # Albon name and Thai flag under the rear halo mount.
    font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',22)
    gx,gy=xy(-.12,.766)
    for i,col in enumerate(('#c72535','#fff','#193c87','#fff','#c72535')):
        d.rectangle((gx-36,gy+i*3,gx-8,gy+i*3+3),fill=col)
    d.text((gx,gy-3),'Albon',font=font,fill='white')
    im.convert('RGB').save(T/('body-'+side+'.png'))

# Dedicated halo texture prevents blue engine-cover paint crossing onto the halo.
for side in ('right','left'):
    im=Image.new('RGBA',(8192,2048),'#07090d')
    for name,gz,z,w,h in [('keeper',.16,.873,.155,.027),('airia',.54,.885,.095,.031),('claude',.74,.725,.11,.028)]:
        put(im,name,(gz+2.6)/5.5*8192,(1-z/1.3)*2048,w/5.5*8192,h/1.3*2048,flip=side=='left')
    im.convert('RGB').save(T/('halo-'+side+'.png'))

# Nose width follows the actual car's cross-section in Blender; u spans its width.
im=Image.new('RGBA',(1024,8192),'#0054da');d=ImageDraw.Draw(im)
d.line((20,0,20,8192),fill='white',width=11);d.line((1004,0,1004,8192),fill='white',width=11)
d.line((35,0,35,8192),fill='#e33842',width=6);d.line((989,0,989,8192),fill='#e33842',width=6)
for artname,gz,ratio,h in [('atlassian_symbol',1.00,.45,.10),('atlassian',1.08,.78,.029),('n_barclays',1.22,.84,.047),('n_23',1.43,.76,.165),('n_bny',1.64,.83,.075),('gulf',1.98,.65,.14),('n_komatsu',2.17,.76,.043),('n_betway',2.30,.69,.048),('n_brillio',2.43,.61,.055),('n_vast',2.55,.60,.036),('n_keeper',2.65,.60,.032),('n_pirelli',2.74,.60,.035),('n_w',2.815,.30,.04)]:
    put(im,artname,512,(gz-.90)/1.965*8192,ratio*1024,h/1.965*8192)
im.convert('RGB').save(T/'nose-final.png')

# Front wing: white leading flap, purple Kraken, and white Atlassian on carbon.
im=Image.new('RGBA',(4096,2048),'#080a0e');d=ImageDraw.Draw(im)
def wingxy(x,gz):return ((x+1)/2*4096,(gz-1.90)*2048)
d.rectangle((*wingxy(-.86,2.64),*wingxy(.86,2.86)),fill='#eef2fb')
for x in (-.50,.50):
    put(im,'atlassian',*wingxy(x,2.40),.59/2*4096,.13*2048)
    put(im,'atlassian_symbol',*wingxy(x,2.23),.17/2*4096,.16*2048)
    put(im,'kraken',*wingxy(x,2.735),.62/2*4096,.12*2048,col='#6126ca')
im.convert('RGB').save(T/'front-wing-final.png')

im=Image.new('RGBA',(4096,1024),'#080a0e');put(im,'atlassian',2048,512,3500,650);im.convert('RGB').save(T/'rear-wing-final.png')
print('Built official-logo body, halo, nose and wing textures')
