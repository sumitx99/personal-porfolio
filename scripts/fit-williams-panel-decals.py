"""Fit separate sponsor films to the exterior panels; never project side art over the roof."""
import bpy, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path('/Users/sk/PORTFOLIO/artifacts/williams'); TEX=ROOT/'textures'
scene=bpy.context.scene

def linear(hexcode):
    rgb=[int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)

def paint(name,color,metallic=0,roughness=.38):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
    shader=nodes.new('ShaderNodeBsdfPrincipled');out=nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(shader.outputs['BSDF'],out.inputs['Surface'])
    shader.inputs['Base Color'].default_value=linear(color)
    shader.inputs['Metallic'].default_value=metallic;shader.inputs['Roughness'].default_value=roughness
    shader.inputs['Coat Weight'].default_value=.15;shader.inputs['Coat Roughness'].default_value=.24
    return mat

mats={'blue':paint('FW48 Panel | Blue','0054da'),
      'black':paint('FW48 Panel | Carbon','07090d',.05,.45),
      'white':paint('FW48 Panel | White','f3f5fc'),
      'cyan':paint('FW48 Panel | Cyan','02b9f1'),
      'copper':paint('FW48 Panel | Copper','ce7f37',.7,.3)}

def inside(g,z,points):
    hit=False
    for i,(x,y) in enumerate(points):
        px,py=points[i-1]
        if (y>z)!=(py>z) and g<(px-x)*(z-y)/(py-y)+x:hit=not hit
    return hit
white=[(-1.44,.34),(-1.37,.50),(-.94,.54),(-.51,.57),(-.22,.51),(.18,.43),(-.20,.36),(-.77,.34)]
cyan=[(-.51,.57),(.51,.625),(.58,.59),(.45,.475),(.10,.45),(-.12,.43),(-.29,.49)]
body_names=['Object_12','Object_4','Object_6','Object_7','Object_8']
for name in body_names+['DRS_Flap']:
    obj=bpy.data.objects.get(name)
    if not obj:continue
    mesh=obj.data;mw=obj.matrix_world;nm=mw.to_3x3().inverted().transposed()
    for mat in mats.values():
        if mat.name not in mesh.materials:mesh.materials.append(mat)
    for face in mesh.polygons:
        old=mesh.materials[face.material_index]
        if old.name.startswith(('FW48 FINAL | Nose','FW48 Front Wing |')):continue
        is_skin=(name=='DRS_Flap' and old.name.startswith('mercedes_carbon')) or old.get('FW48_side') or old.name.startswith(('FW48 FINAL | Body','FW48 FINAL | Copper','FW48 Side Refinement','FW48 FINAL | Rear wing','FW48 Panel |'))
        p=mw@face.center;n=(nm@face.normal).normalized()
        rear_endplate=-p.y< -1.90 and abs(p.x)>.5 and .28<p.z<1.18 and abs(n.x)>.35
        if not is_skin and not rear_endplate:continue
        p=mw@face.center;n=(nm@face.normal).normalized();g=-p.y;ax=abs(p.x)
        original=old.get('FW48_original',old.name)
        key='blue' if name=='Object_12' or 'williams_paint' in original else 'black'
        if -.98<g<-.12 and p.z>.89 and ax<.25:key='black'
        if -.50<g<-.12 and .90<p.z<1.085 and ax<.20:key='copper'
        if -1.50<g<.65 and ax>.28 and .23<p.z<.69:
            key='black'
            if inside(g,p.z,white):key='white'
            if inside(g,p.z,cyan):key='cyan'
        if .5<g<1.9 and p.z<.625:key='black'
        if g>1.85 and p.z<.38:key='black'
        if g< -1.9 and p.z>.27:
            key='black'
            if ax>.5 and abs(n.x)>.3:key='blue' if p.z>.75 else 'white'
        face.material_index=mesh.materials.find(mats[key].name)
    mesh.update()

collection=bpy.data.collections.get('FW48 | Panel stickers')
if not collection:
    collection=bpy.data.collections.new('FW48 | Panel stickers');scene.collection.children.link(collection)
for obj in list(collection.objects):bpy.data.objects.remove(obj,do_unlink=True)

# Rays only see the actual body skin, excluding the nose, front wing, tyres and cockpit.
verts=[];polys=[]
for name in body_names+['DRS_Flap']:
    obj=bpy.data.objects.get(name)
    if not obj:continue
    offset=len(verts);verts.extend(obj.matrix_world@v.co for v in obj.data.vertices)
    for face in obj.data.polygons:
        mat=obj.data.materials[face.material_index]
        if mat.name.startswith('FW48 Panel |'):
            polys.append(tuple(offset+i for i in face.vertices))
tree=BVHTree.FromPolygons(verts,polys)

