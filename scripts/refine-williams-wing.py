import bpy
from pathlib import Path
from mathutils import Vector
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');T=R/'textures';s=bpy.context.scene
def material(name,file=None):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;nt=m.node_tree;nt.nodes.clear()
    bs=nt.nodes.new('ShaderNodeBsdfPrincipled');out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(bs.outputs[0],out.inputs[0])
    bs.inputs['Base Color'].default_value=(.0025,.003,.0045,1);bs.inputs['Roughness'].default_value=.43;bs.inputs['Specular IOR Level'].default_value=.17
    if file:
        tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(T/file),check_existing=True);tex.image.reload();tex.image.pack();tex.extension='EXTEND'
        uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='FW48_WingUV';nt.links.new(uv.outputs['UV'],tex.inputs['Vector']);nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    return m
carbon=material('FW48 Front Wing | Carbon')
flap=material('FW48 Front Wing | Swept artwork','front-wing-refinement-01.png')
ends={side:material('FW48 Front Wing | Endplate '+side,'front-endplate-'+side+'.png') for side in ('left','right')}
report={}
for name in ('Object_12','Object_6','Object_7','Object_8'):
    o=bpy.data.objects[name];mesh=o.data;mw=o.matrix_world;nm=mw.to_3x3().inverted().transposed();count=0
    uv=mesh.uv_layers.get('FW48_WingUV') or mesh.uv_layers.new(name='FW48_WingUV')
    for m in (carbon,flap,*ends.values()):
        if m.name not in mesh.materials:mesh.materials.append(m)
    for p in mesh.polygons:
        old=mesh.materials[p.material_index]
        if old.name=='FW48 FINAL | Nose':continue
        c=mw@p.center;n=(nm@p.normal).normalized();g=-c.y;ax=abs(c.x)
        if not (1.95<g<2.91 and c.z<.46 and ax>.11):continue
        mat=carbon
        trail=2.50-.50*ax;lead=2.91-.42*ax;t=(g-trail)/(lead-trail)
        if .15<ax<.62 and -.02<t<1.04 and c.z>.145 and n.z>.25:mat=flap
        if ax>.81 and n.x*(1 if c.x>0 else -1)>.42:mat=ends['left' if c.x>0 else 'right']
        p.material_index=mesh.materials.find(mat.name);count+=1
        for li in p.loop_indices:
            v=mw@mesh.vertices[mesh.loops[li].vertex_index].co;gz=-v.y;x=abs(v.x)
            if mat==flap:
                a=2.50-.50*x;b=2.91-.42*x;u=(v.x+1)/2;vv=1-(gz-a)/(b-a)
            else:u=(gz-1.95)/.95;vv=(v.z-.10)/.35
            uv.data[li].uv=(u,vv)
    mesh.update();report[name]=count
cam=s.camera;cam.data.type='ORTHO';cam.location=(0,-2.4,6);cam.rotation_euler=(Vector((0,-2.4,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.1
s.render.resolution_x=1800;s.render.resolution_y=1000;s.cycles.samples=24
s.render.filepath=str(R/'previews/front-wing-top-refinement-02.png');bpy.ops.render.render(write_still=True)
cam.location=(0,-6.4,8.5);cam.rotation_euler=(Vector((0,-2.35,.25))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.15
s.render.resolution_x=1800;s.render.resolution_y=1000
s.render.filepath=str(R/'previews/front-wing-angle-refinement-02.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'williams-fw48-2026.blend'))
result={'faces':report,'preview':s.render.filepath}
