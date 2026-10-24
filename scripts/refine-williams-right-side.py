import bpy
from pathlib import Path
from mathutils import Vector
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');s=bpy.context.scene
def paint(name,rgba,metallic=.12):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=rgba;bs.inputs['Metallic'].default_value=metallic;bs.inputs['Roughness'].default_value=.36;bs.inputs['Specular IOR Level'].default_value=.10
    return m
def srgb(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
blue=paint('FW48 Side Refinement | Plain blue',tuple(srgb(v/255) for v in (0,84,218))+(1,))
black=paint('FW48 Side Refinement | Carbon',(.0021,.0027,.0040,1),.03)
cyan=paint('FW48 Side Refinement | Inlet cyan',tuple(srgb(v/255) for v in (0,184,238))+(1,))
report={}
for o in bpy.data.objects:
    if o.type!='MESH' or o.name.startswith('FW48 Decal'):continue
    mesh=o.data;mw=o.matrix_world;nm=mw.to_3x3().inverted().transposed();count=0
    for mat in (blue,black,cyan):
        if mat.name not in mesh.materials:mesh.materials.append(mat)
    for p in mesh.polygons:
        c=mw@p.center
        if c.x>0:continue
        old=mesh.materials[p.material_index]
        if not old.name.startswith('FW48 FINAL | Body') and not old.name.startswith('FW48 FINAL | Copper'):continue
        n=(nm@p.normal).normalized();g=-c.y;ax=abs(c.x);mat=None
        if g<-1.90 and ax>.50:continue
        if abs(n.x)<abs(n.z)*.70 or abs(n.x)<.28:
            mat=blue
            if c.z<.30:mat=black
            if -.98<g<-.12 and c.z>.88 and ax<.24:mat=black
        if .35<g<.80 and .35<c.z<.69 and ax>.35 and n.y<-.45:mat=cyan
        if old.name.startswith('FW48 FINAL | Copper'):mat=None
        if mat:p.material_index=mesh.materials.find(mat.name);count+=1
    mesh.update()
    if count:report[o.name]=count
cam=s.camera;cam.data.type='ORTHO';cam.location=(-10,0,.67);cam.rotation_euler=(Vector((0,0,.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.1
s.render.resolution_x=1800;s.render.resolution_y=700;s.cycles.samples=24
s.render.filepath=str(R/'previews/right-side-refinement-01.png');bpy.ops.render.render(write_still=True)
cam.location=(-6,-7,5);cam.rotation_euler=(Vector((0,0,.50))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.0
s.render.resolution_x=1600;s.render.resolution_y=1000
s.render.filepath=str(R/'previews/right-quarter-refinement-01.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'williams-fw48-2026.blend'))
result={'faces':report,'preview':s.render.filepath}
