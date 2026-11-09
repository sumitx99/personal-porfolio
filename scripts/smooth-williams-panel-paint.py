"""Use continuous colour boundaries across triangles; sponsor films remain separate."""
import bpy
from pathlib import Path
R=Path('/Users/sk/PORTFOLIO/artifacts/williams')
mat=bpy.data.materials.get('FW48 Panel | Continuous sidepod') or bpy.data.materials.new('FW48 Panel | Continuous sidepod')
mat.use_nodes=True;nt=mat.node_tree;nt.nodes.clear()
bs=nt.nodes.new('ShaderNodeBsdfPrincipled');out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
bs.inputs['Roughness'].default_value=.4;bs.inputs['Coat Weight'].default_value=.12;bs.inputs['Coat Roughness'].default_value=.28
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/'textures/sidepod-paint.png'),check_existing=False);tex.image.pack()
uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='FW48_PanelPaintUV';nt.links.new(uv.outputs['UV'],tex.inputs['Vector']);nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
for name in ['Object_12','Object_4','Object_6','Object_7','Object_8','DRS_Flap']:
    obj=bpy.data.objects[name];mesh=obj.data
    if mat.name not in mesh.materials:mesh.materials.append(mat)
    layer=mesh.uv_layers.get('FW48_PanelPaintUV') or mesh.uv_layers.new(name='FW48_PanelPaintUV')
    if layer is None:raise RuntimeError('No UV layer slot on '+name)
    for face in mesh.polygons:
        old=mesh.materials[face.material_index]
        if not old.name.startswith('FW48 Panel |'):continue
        p=obj.matrix_world@face.center;g=-p.y
        normal=(obj.matrix_world.to_3x3().inverted().transposed()@face.normal).normalized()
        if p.z<.32:
            face.material_index=mesh.materials.find('FW48 Panel | Carbon')
            continue
        if not (-1.6<g<.7 and abs(p.x)>.25 and .32<p.z<.69 and abs(normal.x)>.25):continue
        face.material_index=mesh.materials.find(mat.name)
        for li in face.loop_indices:
            p=obj.matrix_world@mesh.vertices[mesh.loops[li].vertex_index].co
            layer.data[li].uv=((-p.y+2.6)/5.5,p.z/1.3)
    mesh.update()
# The endplates use a continuous paint split instead of a per-triangle height test.
rear=mat.copy();rear.name='FW48 Panel | Continuous rear endplate'
rear_tex=next(n for n in rear.node_tree.nodes if n.type=='TEX_IMAGE')
rear_tex.image=bpy.data.images.load(str(R/'textures/rear-endplate-paint.png'),check_existing=False);rear_tex.image.pack()
for name in ['Object_12','Object_4','Object_6','Object_7','Object_8','DRS_Flap']:
    obj=bpy.data.objects[name];mesh=obj.data
    if rear.name not in mesh.materials:mesh.materials.append(rear)
    layer=mesh.uv_layers['FW48_PanelPaintUV']
    for face in mesh.polygons:
        old=mesh.materials[face.material_index]
        if not old.name.startswith('FW48 Panel |'):continue
        p=obj.matrix_world@face.center;n=(obj.matrix_world.to_3x3().inverted().transposed()@face.normal).normalized()
        if -p.y< -1.9 and abs(p.x)>.5 and p.z>.27 and abs(n.x)>.3:
            face.material_index=mesh.materials.find(rear.name)
            for li in face.loop_indices:
                v=obj.matrix_world@mesh.vertices[mesh.loops[li].vertex_index].co
                layer.data[li].uv=((-v.y+2.56)/.64,(v.z-.28)/.66)
    mesh.update()
bpy.ops.wm.save_as_mainfile(filepath=str(R/'williams-fw48-2026.blend'))
