"""Paint a uniquely unwrapped body side, projecting each logo onto its local skin."""
import bpy,math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');T=R/'textures';SIDE='right';SIGN=-1
s=bpy.context.scene
def array(im):
    w,h=im.size;a=np.empty(w*h*4,np.float32);im.pixels.foreach_get(a);return a.reshape(h,w,4)
base=array(bpy.data.images['FW48 bake '+SIDE+' color'])
position=array(bpy.data.images['FW48 bake '+SIDE+' position'])
normal=array(bpy.data.images['FW48 bake '+SIDE+' normal'])
decoded=position[:,:,:3]*8-4
valid=(np.abs(decoded[:,:,0])<1.1)&(np.abs(decoded[:,:,1])<3)&(decoded[:,:,2]>-.1)&(decoded[:,:,2]<1.3)
ys,xs=np.nonzero(valid)
P=position[ys,xs,:3]*8-4;N=normal[ys,xs,:3]*2-1
C=base[ys,xs,:3].copy()
C=np.where(C<=.04045,C/12.92,((C+.055)/1.055)**2.4)
del base,position,normal
X,Y,Z=P.T;G=-Y;AX=np.abs(X);NX=np.abs(N[:,0])
def lin(rgb):
    a=np.asarray(rgb,np.float32)/255;return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
black=lin((7,9,13));blue=lin((0,84,218));white=lin((243,245,252));cyan=lin((2,185,241))
# Base paint follows measured world-space panel boundaries, independently of text.
pod=(G>-1.50)&(G<.65)&(AX>.28)&(Z>.23)&(Z<.69)&(NX>.20)
C[pod&(Z<.58)]=black
def polygon(points):
    inside=np.zeros(len(G),bool)
    for i,(gx,z) in enumerate(points):
        px,pz=points[i-1]
        inside^=((z>Z)!=(pz>Z))&(G<(px-gx)*(Z-z)/(pz-z+1e-12)+gx)
    return inside
wm=polygon([(-1.44,.34),(-1.37,.50),(-.94,.54),(-.51,.57),(-.22,.51),(.18,.43),(-.20,.36),(-.77,.34)])
cm=polygon([(-.51,.57),(.51,.625),(.58,.59),(.45,.475),(.10,.45),(-.12,.43),(-.29,.49)])
C[pod&wm]=white;C[pod&cm]=cyan
C[(G>.5)&(G<1.9)&(Z<.625)&(NX>.30)]=black
C[(G>1.85)&(Z<.38)&(NX>.45)]=black
airbox=(G>-.98)&(G<-.12)&(Z>.89)&(AX<.23)
C[airbox]=black
copper=(G>-.50)&(G<-.12)&(Z>.90)&(Z<1.085)&(AX<.20)
strength=.78+.22*np.sin((G[copper]+.5)*470)**6
C[copper]=lin((206,127,55))[None,:]*strength[:,None]

names=['Object_12','Object_4','Object_6','Object_7','Object_8']
verts=[];faces=[]
for name in names:
    o=bpy.data.objects[name];start=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices)
    faces.extend(tuple(start+i for i in p.vertices) for p in o.data.polygons if o.data.materials[p.material_index].get('FW48_side')==SIDE)
tree=BVHTree.FromPolygons(verts,faces)

