import bpy,math
from pathlib import Path
from mathutils import Vector
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');s=bpy.context.scene
side='right';sign=-1
mat=bpy.data.materials['FW48 FINAL | Body '+side]
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def effective_z(x,z,g):
    ax=abs(x)
    # Arc coordinates keep the same amount of artwork per metre around the pod.
    pod=.45+.25*math.atan2((z-.45)/.25,max(ax/.70,.002))
    gate=1 if g<-.94 else 1-smooth(.82,.90,z)
    engine=z+.30*math.exp(-(ax/.18)**2)*gate
    if -1.60<g<.65:
        weight=smooth(.60,.69,z)
        return pod*(1-weight)+engine*weight
    return z
report={}
for o in bpy.data.objects:
    if o.type!='MESH' or o.name.startswith('FW48 Decal'):continue
    mesh=o.data;mw=o.matrix_world
    if mat.name not in mesh.materials:mesh.materials.append(mat)
    uv=mesh.uv_layers.get('FW48_FinalUV')
    if uv is None:continue
    count=0
    for p in mesh.polygons:
        c=mw@p.center
        if c.x*sign<0:continue
        old=mesh.materials[p.material_index]
        if old.name.startswith(('FW48 Side Refinement | Plain blue','FW48 Side Refinement | Carbon')):
            p.material_index=mesh.materials.find(mat.name);old=mat
        if old!=mat:continue
        for li in p.loop_indices:
            v=mw@mesh.vertices[mesh.loops[li].vertex_index].co;g=-v.y
            uv.data[li].uv=((g+2.6)/5.5,effective_z(v.x,v.z,g)/1.3)
        count+=1
    mesh.update()
    if count:report[o.name]=count
cam=s.camera;cam.data.type='ORTHO';cam.location=(-10,0,.67);cam.rotation_euler=(Vector((0,0,.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.1
s.render.resolution_x=1800;s.render.resolution_y=700;s.cycles.samples=24
s.render.filepath=str(R/'previews/right-side-refinement-02.png');bpy.ops.render.render(write_still=True)
cam.location=(-6,-7,5);cam.rotation_euler=(Vector((0,0,.50))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.0
s.render.resolution_x=1600;s.render.resolution_y=1000
s.render.filepath=str(R/'previews/right-quarter-refinement-02.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'williams-fw48-2026.blend'))
result={'faces':report,'preview':s.render.filepath}
