import bpy,json
result={}
for name in ['Object_12','Object_4','Object_6','Object_7','Object_8']:
 o=bpy.data.objects[name];result[name]={'uv':[u.name for u in o.data.uv_layers],'materials':[m.name for m in o.data.materials if m and m.get('FW48_side')=='right']}
result['materials']={m.name:{'links':[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links], 'values':{i.name:str(i.default_value) for i in next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs if i.name in ['Base Color','Roughness','Metallic']}} for m in bpy.data.materials if m.get('FW48_side')=='right'}