materials={};report=[]
def sticker(label,art,g,z,width,height,side,top=False):
    if art not in materials:
        mat=paint('FW48 Sticker | '+art,'ffffff',0,.42)
        nt=mat.node_tree;bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
        tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TEX/(art+'.png')),check_existing=False);tex.image.pack();tex.extension='CLIP'
        uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='StickerUV';nt.links.new(uv.outputs['UV'],tex.inputs['Vector'])
        nt.links.new(tex.outputs['Color'],bs.inputs['Base Color']);nt.links.new(tex.outputs['Alpha'],bs.inputs['Alpha'])
        bs.inputs['Coat Weight'].default_value=0;bs.inputs['Specular IOR Level'].default_value=0
        out=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL')
        transparent=nt.nodes.new('ShaderNodeBsdfTransparent');mix=nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(tex.outputs['Alpha'],mix.inputs[0]);nt.links.new(transparent.outputs[0],mix.inputs[1]);nt.links.new(bs.outputs['BSDF'],mix.inputs[2]);nt.links.new(mix.outputs[0],out.inputs['Surface'])
        for link in list(bs.inputs['Alpha'].links):nt.links.remove(link)
        bs.inputs['Alpha'].default_value=1
        materials[art]=mat
    if not top:
        center,_,_,_=tree.ray_cast(Vector((side*3,-g,z)),Vector((-side,0,0)))
        if center is None:raise RuntimeError('No panel under '+label)
        tangent_normal=Vector((side,0,0));horizontal=Vector((0,side,0));vertical=Vector((0,0,1))
    vs=[];uvs=[];faces=[]
    # Copy and clip actual body triangles instead of interpolating a sampled grid.
    # Every sticker triangle now follows the same surface as the car underneath.
    def clip(vertices,axis,bound,keep_greater):
        out=[]
        for i,b in enumerate(vertices):
            a=vertices[i-1];aa=a[1+axis];bb=b[1+axis]
            ina=aa>=bound if keep_greater else aa<=bound
            inb=bb>=bound if keep_greater else bb<=bound
            if ina!=inb:
                t=(bound-aa)/(bb-aa)
                out.append((a[0].lerp(b[0],t),a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t))
            if inb:out.append(b)
        return out
    for indices in polys:
        for k in range(1,len(indices)-1):
            points=[Vector(verts[i]) for i in (indices[0],indices[k],indices[k+1])]
            n=(points[1]-points[0]).cross(points[2]-points[0])
            if n.length<1e-10:continue
            n.normalize();middle=sum(points,Vector())/3
            if top:
                if n.z<.6 or middle.y<2.0 or middle.z<.72:continue
                coords=[(p,(p.x/width)+.5,1-((-p.y-g)/height+.5)) for p in points]
                direction=Vector((0,0,-1));origin=middle+Vector((0,0,.25))
            else:
                if n.x*side<.15:continue
                coords=[(p,(p-center).dot(horizontal)/width+.5,(p.z-z)/height+.5) for p in points]
                if max(abs((p-center).dot(tangent_normal)) for p in points)>.40:continue
                direction=-tangent_normal;origin=middle+tangent_normal*.25
            if max(c[1] for c in coords)<0 or min(c[1] for c in coords)>1 or max(c[2] for c in coords)<0 or min(c[2] for c in coords)>1:continue
            hit,_,_,_=tree.ray_cast(origin,direction)
            if hit is None or (hit-middle).length>.006:continue
            for axis,bound,greater in [(0,0,True),(0,1,False),(1,0,True),(1,1,False)]:
                coords=clip(coords,axis,bound,greater)
                if not coords:break
            if len(coords)<3:continue
            offset=len(vs)
            for point,u,v in coords:
                vs.append(tuple(point+n*.0015));uvs.append((u,v))
            faces.append(tuple(range(offset,len(vs))))
    mesh=bpy.data.meshes.new('FW48 Film | '+label);mesh.from_pydata(vs,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='StickerUV')
    for face in mesh.polygons:
        for li in face.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
    obj=bpy.data.objects.new('FW48 Sticker | '+label,mesh);collection.objects.link(obj);mesh.materials.append(materials[art])
    obj['artwork']=art;obj['surface_fitted']=True;obj['side']=side
    report.append({'label':label,'faces':len(faces),'surface_triangles':len(faces),'mapping':'panel-isolated','center_g':g,'center_z':z,'width':width,'height':height})

specs=[('atlassian',-1.18,.70,.75,.09),('atlassian_symbol',-1.25,.85,.16,.16),
       ('kraken',-.43,.680,.33,.063),('claude',-.055,.680,.30,.063),
       ('barclays',-.06,.535,.54,.08),('komatsu',-.84,.414,.67,.095),
       ('gulf',-1.48,.47,.10,.10),('wilkinson',-1.60,.790,.14,.055),
       ('duracell',-.73,.987,.235,.041),('brillio',.86,.645,.18,.061),
       ('stephens',1.01,.567,.38,.10),('keeper',.62,.245,.42,.060),('rear_komatsu',-2.25,.865,.44,.085)]
for side in [-1,1]:
    for art,g,z,w,h in specs:sticker(art+('-right' if side<0 else '-left'),art,g,z,w,h,side)
sticker('rear-wing-top','atlassian',-2.33,0,1.0,.15,0,top=True)

bpy.context.view_layer.update()
Path('/tmp/williams-panel-stickers.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'williams-fw48-2026.blend'))
result={'stickers':report}
