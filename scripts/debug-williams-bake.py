import bpy,numpy as np
SIDE='right';im=bpy.data.images['FW48 bake right position'];w,h=im.size
a=np.empty(w*h*4,np.float32);im.pixels.foreach_get(a);a=a.reshape(h,w,4)
P=a[:,:,:3]*8-4;valid=(np.abs(P[:,:,0])<1.1)&(np.abs(P[:,:,1])<3)&(P[:,:,2]>-.1)&(P[:,:,2]<1.3)
result={'valid':int(valid.sum()),'objects':{},'samples':[]}
for name in ['Object_12','Object_4','Object_6','Object_7','Object_8']:
 o=bpy.data.objects[name];mesh=o.data;uv=mesh.uv_layers.get('FW48_BodyBakeUV')
 result['objects'][name]=[v.name for v in mesh.uv_layers]
 if not uv:continue
 ps=[p for p in mesh.polygons if mesh.materials[p.material_index].get('FW48_side')==SIDE]
 for p in ps[::max(1,len(ps)//4)]:
  co=np.mean([uv.data[i].uv[:] for i in p.loop_indices],axis=0);x=min(w-1,max(0,int(co[0]*w)));y=min(h-1,max(0,int(co[1]*h)))
  c=o.matrix_world@p.center;pred=P[y,x]
  result['samples'].append({'o':name,'uv':co.tolist(),'actual':list(c),'bake':pred.tolist(),'error':float(np.linalg.norm(pred-np.array(c)))})