specs=[
 ('atlassian',-1.10,.690,.84,.10),('atlassian_symbol',-1.09,.885,.24,.24),
 ('kraken',-.43,.680,.33,.063),('claude',-.055,.680,.30,.063),
 ('barclays',-.10,.558,.58,.090),('komatsu',-.84,.414,.67,.095),
 ('gulf',-1.47,.565,.14,.14),('wilkinson',-1.65,.865,.16,.070),
 ('duracell',-.73,.987,.235,.041),('brillio',.86,.645,.18,.061),
 ('stephens',1.01,.567,.38,.10),('keeper',.62,.245,.42,.060),
 ('nwe',2.07,.435,.20,.10),
]
report=[]
for name,g,z,w,h in specs:
    center,n,idx,dist=tree.ray_cast(Vector((SIGN*3,-g,z)),Vector((-SIGN,0,0)))
    if center is None:report.append({'logo':name,'status':'no surface'});continue
    outward=Vector((SIGN,0,0))
    if n.dot(outward)<0:n=-n
    if n.dot(outward)<.25:n=(n+outward*.5).normalized()
    n=outward
    H=Vector((0,SIGN,0));V=Vector((0,0,1))
    q=np.asarray(center,dtype=np.float32);nn=np.asarray(n,dtype=np.float32);hh=np.asarray(H,dtype=np.float32);vv=np.asarray(V,dtype=np.float32)
    radius=max(w,h)*.75+.04
    ids=np.flatnonzero((np.abs(X-q[0])<radius)&(np.abs(Y-q[1])<radius)&(np.abs(Z-q[2])<radius))
    Q=P[ids]-q;u=Q@hh/w+.5;v=Q@vv/h+.5;depth=Q@nn
    mask=(u>=0)&(u<=1)&(v>=0)&(v<=1)&(np.abs(N[ids]@nn)>.10)
    ids=ids[mask];u=u[mask];v=v[mask];depth=depth[mask]
    GU,GV=96,40;depthmap=np.full((GV,GU),np.nan,np.float32)
    for j in range(GV):
        for i in range(GU):
            origin=center+H*((i/(GU-1)-.5)*w)+V*((j/(GV-1)-.5)*h)+n*1.2
            p,normal,ix,d=tree.ray_cast(origin,-n)
            if p is not None:depthmap[j,i]=(p-center).dot(n)
    fu=u*(GU-1);fv=v*(GV-1);ui=np.minimum(fu.astype(int),GU-2);vi=np.minimum(fv.astype(int),GV-2)
    tx=fu-ui;ty=fv-vi
    expected=(depthmap[vi,ui]*(1-tx)*(1-ty)+depthmap[vi,ui+1]*tx*(1-ty)+depthmap[vi+1,ui]*(1-tx)*ty+depthmap[vi+1,ui+1]*tx*ty)
    mask=np.isfinite(expected)&(np.abs(depth-expected)<.025)
    ids=ids[mask];u=u[mask];v=v[mask]
    im=bpy.data.images.load(str(T/(name+'.png')),check_existing=True);im.reload();pixels=array(im);ph,pw=pixels.shape[:2]
    fu=u*(pw-1);fv=v*(ph-1);ui=np.minimum(fu.astype(int),pw-2);vi=np.minimum(fv.astype(int),ph-2);tx=(fu-ui)[:,None];ty=(fv-vi)[:,None]
    rgba=pixels[vi,ui]*(1-tx)*(1-ty)+pixels[vi,ui+1]*tx*(1-ty)+pixels[vi+1,ui]*(1-tx)*ty+pixels[vi+1,ui+1]*tx*ty
    # Image pixels loaded from an 8-bit file are encoded values; blend in linear light.
    rgb=np.where(rgba[:,:3]<=.04045,rgba[:,:3]/12.92,((rgba[:,:3]+.055)/1.055)**2.4)
    if name=='komatsu':rgb[:]=lin((7,20,127))
    a=rgba[:,3:4];C[ids]=C[ids]*(1-a)+rgb*a
    report.append({'logo':name,'pixels':int((a>.5).sum()),'normal':[round(f,3) for f in n],'center':[round(f,3) for f in center]})

im=bpy.data.images.get('FW48 Body '+SIDE+' final') or bpy.data.images.new('FW48 Body '+SIDE+' final',4096,4096,alpha=False,float_buffer=True)
im.colorspace_settings.name='Linear Rec.709'
result_pixels=np.ones((4096,4096,4),np.float32);result_pixels[:,:,:3]=0;result_pixels[ys,xs,:3]=C
im.pixels.foreach_set(result_pixels.ravel());im.update();im.file_format='PNG';im.filepath_raw=str(T/('body-'+SIDE+'-final-baked.png'));im.save();im.pack()
for o in [bpy.data.objects[n] for n in names]:
    layer=o.data.uv_layers.get('FW48_'+SIDE+'_BakeUV')
    if layer:
        shared=o.data.uv_layers.get('FW48_BodyBakeUV')
        if shared:
            for poly in o.data.polygons:
                if o.data.materials[poly.material_index].get('FW48_side')==SIDE:
                    for li in poly.loop_indices:shared.data[li].uv=layer.data[li].uv
        else:layer.name='FW48_BodyBakeUV'
for mat in bpy.data.materials:
    if mat.get('FW48_side')!=SIDE:continue
    nt=mat.node_tree;bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
    tex=nt.nodes.get('FW48 final color') or nt.nodes.new('ShaderNodeTexImage');tex.name='FW48 final color';tex.image=im
    uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='FW48_BodyBakeUV';nt.links.new(uv.outputs['UV'],tex.inputs['Vector']);nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    bs.inputs['Specular IOR Level'].default_value=.05
    for nd in nt.nodes:
        if nd.type=='NORMAL_MAP':nd.uv_map='UVMap'
    for l in list(bs.inputs['Normal'].links):nt.links.remove(l)
    if 'williams_paint' in mat.get('FW48_original',''):bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.62
    if 'FW48 bake target' in nt.nodes:nt.nodes.remove(nt.nodes['FW48 bake target'])
cam=s.camera;cam.data.type='ORTHO';cam.location=(SIGN*10,0,.67);cam.rotation_euler=(Vector((0,0,.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.1
s.render.resolution_x=1800;s.render.resolution_y=700;s.cycles.samples=24
s.render.filepath=str(R/('previews/'+SIDE+'-side-refinement-05.png'));bpy.ops.render.render(write_still=True)
cam.location=(SIGN*6,-7,5);cam.rotation_euler=(Vector((0,0,.50))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.0
s.render.resolution_x=1600;s.render.resolution_y=1000
s.render.filepath=str(R/('previews/'+SIDE+'-quarter-refinement-05.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'williams-fw48-2026.blend'))
result={'side':SIDE,'valid_pixels':len(ys),'decals':report,'preview':s.render.filepath}
