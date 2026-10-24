import bpy, math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path('/Users/sk/PORTFOLIO/artifacts/williams');T=ROOT/'textures';scene=bpy.context.scene
for im in bpy.data.images:
    if im.filepath.startswith(str(T)):im.reload();im.pack()
col=bpy.data.collections.get('FW48 | Reference decals')
if col:
    for o in list(col.objects):
        if 'wheel-' not in o.name:bpy.data.objects.remove(o,do_unlink=True)

def material(name,filename,metallic=.12,roughness=.36):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;nt=m.node_tree;nt.nodes.clear()
    out=nt.nodes.new('ShaderNodeOutputMaterial');bs=nt.nodes.new('ShaderNodeBsdfPrincipled');nt.links.new(bs.outputs[0],out.inputs[0])
    bs.inputs['Metallic'].default_value=metallic;bs.inputs['Roughness'].default_value=roughness;bs.inputs['Specular IOR Level'].default_value=.07
    bs.inputs['Coat Weight'].default_value=.08
    tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(T/filename),check_existing=True);tex.image.reload();tex.image.pack();tex.extension='EXTEND'
    uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='FW48_FinalUV';nt.links.new(uv.outputs['UV'],tex.inputs['Vector']);nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    return m
mats={
 'right':material('FW48 FINAL | Body right','body-right.png'),
 'left':material('FW48 FINAL | Body left','body-left.png'),
 'halo-right':material('FW48 FINAL | Halo right','halo-right.png',.05,.34),
 'halo-left':material('FW48 FINAL | Halo left','halo-left.png',.05,.34),
 'nose':material('FW48 FINAL | Nose','nose-final.png'),
 'front-wing':material('FW48 FINAL | Front wing','front-wing-final.png',.03,.4),
 'rear-wing':material('FW48 FINAL | Rear wing','rear-wing-final.png',.03,.4),
 'copper-right':material('FW48 FINAL | Copper right','body-right.png',.65,.35),
 'copper-left':material('FW48 FINAL | Copper left','body-left.png',.65,.35),
}
body=bpy.data.objects['Object_12'];mw=body.matrix_world
vertices=[mw@v.co for v in body.data.vertices];faces=[tuple(p.vertices) for p in body.data.polygons]
tree=BVHTree.FromPolygons(vertices,faces)
gzs=np.linspace(.90,2.87,180);widths=[]
for gz in gzs:
    p,n,idx,dist=tree.ray_cast(Vector((0,-gz,3)),Vector((0,0,-1)))
    if p is None:widths.append(.10);continue
    pts=[]
    for x in np.linspace(0,.25,121):
        q,normal,idx,dist=tree.ray_cast(Vector((float(x),-gz,3)),Vector((0,0,-1)))
        if q is not None and q.z>p.z-.045 and normal.z>.15:pts.append(x)
    widths.append(max(.035,max(pts) if pts else .1))
def nose_width(gz):return float(np.interp(gz,gzs,widths))
report={}
for name in ['Object_12','Object_13','Object_4','Object_6','Object_7','Object_8','DRS_Flap']:
    o=bpy.data.objects[name];mesh=o.data;mw=o.matrix_world;nm=mw.to_3x3().inverted().transposed()
    uv=mesh.uv_layers.get('FW48_FinalUV') or mesh.uv_layers.new(name='FW48_FinalUV')
    mi={}
    for key,m in mats.items():
        if m.name not in mesh.materials:mesh.materials.append(m)
        mi[key]=mesh.materials.find(m.name)
    count=0
    for p in mesh.polygons:
        c=mw@p.center;n=(nm@p.normal).normalized();gz=-c.y;ax=abs(c.x);side='left' if c.x>0 else 'right'
        old=mesh.materials[p.material_index];key=None
        endplate=gz<-1.90 and ax>.5 and c.z>.27 and abs(n.x)>.18
        if name=='Object_13':key='halo-'+side
        elif name=='Object_12' or old.name.startswith(('FW48','williams')):key=side
        # Cover the complete outer pod skin, including the carbon pieces in front
        # of the old paint mesh, with the same continuous projected graphic.
        elif -1.60<gz<.65 and .28<c.z<.68 and ax>.30 and n.x*(1 if c.x>0 else -1)>.15:key=side
        elif .55<gz<1.85 and .20<c.z<.68 and abs(n.x)>.20:key=side
        elif 1.85<gz<2.85 and .28<c.z<.52 and abs(n.x)>.20:key=side
        if endplate:key=side
        if 1.95<gz<2.90 and c.z<.44 and ax>.24:
            if n.z>.40 and abs(n.x)<.65:key='front-wing'
            elif abs(n.x)>.30:key=side
        if gz<-2.15 and c.z>.70 and ax<.57 and n.z>.20:key='rear-wing'
        if 1.95<gz<2.90 and c.z<.45 and ax>.64 and abs(n.x)>.35:key=side
        if .35<gz<.95 and .19<c.z<.31 and ax>.28:key=side
        if name=='Object_12' and .92<gz<2.87 and ax<nose_width(gz)*1.15 and n.z>.20:key='nose'
        if name=='Object_12' and -.52<gz<-.11 and .88<c.z<1.10:key='copper-'+side
        if key is None:continue
        p.material_index=mi[key];count+=1
        for li in p.loop_indices:
            v=mw@mesh.vertices[mesh.loops[li].vertex_index].co;g=-v.y
            if key=='nose':u=.5+v.x/(2*nose_width(g));vv=1-(g-.90)/1.965
            elif key=='front-wing':u=(v.x+1)/2;vv=1-(g-1.90)
            elif key=='rear-wing':u=(v.x+.60)/1.20;vv=1-(g+2.52)/.30
            else:u=(g+2.6)/5.5;vv=v.z/1.3
            uv.data[li].uv=(u,vv)
    mesh.update();report[name]=count

# Blue/cyan mirrors, with the original reflective glass retained.
for name in ('Object_11','Object_14'):
    mat=bpy.data.objects[name].active_material
    if mat and mat.use_nodes:
        bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value=(.001,.32,.66,1)

cam=scene.camera;cam.location=(-10,0,.67);cam.rotation_euler=(Vector((0,0,.55))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1800;scene.render.resolution_y=700;scene.cycles.samples=24
scene.render.filepath=str(ROOT/'previews/clean-side.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'williams-fw48-2026.blend'))
result={'faces':report,'preview':scene.render.filepath,'nose_widths':[widths[0],widths[90],widths[-1]]}
