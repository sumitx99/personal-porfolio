"""Unwrap a single body side without shared UV islands; preserve approved front work."""
import bpy,bmesh,math
from pathlib import Path
R=Path('/Users/sk/PORTFOLIO/artifacts/williams');SIDE='right';SIGN=-1;SIZE=4096
s=bpy.context.scene
names=['Object_12','Object_4','Object_6','Object_7','Object_8']
objects=[bpy.data.objects[n] for n in names]
needed=[o.data.name for o in objects]
refs={}
for n in needed:
    m=bpy.data.meshes.get('FW48 Original | '+n)
    if m:refs[n]=m
missing=[n for n in needed if n not in refs]
if missing:
    with bpy.data.libraries.load(str(R/'before.blend'),link=False) as (a,b):b.meshes=missing[:]
    for n,m in zip(missing,b.meshes):m.name='FW48 Original | '+n;refs[n]=m

source_mats={};chosen={}
for o in objects:
    reference=refs[o.data.name]
    if len(reference.polygons)!=len(o.data.polygons):raise RuntimeError('Topology changed: '+o.name)
    keep=[];mesh=o.data;mw=o.matrix_world
    for v in mesh.vertices:v.select=False
    for e in mesh.edges:e.select=False
    for p in mesh.polygons:
        p.select=False;c=mw@p.center;old=mesh.materials[p.material_index]
        if c.x*SIGN<-.0001:continue
        if old.name=='FW48 FINAL | Nose' or old.name.startswith('FW48 Front Wing |'):continue
        if -c.y < -1.90 and c.z>.40:continue
        # Interior controls retain their existing textures; only the car skin is baked.
        original=reference.materials[reference.polygons[p.index].material_index]
        if original.name not in source_mats:
            mat=original.copy();mat.name='FW48 Skin '+SIDE+' | '+original.name
            mat['FW48_original']=original.name
            mat['FW48_side']=SIDE
            nt=mat.node_tree;bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
            for tex in [n for n in nt.nodes if n.type=='TEX_IMAGE']:
                if not tex.inputs['Vector'].is_linked:
                    uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap';nt.links.new(uv.outputs['UV'],tex.inputs['Vector'])
            if 'williams_paint' in original.name:
                for link in list(bs.inputs['Base Color'].links):nt.links.remove(link)
                bs.inputs['Base Color'].default_value=(0,.0886556,.701102,1)
                for link in list(bs.inputs['Metallic'].links)+list(bs.inputs['Roughness'].links):nt.links.remove(link)
                bs.inputs['Metallic'].default_value=.18;bs.inputs['Roughness'].default_value=.36
            source_mats[original.name]=mat
        mat=source_mats[original.name]
        if mat.name not in mesh.materials:mesh.materials.append(mat)
        p.material_index=mesh.materials.find(mat.name);p.select=True;keep.append(p.index)
    uv=mesh.uv_layers.get('FW48_'+SIDE+'_BakeUV') or mesh.uv_layers.new(name='FW48_'+SIDE+'_BakeUV')
    mesh.uv_layers.active=uv
    chosen[o.name]=set(keep);mesh.update()

temps=[]
for object_index,o in enumerate(objects):
    if not chosen[o.name]:continue
    mesh=o.data.copy()
    attr=mesh.attributes.get('FW48_source_loop') or mesh.attributes.new('FW48_source_loop','INT','CORNER')
    attr.data.foreach_set('value',list(range(len(mesh.loops))))
    attr=mesh.attributes.get('FW48_source_object') or mesh.attributes.new('FW48_source_object','INT','CORNER')
    attr.data.foreach_set('value',[object_index]*len(mesh.loops))
    bm=bmesh.new();bm.from_mesh(mesh);bm.faces.ensure_lookup_table()
    remove=[f for f in bm.faces if f.index not in chosen[o.name]]
    bmesh.ops.delete(bm,geom=remove,context='FACES')
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005)
    bm.to_mesh(mesh);bm.free()
    ob=bpy.data.objects.new('FW48 temporary bake '+o.name,mesh);s.collection.objects.link(ob);ob.matrix_world=o.matrix_world.copy();temps.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for o in temps:o.select_set(True)
