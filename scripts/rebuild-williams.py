"""Rebuild the reference livery with independent projected decals and clean paint UVs."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path('/Users/sk/PORTFOLIO/artifacts/williams'); TEX=ROOT/'textures'
scene=bpy.context.scene
bpy.context.view_layer.update()
def linear(v):
    return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def color(hex):return tuple(linear(int(hex[i:i+2],16)/255) for i in (0,2,4))+(1,)
def material(name,hex='0054da',image=None,alpha=False,metallic=.18,roughness=.34):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name);mat.use_nodes=True
    nt=mat.node_tree;nt.nodes.clear()
    bs=nt.nodes.new('ShaderNodeBsdfPrincipled');out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
    bs.inputs['Base Color'].default_value=color(hex);bs.inputs['Roughness'].default_value=roughness;bs.inputs['Metallic'].default_value=metallic
    bs.inputs['Specular IOR Level'].default_value=.20
    bs.inputs['Coat Weight'].default_value=.10;bs.inputs['Coat Roughness'].default_value=.26
    if image:
        im=bpy.data.images.load(str(TEX/image),check_existing=True);im.reload();im.pack()
        tex=nt.nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='CLIP' if alpha else 'EXTEND'
        nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        if alpha:
            bs.inputs['Specular IOR Level'].default_value=0;bs.inputs['Coat Weight'].default_value=0
            nt.links.new(tex.outputs['Alpha'],bs.inputs['Alpha']);mat.surface_render_method='DITHERED'
    return mat

blue=material('FW48 | Royal blue');black=material('FW48 | Exposed carbon','05070b',metallic=.08,roughness=.4)
wingpaint=material('FW48 | Rear endplate paint',image='rear-endplate-paint.png')
white=material('FW48 | White','f0f3fa',metallic=.08)
sidepaint=material('FW48 | Swept sidepod panels',image='sidepod-paint.png')
nosepaint=material('FW48 | Nose pinstripes',image='nose-paint.png')
copper=material('FW48 | Duracell ribbed copper',image='duracell-copper.png',metallic=.7,roughness=.33)

# Remove the previous baked sponsor textures and assign simple, non-overlapping
# planar paint coordinates. Original UVs are preserved for the rest of the car.
for o in [o for o in bpy.data.objects if o.type=='MESH' and any(m and (m.name.startswith('williams') or m.name.startswith('FW48 |')) for m in o.data.materials)]:
    if o.name.startswith('FW48 Decal'):continue
    uv=o.data.uv_layers.get('FW48_PaintUV') or o.data.uv_layers.new(name='FW48_PaintUV')
    indices={}
    for mat in (blue,black,white,sidepaint,nosepaint,copper,wingpaint):
        if mat.name not in o.data.materials:o.data.materials.append(mat)
        indices[mat.name]=o.data.materials.find(mat.name)
    mw=o.matrix_world;nm=mw.to_3x3().inverted().transposed()
    for p in o.data.polygons:
        old=o.data.materials[p.material_index]
        c=mw@p.center;n=(nm@p.normal).normalized();gz=-c.y;ax=abs(c.x)
        rear_end=(gz < -1.9 and ax>.54 and c.z>.28 and abs(n.x)>.3)
        if not (old.name.startswith('williams') or old.name.startswith('FW48 |') or rear_end):continue
        mat=sidepaint;mapping='side'
        if o.name=='Object_13':mat=black
        elif old.name.startswith('williams_wing') or (o.name in ('Object_6','Object_7','Object_8','DRS_Flap')):
            mat=black
            if gz < -1.90 and ax>.50 and c.z>.60:
                mat=wingpaint;mapping='rear-wing'
        else:
            if gz < -1.90 and ax>.50 and c.z>.60:mat=wingpaint;mapping='rear-wing'
            if gz>1.95 and ax>.60 and c.z<.45:mat=black
            if c.z<.245 or n.z<-.60:mat=black
            if c.z>.89 and -.98<gz<-.12 and ax<.21:mat=sidepaint
            if .90<c.z<1.085 and -.50<gz<-.12 and ax<.20:mat=copper;mapping='copper'
            if c.z>=1.085:mat=black
            if gz>1.85 and (abs(n.x)>.6 and c.z<.38):mat=black
            if gz>.92 and abs(c.x)<.24 and n.z>.35:mat=nosepaint;mapping='nose'
        if rear_end:mat=wingpaint;mapping='rear-wing'
        p.material_index=indices[mat.name]
        for li in p.loop_indices:
            v=mw@o.data.vertices[o.data.loops[li].vertex_index].co
            if mapping=='nose':u=(v.x+.22)/.44;vv=1-(-v.y-.92)/1.95
            elif mapping=='rear-wing':u=(-v.y+2.56)/.64;vv=(v.z-.28)/.66
            elif mapping=='copper':u=(-v.y+.50)/.38;vv=(v.z-.9)/.19
            else:u=(-v.y+2.6)/5.5;vv=v.z/1.3
            uv.data[li].uv=(u,vv)
    o.data.update()
for mat in (sidepaint,nosepaint,copper,wingpaint):
    nt=mat.node_tree;uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='FW48_PaintUV'
    for tex in [n for n in nt.nodes if n.type=='TEX_IMAGE']:nt.links.new(uv.outputs['UV'],tex.inputs['Vector'])

# Hide the old red tyre branding. Its physical sidewall texture is kept for wear.
for mat in bpy.data.materials:
    if mat.name.startswith(('sidewall','tread_medium')) and mat.use_nodes:
        bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        for link in list(bs.inputs['Base Color'].links):mat.node_tree.links.remove(link)
        bs.inputs['Base Color'].default_value=color('101116');bs.inputs['Roughness'].default_value=.56

# Source surface BVHs. Text is projected once onto the actual skin rather than
# baked into reused or mirrored Mercedes texture islands.
body_names=['Object_12','Object_13','Object_4','Object_6','Object_7','Object_8','DRS_Flap']
def bvh(names):
    verts=[];polys=[]
    for name in names:
        o=bpy.data.objects[name];start=len(verts);mw=o.matrix_world
        verts.extend(mw@v.co for v in o.data.vertices)
        polys.extend(tuple(start+i for i in p.vertices) for p in o.data.polygons)
    return BVHTree.FromPolygons(verts,polys)
body=bvh(body_names);paint=bvh(['Object_12']);halo=bvh(['Object_13']);tyres=bvh(['Object_15','Object_17','Object_18'])
collection=bpy.data.collections.get('FW48 | Reference decals')
if collection is None:collection=bpy.data.collections.new('FW48 | Reference decals');scene.collection.children.link(collection)
for ob in list(collection.objects):bpy.data.objects.remove(ob,do_unlink=True)
report=[]
def decal(id,art,view,gz,z,w,h,side=-1,x=0,target=None):
    mesh=bpy.data.meshes.new('FW48 Decal '+id);verts=[];uvs=[];valid=[]
    target=target or body
    U=max(16,min(220,int(w*250)));V=max(12,min(130,int(h*220)))
    for j in range(V+1):
        v=j/V
        for i in range(U+1):
            u=i/U
            if view=='side':
                origin=Vector((3*side,-(gz+(u-.5)*w*(-side)),z+(.5-v)*h));direction=Vector((-side,0,0))
            else:
                origin=Vector((x+(u-.5)*w,-(gz+(v-.5)*h),3));direction=Vector((0,0,-1))
            hit,n,idx,dist=target.ray_cast(origin,direction)
            good=hit is not None
            if good:
                good=(n.x*side>.025) if view=='side' else n.z>.05
                hit=hit+n*.003
            verts.append(tuple(hit) if good else (0,0,0));uvs.append((u,1-v));valid.append(good)
    faces=[]
    for j in range(V):
        for i in range(U):
            q=j*(U+1)+i;idx=(q,q+1,q+U+2,q+U+1)
            if all(valid[k] for k in idx):
                vs=[Vector(verts[k]) for k in idx]
                if max((vs[k]-vs[(k+1)%4]).length for k in range(4))>max(w/U,h/V)*8:continue
                if view=='side' and side<0:idx=tuple(reversed(idx))
                if view=='top':idx=tuple(reversed(idx))
                faces.append(idx)
    if not faces:
        bpy.data.meshes.remove(mesh);report.append({'id':id,'faces':0});return
    mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='DecalUV')
    for p in mesh.polygons:
        p.use_smooth=True
        for li in p.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
    ob=bpy.data.objects.new('FW48 Decal | '+id,mesh);collection.objects.link(ob)
    mat=bpy.data.materials.get('FW48 Art | '+art)
    if mat is None: mat=material('FW48 Art | '+art,image=art+'.png',alpha=True,metallic=0,roughness=.44)
    else:
        bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Specular IOR Level'].default_value=0;bs.inputs['Coat Weight'].default_value=0
    mesh.materials.append(mat)
    ob['reference_art']=art;ob['placement']=json.dumps({'view':view,'gz':gz,'z':z,'w':w,'h':h,'side':side,'x':x})
    report.append({'id':id,'faces':len(faces)})

side_specs=[
 ('atlassian','atlassian',-1.10,.690,.84,.115,'paint'),
 ('atlassian-symbol','atlassian_symbol',-1.09,.885,.24,.24,'paint'),
 ('kraken','kraken',-.43,.680,.33,.070,'paint'),
 ('claude','claude',-.055,.680,.30,.070,'paint'),
 ('barclays','barclays',-.10,.558,.58,.090,'body'),
 ('komatsu','komatsu',-.84,.462,.67,.100,'body'),
 ('gulf','n_gulf',-1.47,.565,.14,.14,'paint'),
 ('wilkinson','wilkinson',-1.65,.865,.16,.07,'paint'),
 ('duracell','duracell',-.73,.987,.235,.041,'paint'),
 ('brillio','brillio',.86,.645,.18,.061,'body'),
 ('stephens','stephens',1.01,.567,.38,.100,'body'),
 ('keeper','keeper',.62,.245,.42,.060,'body'),
 ('nwe','nwe',2.07,.435,.20,.10,'body'),
 ('front-end-betway','betway',2.37,.282,.30,.073,'body'),
 ('front-end-jackpot','jackpot',2.37,.215,.39,.047,'body'),
 ('rear-end-komatsu','rear_komatsu',-2.25,.865,.44,.085,'body'),
 ('halo-keeper','halo_keeper',.16,.873,.155,.027,'halo'),
 ('halo-airia','airia',.54,.885,.095,.031,'halo'),
]
for label,art,gz,z,w,h,t in side_specs:
    for side in (-1,1):decal(label+('-right' if side<0 else '-left'),art,'side',gz,z,w,h,side,target={'body':body,'paint':paint,'halo':halo}[t])
top_specs=[('n_atlassian',1.04,.19,.125),('n_barclays',1.22,.25,.045),('n_23',1.43,.24,.165),('n_bny',1.64,.26,.075),('n_gulf',1.98,.16,.15),('n_komatsu',2.17,.19,.043),('n_betway',2.30,.17,.048),('n_brillio',2.43,.15,.055),('n_vast',2.55,.14,.036),('n_keeper',2.65,.14,.032),('n_pirelli',2.74,.14,.035),('n_w',2.815,.06,.04)]
for art,gz,w,h in top_specs:decal(art,art,'top',gz,0,w,h,target=paint)
for x in (-.51,.51):
    decal('front-wing-atlassian-'+str(x),'atlassian','top',2.35,0,.49,.13,x=x)
    decal('front-wing-symbol-'+str(x),'atlassian_symbol','top',2.17,0,.16,.16,x=x)
    decal('front-wing-kraken-'+str(x),'kraken','top',2.69,0,.51,.13,x=x)
decal('rear-wing-atlassian','atlassian','top',-2.33,0,1.04,.17)
for side in (-1,1):
    for name,gz,z in [('front',1.6155,.3198),('rear',-1.7848,.3107)]:
        decal('wheel-'+name+'-'+str(side),'wheel-print','side',gz,z,.758,.758,side,target=tyres)
bpy.context.view_layer.update()
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.overlay.show_overlays=False
for im in bpy.data.images:
    if im.filepath.startswith(str(TEX)):
        im.reload();im.pack()
for ob in bpy.data.objects:
    if ob.type=='LIGHT' and ob.name.startswith('Review'):
        ob.data.energy=550;ob.data.specular_factor=.15
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.3
scene.view_settings.view_transform='Standard'
scene.cycles.samples=24
scene.render.filepath=str(ROOT/'previews/rebuilt-side.png')
bpy.ops.render.render(write_still=True)
result={'decals':report,'preview':scene.render.filepath}
