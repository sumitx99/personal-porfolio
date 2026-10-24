"""Prepare reference-derived sponsor artwork and paint masks for the FW48 model."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path('/Users/sk/PORTFOLIO/artifacts/williams')
TEX=ROOT/'textures'; TEX.mkdir(exist_ok=True)
side=Image.open(ROOT/'reference/side-detail.png').convert('RGB')
logos={
 'atlassian':(450,188,748,234), 'atlassian_symbol':(552,99,642,184),
 'kraken':(764,195,881,223), 'claude':(891,191,1004,222),
 'barclays':(878,250,1115,291), 'komatsu':(547,296,831,354),
 'stephens':(1244,261,1401,303), 'brillio':(1244,217,1314,245),
 'keeper':(1113,374,1277,407), 'duracell':(698,91,806,110),
 'wilkinson':(359,147,419,174), 'gulf':(431,250,492,308),
 'rear_komatsu':(38,113,207,148), 'betway':(1804,366,1912,398),
 'jackpot':(1788,400,1938,421), 'nwe':(1740,288,1815,326),
 'airia':(1122,128,1168,142), 'halo_keeper':(1035,144,1099,157),
}
for name,box in logos.items():
    im=side.crop(box); a=np.asarray(im).astype(float);r,g,b=a.transpose(2,0,1)
    if name=='gulf':
        yy,xx=np.mgrid[:im.height,:im.width]
        alpha=np.clip((1-((xx-im.width/2)/(im.width*.47))**2-((yy-im.height/2)/(im.height*.47))**2)*30,0,1)
        rgb=a
    elif name=='komatsu':
        alpha=np.clip(((b-r)*.8+(b-g)*.5-52)/32,0,1)
        rgb=np.full_like(a,(5,19,123))
    else:
        alpha=np.clip((np.minimum(r,g)-.55*b-10)/18,0,1)*np.clip((np.minimum(r,g)-60)/35,0,1)
        if name in ('duracell','nwe','airia','halo_keeper'): alpha=np.clip((np.minimum(r,g)-135)/45,0,1)
        rgb=np.full_like(a,255)
        if name in ('claude','keeper','halo_keeper'):
            warm=np.clip((r-.90*g-.2*b-4)/35,0,1)
            if name=='claude': warm[:,int(im.width*.23):]=0
            else: warm[:,int(im.width*.25):]=0
            alpha=np.maximum(alpha,warm)
            rgb[warm>.15]=(237,111,66) if name=='claude' else (209,165,28)
    # Remove isolated reflected streaks outside the actual printed marks.
    labels=np.zeros(alpha.shape,dtype=int); n=0
    for y,x in zip(*np.nonzero(alpha>.25)):
        if labels[y,x]: continue
        n+=1; todo=[(y,x)];labels[y,x]=n
        while todo:
            yy,xx=todo.pop()
            for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)):
                ny,nx=yy+dy,xx+dx
                if 0<=ny<alpha.shape[0] and 0<=nx<alpha.shape[1] and alpha[ny,nx]>.25 and not labels[ny,nx]:
                    labels[ny,nx]=n;todo.append((ny,nx))
    for k in range(1,n+1):
        yy,xx=np.nonzero(labels==k)
        if len(xx)<3 or (len(xx)>0 and (xx.max()-xx.min()+1)>8*(yy.max()-yy.min()+1)):
            alpha[labels==k]=0
    if name=='claude':alpha[:8,int(im.width*.86):]=0
    out=Image.fromarray(np.dstack([rgb,np.uint8(alpha*255)]).astype('uint8'),'RGBA')
    bounds=out.getbbox()
    if bounds:out=out.crop(bounds)
    padded=Image.new('RGBA',(out.width+8,out.height+8));padded.alpha_composite(out,(4,4))
    padded.resize((padded.width*3,padded.height*3),Image.Resampling.LANCZOS).save(TEX/(name+'.png'))

# Nose typography is extracted from the frontal reference, including the actual
# number, BNY arrow, Gulf roundel, VAST emblem, Pirelli and Williams marks.
front=Image.open(ROOT/'reference/front.png').convert('RGB')
nose_crops={
 'n_atlassian':(1535,704,1670,761), 'n_barclays':(1507,803,1705,821),
 'n_23':(1532,833,1672,894), 'n_bny':(1520,905,1684,934),
 'n_gulf':(1543,1060,1658,1128), 'n_komatsu':(1534,1161,1673,1179),
 'n_betway':(1548,1210,1658,1230), 'n_brillio':(1555,1267,1654,1298),
 'n_vast':(1550,1330,1657,1356), 'n_keeper':(1550,1393,1658,1416),
 'n_pirelli':(1545,1450,1660,1481), 'n_w':(1580,1515,1626,1542),
}
for name,box in nose_crops.items():
    im=front.crop(box);a=np.asarray(im).astype(float);r,g,b=a.transpose(2,0,1)
    if name=='n_gulf':
        yy,xx=np.mgrid[:im.height,:im.width]
        alpha=np.clip((1-((xx-im.width/2)/(im.width*.495))**2-((yy-im.height/2)/(im.height*.495))**2)*60,0,1)
        rgb=a
    else:
        alpha=np.clip((np.minimum(r,g)/np.maximum(b,1)-.30)/.32,0,1)*np.clip((np.maximum.reduce([r,g,b])-30)/40,0,1)
        rgb=np.full_like(a,255)
    out=Image.fromarray(np.dstack([rgb,np.uint8(alpha*255)]).astype('uint8'),'RGBA')
    out=out.crop(out.getbbox())
    padded=Image.new('RGBA',(out.width+8,out.height+8));padded.alpha_composite(out,(4,4))
    padded.resize((padded.width*4,padded.height*4),Image.Resampling.LANCZOS).save(TEX/(name+'.png'))

# Prefer unobstructed frontal lettering for the small wordmarks.
for dst,src in [('brillio','n_brillio'),('betway','n_betway')]:
    Image.open(TEX/(src+'.png')).save(TEX/(dst+'.png'))

# Clean, explicit paint regions. The side projection is measured in world metres:
# u spans rear (-2.6) to front (+2.9), v spans ground to 1.3 m.
W,H=4096,1024
im=Image.new('RGB',(W,H),'#0054da');d=ImageDraw.Draw(im)
def xy(gz,z):return ((gz+2.6)/5.5*W,(1-z/1.3)*H)
def poly(points,col):d.polygon([xy(*p) for p in points],fill=col)
# Carbon survival-cell flanks and the black Duracell airbox.
poly([(.52,0),(2.9,0),(2.9,.31),(1.84,.43),(1.80,.625),(.52,.625)],'#07090d')
poly([(-1.03,1.3),(-1.03,1.10),(-.55,.91),(-.12,.91),(-.12,1.3)],'#080a0e')
# Swept white lower sidepod, cyan leading section, carbon outline.
poly([(-1.48,.25),(-1.45,.48),(-.93,.535),(-.50,.575),(.49,.625),(.63,.60),(.48,.38),(-.25,.24)],'#080b13')
poly([(-1.44,.34),(-1.37,.50),(-.94,.54),(-.51,.57),(-.22,.51),(.18,.43),(-.20,.36),(-.77,.34)],'#f3f5fc')
poly([(-.51,.57),(.51,.625),(.58,.59),(.45,.475),(.10,.45),(-.12,.43),(-.29,.49)],'#02b9f1')
im.save(TEX/'sidepod-paint.png')
wing=Image.new('RGB',(2048,1024),'#f0f3fa');dw=ImageDraw.Draw(wing)
# Upper-blue/lower-white boundary slopes smoothly across the endplate.
dw.polygon([(0,0),(2048,0),(2048,440),(0,600)],fill='#002d9d')
wing.save(TEX/'rear-endplate-paint.png')

# Reference wheel print: isolate the actual roulette blocks and lettering.
src=np.asarray(side).astype(float);N=1024
yy,xx=np.mgrid[:N,:N];X=(xx-N/2)/(N/2)*142+1585.94;Y=(yy-N/2)/(N/2)*142+342.86
sample=src[np.clip(np.rint(Y).astype(int),0,src.shape[0]-1),np.clip(np.rint(X).astype(int),0,src.shape[1]-1)]
r,g,b=sample.transpose(2,0,1);rad=np.hypot(X-1585.94,Y-342.86)
white_a=np.clip((np.minimum(r,g)-140)/65,0,1)
purple_a=np.clip((b-r-20)/40,0,1)*np.clip((r-g-15)/30,0,1)
alpha=np.maximum(white_a,purple_a)*((rad>68)&(rad<129))*~((Y<300)&(rad>124))
rgb=np.full_like(sample,255);rgb[purple_a>white_a]=[115,47,218]
Image.fromarray(np.dstack([rgb,alpha*255]).clip(0,255).astype('uint8'),'RGBA').save(TEX/'wheel-print.png')

# Thin red/white/blue nose edge, kept separate from the sponsor decals.
im=Image.new('RGB',(256,2048),'#0054da');d=ImageDraw.Draw(im)
d.rounded_rectangle((3,2,252,2046),radius=95,outline='#ffffff',width=5)
d.rounded_rectangle((10,5,246,2042),radius=90,outline='#e63a3c',width=3)
im.save(TEX/'nose-paint.png')

# Duracell's ribbed copper finish. Rings run around the intake, across its length.
xx=np.arange(1024);pulse=(.70+.30*np.sin(xx*.29)**6)
rgb=np.tile((pulse[:,None]*np.array([206,109,43])).clip(0,255).astype('uint8')[None,:,:],(128,1,1))
Image.fromarray(rgb).save(TEX/'duracell-copper.png')

# Keep provenance and placement editable next to the textures.
(ROOT/'reference/logo-crops.json').write_text(json.dumps(logos,indent=2))
sheet=Image.new('RGB',(1000,((len(logos)+2)//3)*140),'#343b49');d=ImageDraw.Draw(sheet)
for i,name in enumerate(logos):
    logo=Image.open(TEX/(name+'.png'));logo.thumbnail((300,95))
    x=(i%3)*333;y=(i//3)*140
    sheet.paste(logo,(x+12,y+25),logo);d.text((x+12,y+5),name,fill='white')
sheet.save(ROOT/'previews/extracted-artwork.png')
print('Prepared',len(logos),'reference-derived sponsor images')