bpy.context.view_layer.objects.active=temps[0];bpy.ops.object.join();temp=bpy.context.object
bpy.ops.object.material_slot_remove_unused()
bm=bmesh.new();bm.from_mesh(temp.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005);bm.to_mesh(temp.data);bm.free()
temp.data.uv_layers.active=temp.data.uv_layers['FW48_'+SIDE+'_BakeUV']
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.0008,area_weight=.2)
bpy.ops.uv.select_all(action='SELECT');bpy.ops.uv.pack_islands(rotate=True,margin=.0008)
bpy.ops.object.mode_set(mode='OBJECT')
# Carry the welded temporary mesh's UVs back through preserved corner IDs.
uv=temp.data.uv_layers['FW48_'+SIDE+'_BakeUV'].data
ids=temp.data.attributes['FW48_source_loop'].data
object_ids=temp.data.attributes['FW48_source_object'].data
for i in range(len(temp.data.loops)):
    original=objects[object_ids[i].value]
    original.data.uv_layers['FW48_'+SIDE+'_BakeUV'].data[ids[i].value].uv=uv[i].uv
for o in objects:o.data.update()
s.render.engine='CYCLES';s.cycles.samples=1;s.render.bake.margin=4;s.render.bake.use_clear=True

def bake(kind):
    name='FW48 bake '+SIDE+' '+kind
    old=bpy.data.images.get(name)
    if old:bpy.data.images.remove(old)
    im=bpy.data.images.new(name,SIZE,SIZE,alpha=True,float_buffer=(kind!='color'))
    im.generated_color=(0,0,0,0)
    if kind!='color':im.colorspace_settings.name='Non-Color'
    restore=[]
    for mat in temp.data.materials:
        if mat is None or mat.get('FW48_side')!=SIDE:continue
        nt=mat.node_tree;out=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output)
        restore.append((mat,out.inputs['Surface'].links[0].from_socket))
        em=nt.nodes.new('ShaderNodeEmission');em.name='FW48 bake emit'
        if kind=='color':
            bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED');inp=bs.inputs['Base Color']
            if inp.is_linked:nt.links.new(inp.links[0].from_socket,em.inputs['Color'])
            else:em.inputs['Color'].default_value=inp.default_value
        else:
            geo=nt.nodes.new('ShaderNodeNewGeometry');geo.name='FW48 bake geometry'
            vm=nt.nodes.new('ShaderNodeVectorMath');vm.name='FW48 bake encode';vm.operation='MULTIPLY_ADD'
            nt.links.new(geo.outputs['Position' if kind=='position' else 'Normal'],vm.inputs[0])
            vm.inputs[1].default_value=(.125,)*3 if kind=='position' else (.5,)*3
            vm.inputs[2].default_value=(.5,)*3;nt.links.new(vm.outputs[0],em.inputs['Color'])
        nt.links.new(em.outputs[0],out.inputs['Surface'])
        tex=nt.nodes.get('FW48 bake target') or nt.nodes.new('ShaderNodeTexImage');tex.name='FW48 bake target';tex.image=im;nt.nodes.active=tex
    bpy.ops.object.bake(type='EMIT',uv_layer='FW48_'+SIDE+'_BakeUV')
    for mat,socket in restore:
        nt=mat.node_tree;out=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output);nt.links.new(socket,out.inputs['Surface'])
        for n in list(nt.nodes):
            if n.name in ('FW48 bake emit','FW48 bake geometry','FW48 bake encode'):nt.nodes.remove(n)
    return im
for kind in ('color','position','normal'):bake(kind)
bpy.data.objects.remove(temp,do_unlink=True)
result={'side':SIDE,'faces':{n:len(v) for n,v in chosen.items()},'images':['FW48 bake '+SIDE+' '+k for k in ('color','position','normal')]}
