import bpy,numpy as np
from mathutils import Vector
from pathlib import Path
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');s=bpy.context.scene
rest=[]
for mat in bpy.data.materials:
 if mat.get('FW48_side')!='right':continue
 nt=mat.node_tree;bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED');out=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output)
 rest.append((nt,out,bs));em=nt.nodes.new('ShaderNodeEmission');nt.links.new(bs.inputs['Base Color'].links[0].from_socket,em.inputs['Color']);nt.links.new(em.outputs[0],out.inputs['Surface'])
cam=s.camera;cam.location=(-10,0,.67);cam.rotation_euler=(Vector((0,0,.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.1
s.render.resolution_x=1800;s.render.resolution_y=700;s.cycles.samples=8;s.render.filepath=str(R/'previews/right-debug-emission.png');bpy.ops.render.render(write_still=True)
for nt,out,bs in rest:nt.links.new(bs.outputs[0],out.inputs['Surface'])
result={'preview':s.render.filepath}
