import bpy, math
from mathutils import Vector
from pathlib import Path
ROOT = Path('/Users/sk/PORTFOLIO/artifacts/williams')
scene = bpy.context.scene
if not (ROOT/'before.blend').exists():
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'before.blend'), copy=True)
collection = bpy.data.collections.get('Livery Review Studio')
if collection is None:
    collection = bpy.data.collections.new('Livery Review Studio')
    scene.collection.children.link(collection)
def aim(obj, point):
    obj.rotation_euler = (Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(name, pos, energy, size):
    ob=bpy.data.objects.get(name)
    if ob is None:
        data=bpy.data.lights.new(name,'AREA'); ob=bpy.data.objects.new(name,data);collection.objects.link(ob)
    ob.location=pos;ob.data.energy=energy;ob.data.shape='DISK';ob.data.size=size;aim(ob,(0,0,.4))
area('Review Key',(-3,-2,5),1000,5)
area('Review Fill',(3,-1,3),800,4)
area('Review Rim',(0,4,4),1100,4)
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.13,.16,.22,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.6
cam=bpy.data.objects.get('Livery Review Camera')
if cam is None:
    cam=bpy.data.objects.new('Livery Review Camera',bpy.data.cameras.new('Livery Review Camera'));collection.objects.link(cam)
scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=1800;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
cam.data.type='ORTHO';cam.data.ortho_scale=6.1
cam.location=(-10,0,.67);aim(cam,(0,0,.55))
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ROOT/'previews/before-side.png')
bpy.ops.render.render(write_still=True)
result={'preview':scene.render.filepath,'backup':str(ROOT/'before.blend')}
