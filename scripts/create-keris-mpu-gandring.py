import bpy, math, json, os, bmesh
from mathutils import Quaternion
ROOT = r"C:\Users\Eko Priha\Downloads\ronda"
out = os.path.join(ROOT, "public", "models", "weapons")
source = os.path.join(ROOT, "assets", "weapons")
runtime = os.path.join(ROOT, "src", "assets")
for p in (out, source, runtime): os.makedirs(p, exist_ok=True)
scene = bpy.data.scenes.new("Keris Mpu Gandring • Asset")
bpy.context.window.scene = scene
parts = []
def mat(name, color, metal, rough):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    return m
steel = mat("Gandring | Forged iron", (.15,.19,.21), .78, .38)
edge = mat("Gandring | Honed edges", (.49,.57,.59), .85, .28)
pamor = mat("Gandring | Silver pamor", (.66,.71,.68), .75, .38)
wood = mat("Gandring | Dark teak", (.105,.035,.018), 0, .5)
woodlight = mat("Gandring | Carved teak facets", (.22,.079,.028), 0, .48)
gold = mat("Gandring | Aged brass", (.55,.31,.085), .72, .34)
darkgold = mat("Gandring | Recessed brass", (.22,.12,.035), .7, .44)
def mesh(name, verts, faces, mats, indices=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name,data)
    scene.collection.objects.link(ob)
    for m in mats: data.materials.append(m)
    if indices:
        for p, idx in zip(data.polygons,indices): p.material_index = idx
    bm=bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(data); bm.free()
    parts.append(ob)
    return ob
# Continuous diamond-section blade: seven alternating lobes and a tapered point.
rings=[]
for i in range(43):
    t=i/42
    cx=.022*math.sin(7*math.pi*t)*(math.sin(math.pi*t)**.45)
    width=.044*(1-t)**.68+.0012
    if t<.12: width += .024*(1-t/.12)
    thick=.008*(1-.8*t)
    rings.append((cx,width,thick,.145+.49*t))
v=[]; f=[]; idx=[]
for x,w,d,z in rings:
    v.extend([(x-w,0,z),(x,-d,z),(x+w,0,z),(x,d,z)])
for i in range(len(rings)-1):
    for k in range(4):
        f.append((4*i+k,4*i+(k+1)%4,4*(i+1)+(k+1)%4,4*(i+1)+k))
        idx.append(0 if k in (0,3) else 1)
f.append((3,2,1,0)); idx.append(0)
tip=len(v); v.append((0,0,.655))
for k in range(4):
    f.append((4*42+k,4*42+(k+1)%4,tip)); idx.append(1)
