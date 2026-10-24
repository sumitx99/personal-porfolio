import bpy
from pathlib import Path
from mathutils import Vector
R=Path('/Users/sk/PORTFOLIO/artifacts/williams')
s=bpy.context.scene;cam=s.camera;cam.data.type='ORTHO'
cam.location=(0,-7.8,8.6);cam.rotation_euler=(Vector((0,-.1,.45))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=5.3
s.render.resolution_x=1200;s.render.resolution_y=1500;s.render.resolution_percentage=100;s.cycles.samples=24
s.render.filepath=str(R/'previews/front-before-refinement.png');bpy.ops.render.render(write_still=True)
cam.location=(0,-6.4,8.5);cam.rotation_euler=(Vector((0,-1.75,.40))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.85
s.render.resolution_x=1100;s.render.resolution_y=1500
s.render.filepath=str(R/'previews/nose-before-refinement.png');bpy.ops.render.render(write_still=True)
result={'front':str(R/'previews/front-before-refinement.png'),'nose':s.render.filepath}
