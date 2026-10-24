import bpy
from pathlib import Path
with bpy.data.libraries.load('/Users/sk/PORTFOLIO/artifacts/williams/before.blend',link=False) as (a,b):
    names=list(a.meshes)
result={'source':names,'current':{o.name:o.data.name for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('FW48 Decal')}}
