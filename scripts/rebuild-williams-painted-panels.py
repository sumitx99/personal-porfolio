"""Rebuild the engine-cover flanks and flatten the pod's vinyl-bearing band.
The original Mercedes mechanical parts and approved front geometry are retained.
"""
import bpy,bmesh,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np
R=Path('/Users/sk/PORTFOLIO/artifacts/williams')
# Keep an unmodified file before the geometry pass.
bpy.ops.wm.save_as_mainfile(filepath=str(R/'before-painted-panel-rebuild-v2.blend'),copy=True)
obj=bpy.data.objects['Object_12'];mesh=obj.data;mw=obj.matrix_world;inv=mw.inverted()
world=[mw@v.co for v in mesh.vertices];tree=BVHTree.FromPolygons(world,[tuple(p.vertices) for p in mesh.polygons])
# Fit the lower seam to the existing cover rather than leaving a floating panel.
gs=np.linspace(-1.61,-.50,64);widths=[]
for g in gs:
 p,n,_,_=tree.ray_cast(Vector((3,-float(g),.605)),Vector((-1,0,0)))
 widths.append(abs(p.x) if p is not None else .20)
removed_count=0
for name in ['Object_12','Object_4','Object_6','Object_7','Object_8','DRS_Flap']:
    target=bpy.data.objects[name];data=target.data;transform=target.matrix_world
    bm=bmesh.new();bm.from_mesh(data);bm.faces.ensure_lookup_table();remove=[]
    for face in bm.faces:
        p=transform@face.calc_center_median();g=-p.y;mat=data.materials[face.material_index]
        if not mat.name.startswith('FW48 Panel |'):continue
        if not (-1.62<g<-.49 and p.z>.605 and abs(p.x)<.44):continue
        if g>-.98 and p.z>.89 and mat.name in ['FW48 Panel | Carbon','FW48 Panel | Copper']:continue
        remove.append(face)
    removed_count+=len(remove)
    bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(data);bm.free();data.update()
mesh=obj.data
# A rounded-top panel with an upright sponsor band, similar to the reference.
profile_g=[-1.61,-1.4,-1.2,-1.,-.8,-.6,-.50]
profile_w=[.015,.07,.12,.16,.19,.22,.24]
profile_z=[.835,.90,.95,.98,.89,.89,.89]
verts=[];faces=[];rings=[]
for i,g in enumerate(gs):
 w=float(np.interp(g,profile_g,profile_w));top=float(np.interp(g,profile_g,profile_z));base=max(widths[i],w)
 ring=[(-base,.605),(-w,.65),(-w,top-.015),(-w+.015,top),
       (w-.015,top),(w,top-.015),(w,.65),(base,.605)]
 rings.append(list(range(len(verts),len(verts)+8)))
 verts.extend(tuple(inv@Vector((x,-float(g),z))) for x,z in ring)
for a,b in zip(rings,rings[1:]):
 for i in range(7):faces.append((a[i],a[i+1],b[i+1],b[i]))
faces.extend([tuple(reversed(rings[0])),tuple(rings[-1])]);faces=[tuple(reversed(face)) for face in faces]
patch=bpy.data.meshes.new('FW48 Engine-cover replacement');patch.from_pydata(verts,[],faces);patch.update()
# Join into the original body object so car-rig ownership and transforms remain stable.
new=bpy.data.objects.new('FW48 Engine-cover replacement',patch);bpy.context.scene.collection.objects.link(new);new.matrix_world=obj.matrix_world.copy()
new.data.materials.append(bpy.data.materials['FW48 Panel | Blue'])
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);new.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.join();mesh=obj.data
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(R/'williams-fw48-2026.blend'))
result={'engine_faces_replaced':removed_count,'engine_rings':len(gs)}
