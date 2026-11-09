"""Anchor panel colour boundaries to the physical body coordinates."""
import bpy
from pathlib import Path
R=Path('/Users/sk/PORTFOLIO/artifacts/williams')
def coordinates(mat,yscale,yoffset,zscale,zoffset):
 nt=mat.node_tree;tex=next(n for n in nt.nodes if n.type=='TEX_IMAGE')
 geo=nt.nodes.new('ShaderNodeNewGeometry');sep=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(geo.outputs['Position'],sep.inputs[0])
 combine=nt.nodes.new('ShaderNodeCombineXYZ')
 for axis,scale,offset,dest in [('Y',yscale,yoffset,'X'),('Z',zscale,zoffset,'Y')]:
  calc=nt.nodes.new('ShaderNodeMath');calc.operation='MULTIPLY_ADD';calc.inputs[1].default_value=scale;calc.inputs[2].default_value=offset
  nt.links.new(sep.outputs[axis],calc.inputs[0]);nt.links.new(calc.outputs[0],combine.inputs[dest])
 nt.links.new(combine.outputs[0],tex.inputs['Vector'])
 tex.extension='EXTEND'
for mat in bpy.data.materials:
 if mat.name.startswith('FW48 Panel | Continuous sidepod'):coordinates(mat,-1/5.5,2.6/5.5,1/1.3,0)
 if mat.name.startswith('FW48 Panel | Continuous rear endplate'):coordinates(mat,-1/.64,2.56/.64,1/.66,-.28/.66)
# Any lower edges accidentally classified as paint stay carbon.
for name in ['Object_12','Object_4','Object_6','Object_7','Object_8','DRS_Flap']:
 obj=bpy.data.objects[name];mesh=obj.data;carbon=mesh.materials.find('FW48 Panel | Carbon')
 if carbon<0:mesh.materials.append(bpy.data.materials['FW48 Panel | Carbon']);carbon=len(mesh.materials)-1
 for face in mesh.polygons:
  if not mesh.materials[face.material_index].name.startswith('FW48 Panel |'):continue
  p=obj.matrix_world@face.center
  if p.z<.34:face.material_index=carbon
 mesh.update()
bpy.ops.wm.save_as_mainfile(filepath=str(R/'williams-fw48-2026.blend'))
