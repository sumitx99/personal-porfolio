import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/sk/PORTFOLIO/artifacts/williams');s=bpy.context.scene
mat=bpy.data.materials['FW48 FINAL | Nose'];nt=mat.node_tree
tex=next(n for n in nt.nodes if n.type=='TEX_IMAGE');tex.image=bpy.data.images.load(str(ROOT/'textures/nose-refinement-01.png'),check_existing=True);tex.image.reload();tex.image.pack()
uvnode=next(n for n in nt.nodes if n.type=='UVMAP');uvnode.uv_map='FW48_NoseUV'
count=0
for o in bpy.data.objects:
    if o.type!='MESH' or mat.name not in o.data.materials:continue
    uv=o.data.uv_layers.get('FW48_NoseUV') or o.data.uv_layers.new(name='FW48_NoseUV')
    for p in o.data.polygons:
        if o.data.materials[p.material_index]!=mat:continue
        for li in p.loop_indices:
            v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=((v.x+.25)/.5,1-(-v.y-.90)/1.965)
        count+=1
    o.data.update()
# Keep the physical pitot/sensor parts dark; side logos must never project onto them.
o=bpy.data.objects['Object_4'];original=o.data.materials.find('generics.007')
if original>=0:
    for p in o.data.polygons:
        c=o.matrix_world@p.center
        if .85 < -c.y < 2.0 and abs(c.x)<.17 and c.z>.40:p.material_index=original
    o.data.update()
cam=s.camera;cam.data.type='ORTHO';cam.location=(0,-6.4,8.5);cam.rotation_euler=(Vector((0,-1.75,.40))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.85
s.render.resolution_x=1100;s.render.resolution_y=1500;s.cycles.samples=24
s.render.filepath=str(ROOT/'previews/nose-refinement-02.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'williams-fw48-2026.blend'))
result={'nose_faces':count,'preview':s.render.filepath}
