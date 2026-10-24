import bpy
from mathutils import Vector
result={}
for name in ('Object_12','Object_13','DRS_Flap','Object_6','Object_8','Object_17','Object_18'):
    o=bpy.data.objects[name]; groups={}
    for p in o.data.polygons:
        m=o.data.materials[p.material_index].name
        g=groups.setdefault(m,[]);g.append(o.matrix_world@p.center)
    result[name]={m:{'faces':len(cs),'bounds':[[round(min(c[i] for c in cs),4),round(max(c[i] for c in cs),4)] for i in range(3)]} for m,cs in groups.items()}
result['tire_clusters']={}
o=bpy.data.objects['Object_17']
for sx in (-1,1):
    for sy in (-1,1):
        cs=[o.matrix_world@v.co for v in o.data.vertices]
        cs=[c for c in cs if c.x*sx>0 and c.y*sy>0]
        result['tire_clusters'][str((sx,sy))]=[[min(c[i] for c in cs),max(c[i] for c in cs)] for i in range(3)] if cs else []