mesh("Bilah • tujuh luk",v,f,[steel,edge],idx)
# Thin silver pamor ribbons follow each broad face; no texture dependency.
for side in (-1,1):
    for band in (-1,1):
        vv=[]; ff=[]
        for i,(x,w,d,z) in enumerate(rings[:-2]):
            t=i/42
            u=band*(.35+.10*math.sin(t*math.pi*19))
            for du in (-.025,.025):
                a=u+du
                vv.append((x+w*a,side*(d*(1-abs(a))+.00015),z))
        for i in range(len(vv)//2-1): ff.append((2*i,2*i+1,2*i+3,2*i+2))
        mesh("Pamor • flowing silver",vv,ff,[pamor])
# Asymmetric ganja, a low broad blade shoulder.
outline=[(-.085,.125),(-.078,.141),(-.043,.157),(-.015,.153),(.022,.149),(.066,.136),(.09,.122),(.048,.12),(-.032,.12)]
vv=[(x,y,z) for y in (-.012,.012) for x,z in outline]
n=len(outline)
ff=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
ff += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh("Ganja • asymmetric shoulder",vv,ff,[steel,edge],[0,0]+[1]*n)
def loft(name, rings, sides, mats):
    vv=[]; ff=[]; inds=[]
    for x,z,rx,ry in rings:
        for j in range(sides):
            a=j*2*math.pi/sides
            vv.append((x+rx*math.cos(a),ry*math.sin(a),z))
    ff.append(tuple(range(sides-1,-1,-1))); inds.append(0)
    for i in range(len(rings)-1):
        for j in range(sides):
            ff.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
            inds.append(j%len(mats))
    ff.append(tuple((len(rings)-1)*sides+j for j in range(sides))); inds.append(0)
    return mesh(name,vv,ff,mats,inds)
loft("Ukiran • bent teak grip",[
    (-.061,-.125,.025,.024),(-.072,-.106,.033,.029),
    (-.055,-.077,.034,.029),(-.025,-.049,.028,.024),
    (-.006,-.015,.022,.022),(0,.035,.021,.022),
    (0,.075,.026,.024),(0,.087,.023,.021)],8,[wood,woodlight,wood])
loft("Mendak • brass collar",[(0,.078,.025,.026),(0,.085,.033,.031),(0,.099,.031,.03),(0,.111,.026,.026),(0,.119,.035,.03)],12,[gold,darkgold,gold])
for z in (.082,.103,.117):
    loft("Mendak • raised band",[(0,z-.002,.034,.031),(0,z+.002,.034,.031)],12,[gold])
loft("Grip • brass heel",[(-.061,-.129,.025,.024),(-.066,-.121,.028,.026)],8,[gold])
# Join to a single mesh; keep the origin at the hand grip.
bpy.ops.object.select_all(action='DESELECT')
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
ob=bpy.context.object
ob.name="Keris_Mpu_Gandring"
ob.data.name="Keris_Mpu_Gandring_LowPoly"
ob["weapon_id"]="keris-mpu-gandring"
ob["style"]="Original stylized seven-luk fantasy keris; not a historical reconstruction"
ob["grip_origin"]="Origin at grip; Z points toward blade tip; metres"
ob.asset_mark()
ob.asset_data.description="Low-poly Keris Mpu Gandring. Seven-luk forged blade, silver pamor, teak grip, brass mendak. Grip pivot. No external textures."
for tag in ("Weapon","Keris","Low Poly","Ronda"): ob.asset_data.tags.new(tag)
ob.data.calc_loop_triangles()
triangles=len(ob.data.loop_triangles)
# Runtime uses the exact Blender triangles, mapped Z-up to Three.js Y-up.
batches=[]
for mi,m in enumerate(ob.data.materials):
    positions=[]
    for tri in ob.data.loop_triangles:
        if tri.material_index != mi: continue
        for vi in tri.vertices:
            x,y,z=ob.data.vertices[vi].co
            positions.extend([round(x,6),round(z,6),round(-y,6)])
    if not positions: continue
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    batches.append(dict(name=m.name, color=list(bs.inputs['Base Color'].default_value)[:3], metalness=bs.inputs['Metallic'].default_value,roughness=bs.inputs['Roughness'].default_value,positions=positions))
asset=dict(name=ob.name,weaponId=ob["weapon_id"],triangles=triangles,units="metres",upAxis="Y",batches=batches)
with open(os.path.join(runtime,"keris-mpu-gandring.json"),"w") as fp: json.dump(asset,fp,separators=(',',':'))
prop=bpy.ops.export_scene.gltf.get_rna_type().properties['export_format']
print("Export default",prop.default)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,"keris-mpu-gandring.glb"),use_selection=True,export_yup=True)
# Only this dedicated scene and its dependencies are saved into the asset library file.
bpy.data.libraries.write(os.path.join(source,"keris-mpu-gandring.blend"),{scene},fake_user=True)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_rotation=Quaternion((1,0,0),math.pi/2)
        area.spaces.active.region_3d.view_location=(0,0,.26)
        area.spaces.active.region_3d.view_distance=1.05
        area.spaces.active.shading.color_type='MATERIAL'
print(json.dumps(dict(name=ob.name,triangles=triangles,vertices=len(ob.data.vertices),dimensions=list(ob.dimensions),blend=os.path.join(source,"keris-mpu-gandring.blend"))))
