import bpy
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');s=bpy.context.scene
bpy.ops.wm.save_as_mainfile(filepath=str(R/'nose-approved.blend'),copy=True)
verts=[];faces=[]
for name in ['Object_12','Object_6','Object_7','Object_8']:
    o=bpy.data.objects[name];start=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend(tuple(start+i for i in p.vertices) for p in o.data.polygons)
tree=BVHTree.FromPolygons(verts,faces)
result={'profiles':{}}
for x in [.25,.4,.5,.6,.7,.8]:
    line=[]
    for i in range(91):
        g=2+i*.01;p,n,idx,dist=tree.ray_cast(Vector((x,-g,3)),Vector((0,0,-1)))
        if p is not None:line.append([round(g,2),round(p.z,4),round(n.z,3)])
    result['profiles'][str(x)]=line
cam=s.camera;cam.data.type='ORTHO';cam.location=(0,-2.4,6);cam.rotation_euler=(Vector((0,-2.4,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.1
s.render.resolution_x=1800;s.render.resolution_y=1000;s.cycles.samples=24
s.render.filepath=str(R/'previews/front-wing-top-before.png');bpy.ops.render.render(write_still=True)
