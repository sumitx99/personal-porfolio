import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
o=bpy.data.objects['Object_12'];verts=[o.matrix_world@v.co for v in o.data.vertices];tree=BVHTree.FromPolygons(verts,[tuple(p.vertices) for p in o.data.polygons])
result={'widths':[],'centerline':[]}
for i in range(100):
    gz=.9+i/99*1.965;p,n,idx,dist=tree.ray_cast(Vector((0,-gz,3)),Vector((0,0,-1)))
    if p is None:continue
    pts=[]
    for j in range(151):
        x=j/150*.25;q,n,idx,dist=tree.ray_cast(Vector((x,-gz,3)),Vector((0,0,-1)))
        if q is not None and q.z>p.z-.045 and n.z>.15:pts.append(x)
    result['widths'].append([gz,max(pts) if pts else .1])
for i in range(31):
    gz=.9+i/30*.6;p,n,idx,dist=tree.ray_cast(Vector((0,-gz,3)),Vector((0,0,-1)))
    if p:result['centerline'].append([round(gz,3),round(p.z,4)])
