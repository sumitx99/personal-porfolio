import bpy
from mathutils import Vector
result = {"file": bpy.data.filepath, "objects": [], "materials": {}}
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    coords = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    result['objects'].append({
        'name': obj.name, 'verts': len(obj.data.vertices), 'faces': len(obj.data.polygons),
        'bounds': [[min(v[i] for v in coords), max(v[i] for v in coords)] for i in range(3)],
        'materials': [m.name if m else None for m in obj.data.materials],
        'uvs': [{'name':uv.name,'active_render':uv.active_render} for uv in obj.data.uv_layers],
        'modifiers': [m.type for m in obj.modifiers],
    })
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    result['materials'][mat.name] = [
        {'name':n.name, 'type':n.type, 'image':n.image.name if n.type=='TEX_IMAGE' and n.image else None,
         'links':[(l.from_node.name,l.from_socket.name,l.to_socket.name) for inp in n.inputs for l in inp.links]}
        for n in mat.node_tree.nodes if n.type in {'BSDF_PRINCIPLED','TEX_IMAGE','NORMAL_MAP','UVMAP'}]
