"""Run inside Blender through MCP. Builds original low-poly game assets."""
import bpy, math, json, os, bmesh
from mathutils import Vector
ROOT = r"C:\Users\Eko Priha\Downloads\ronda"
SOURCE = os.path.join(ROOT, "assets", "karang-tirta")
EXPORT = os.path.join(ROOT, "public", "models", "karang-tirta")
RUNTIME = os.path.join(ROOT, "src", "assets", "karang-tirta")
for p in (SOURCE, EXPORT, RUNTIME): os.makedirs(p, exist_ok=True)
scene = bpy.data.scenes.new("Karang Tirta • Asset Workshop")
bpy.context.window.scene = scene
def material(name, rgb, metal=0, glow=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; m.diffuse_color=(*rgb,1)
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value=(*rgb,1)
    n.inputs['Metallic'].default_value=metal
    n.inputs['Roughness'].default_value=.6
    n.inputs['Emission Color'].default_value=(*rgb,1)
    n.inputs['Emission Strength'].default_value=glow
    return m
stone=material("Tirta | weathered limestone",(.30,.35,.31))
brick=material("Tirta | ancient red brick",(.32,.105,.065))
dark=material("Tirta | basalt",(.045,.085,.09))
jade=material("Tirta | sea jade",(.025,.23,.19),.3)
roofmat=material("Tirta | turquoise roof",(.025,.14,.145),.25)
gold=material("Tirta | old gold",(.57,.34,.10),.65)
light=material("Tirta | spirit turquoise",(.12,.8,.64),.2,1.5)
pearl=material("Tirta | pearl",(.67,.76,.67),.15)
parts=[]
def coord(p): return (p[0],-p[2],p[1])
def finish(ob,name,mat):
    ob.name=name; ob.data.materials.append(mat); parts.append(ob); return ob
def box(name,x,y,z,w,h,d,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=coord((x,y,z)))
    ob=bpy.context.object; ob.scale=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(ob,name,mat)
def ico(name,x,y,z,sx,sy,sz,mat,sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=coord((x,y,z)))
    ob=bpy.context.object; ob.scale=(sx,sz,sy)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(ob,name,mat)
def cone(name,x,y,z,r1,r2,h,mat,n=8):
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=h,location=coord((x,y,z)))
    return finish(bpy.context.object,name,mat)
def rod(name,a,b,r,mat):
    av,bv=Vector(coord(a)),Vector(coord(b)); delta=bv-av
    bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=r,depth=delta.length,location=(av+bv)/2)
    ob=bpy.context.object; ob.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return finish(ob,name,mat)
def roof(name,y,w,d,topw,topd,h,mat):
    verts=[coord(p) for p in [(-w/2,y,-d/2),(w/2,y,-d/2),(w/2,y,d/2),(-w/2,y,d/2),(-topw/2,y+h,-topd/2),(topw/2,y+h,-topd/2),(topw/2,y+h,topd/2),(-topw/2,y+h,topd/2)]]
    faces=[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7),(3,2,1,0)]
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    bm=bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(me); bm.free()
    ob=bpy.data.objects.new(name,me); scene.collection.objects.link(ob); return finish(ob,name,mat)
def export_asset(slug,title,display_x):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join(); ob=bpy.context.object; ob.name=title
    # Bake world coordinates into mesh and place origin at floor centre.
    matrix=ob.matrix_world.copy()
    for v in ob.data.vertices: v.co=matrix@v.co
    ob.matrix_world.identity()
    ob.asset_mark(); ob.asset_data.description="Original low-poly Karang Tirta game asset. Y-up exports. No textures."
    for t in ("Ronda","Low Poly","Karang Tirta"): ob.asset_data.tags.new(t)
    ob.data.calc_loop_triangles(); batches=[]
    for mi,m in enumerate(ob.data.materials):
        pos=[]
        for tri in ob.data.loop_triangles:
            if tri.material_index!=mi: continue
            for vi in tri.vertices:
                x,y,z=ob.data.vertices[vi].co
                pos.extend([round(x,5),round(z,5),round(-y,5)])
        if not pos: continue
        n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        batches.append(dict(name=m.name,color=list(n.inputs['Base Color'].default_value)[:3],metalness=n.inputs['Metallic'].default_value,roughness=.6,emission=n.inputs['Emission Strength'].default_value,positions=pos))
    data=dict(name=title,triangles=len(ob.data.loop_triangles),batches=batches)
    with open(os.path.join(RUNTIME,slug+".json"),"w") as f: json.dump(data,f,separators=(',',':'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(EXPORT,slug+".glb"),use_selection=True,use_active_scene=True,export_yup=True)
    print(slug, data["triangles"], "triangles")
    ob.location.x=display_x
    parts.clear()
    return ob

# Low-poly stilt house with veranda, timber cladding, awning and stair.
timber=material("Tirta | teak",(.22,.105,.047))
plank=material("Tirta | faded aqua boards",(.13,.36,.31))
rust=material("Tirta | red clay roof",(.38,.12,.055))
ivory=material("Tirta | chalk white",(.78,.73,.58))
blue=material("Tirta | boat blue",(.025,.18,.38),.15)
for x in (-3,3):
    for z in (-2.5,2.5):box("Stilt",x,1,z,.4,2,.4,timber)
box("Raised deck",0,2,0,7,.25,6.5,timber)
box("House walls",0,3.7,-.6,6,3.2,4.8,plank)
box("Door",0,3.3,1.83,1.3,2.5,.12,timber)
for x in (-2,2):
    box("Window",x,3.9,1.84,1.2,1.1,.12,dark)
    for a in (-.58,.58):box("Window frame",x+a,3.9,1.94,.08,1.2,.1,ivory)
for y in (2.4,3,3.6,4.2,4.8):box("Cladding",0,y,1.83,6,.04,.08,timber)
roof("Gabled roof",5.3,7.6,6.5,.15,6.5,2.2,rust)
for x in (-3.1,3.1):
    rod("Veranda post",(x,2,3),(x,5.4,3),.10,timber)
    box("Veranda side rail",x,2.9,2.5,.12,.15,1.4,ivory)
for x in (-2,2):box("Front rail",x,2.9,3.15,2,.15,.12,ivory)
for i in range(5):box("Stair tread",0,.2+i*.38,5.6-i*.46,1.7,.3,.55,timber)
export_asset("rumah-panggung","Rumah_Panggung_Karang_Tirta",0)

# Lighthouse has alternating courses and a lantern balcony.
cone("Foundation",0,.3,0,4.3,4.3,.6,stone,12)
for i in range(6):
    cone("Paint course",0,1.7+i*2.3,0,3.3-i*.25,3.05-i*.25,2.3,ivory if i%2==0 else rust,12)
box("Lighthouse door",0,1.9,3.2,1.5,2.8,.18,timber)
for y in (5,9,13):box("Tower window",0,y,3.1-y*.1,.55,.9,.12,dark)
cone("Balcony",0,15,0,3.2,3.2,.35,stone,12)
for i in range(12):
    a=i*math.tau/12;x=math.sin(a)*3;z=math.cos(a)*3
    rod("Railing post",(x,15,z),(x,16,z),.07,timber)
    b=(i+1)*math.tau/12
    rod("Railing",(x,16,z),(math.sin(b)*3,16,math.cos(b)*3),.07,timber)
cone("Lantern base",0,15.5,0,1.9,1.9,.5,dark,8)
for i in range(8):
    a=i*math.tau/8;rod("Lantern frame",(math.sin(a)*1.8,15.7,math.cos(a)*1.8),(math.sin(a)*1.8,18,math.cos(a)*1.8),.08,timber)
ico("Lens",0,16.8,0,.9,1,.9,pearl,2)
cone("Lantern cap",0,18.4,0,2.5,.3,1.3,rust,8)
cone("Finial",0,19.5,0,.25,0,1,gold,8)
export_asset("mercusuar","Mercusuar_Karang_Tirta",15)

# Open motorboat. Bow points +Z in runtime; origin on the waterline.
verts=[(-1.1,-.3,-2.6),(1.1,-.3,-2.6),(.7,-.3,1.9),(0,-.3,3),(-.7,-.3,1.9),
       (-1.4,.75,-2.8),(1.4,.75,-2.8),(1.1,.75,1.9),(0,1.1,3.5),(-1.1,.75,1.9)]
faces=[(4,3,2,1,0)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
me=bpy.data.meshes.new("Open boat hull");me.from_pydata([coord(v) for v in verts],[],faces);me.update()
bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
ob=bpy.data.objects.new("Hull",me);scene.collection.objects.link(ob);finish(ob,"Motorboat hull",blue)
box("Deck",0,.15,-.1,2,.18,4.6,timber)
for z in (-1.8,0,1.7):box("Bench",0,.62,z,2.2,.16,.42,ivory)
for side in (-1,1):rod("Gunwale",(side*1.42,.78,-2.8),(side*1.1,.78,1.9),.07,ivory)
box("Outboard",0,.65,-3.1,.6,1,.55,dark)
rod("Prop shaft",(0,.4,-3.1),(0,-.65,-3.1),.12,dark)
rod("Propeller",(-.4,-.6,-3.1),(.4,-.6,-3.1),.06,stone)
box("Console",.5,1.1,.65,.7,.7,.6,plank)
rod("Roof post",(-1,1,-1.4),(-1,3.1,-1.4),.05,timber)
rod("Roof post",(1,1,-1.4),(1,3.1,-1.4),.05,timber)
box("Canvas sunshade",0,3.1,-1.3,2.6,.10,2.2,rust)
export_asset("perahu-motor","Perahu_Motor_Karang_Tirta",26)

# Buto Ijo, a seven-metre green giant with a heavy belly, tusks and batik loincloth.
green=material("Buto | green skin",(.12,.36,.035))
greenlight=material("Buto | facial planes",(.22,.46,.055))
hair=material("Buto | black hair",(.018,.023,.012))
cloth=material("Buto | maroon cloth",(.22,.035,.025))
fang=material("Buto | ivory tusks",(.81,.74,.48))
eye=material("Buto | amber eyes",(.9,.45,.025),0,.65)
for side in (-1,1):
    ico("Broad foot",side*.7,.27,.4,.62,.27,.95,green)
    rod("Leg",(side*.7,.4,0),(side*.75,2.35,0),.48,green)
    ico("Calf",side*.7,1.2,.05,.53,.85,.55,green,2)
    for j in (-1,0,1):ico("Toe",side*.7+j*.18,.25,1.1,.12,.13,.24,greenlight)
ico("Huge belly",0,3.1,.2,1.55,1.6,1.05,green,2)
ico("Chest",0,4.3,0,1.6,.95,.8,green,2)
for side in (-1,1):
    ico("Shoulder",side*1.55,4.65,0,.75,.8,.78,green,2)
    rod("Upper arm",(side*1.65,4.5,0),(side*2.03,3.3,.05),.48,green)
    rod("Forearm",(side*2.03,3.3,.05),(side*2.15,2.3,.3),.44,green)
    ico("Fist",side*2.15,2.22,.35,.5,.53,.5,greenlight,2)
cone("Batik sarong",0,2.15,.05,1.25,1.35,1.05,cloth,10)
cone("Waistband",0,2.65,.05,1.4,1.4,.18,gold,10)
for i in range(10):
    a=i*math.tau/10
    ico("Batik diamond",math.sin(a)*1.28,2.1,.05+math.cos(a)*1.28,.10,.19,.10,gold)
rod("Neck",(0,4.65,0),(0,5.25,0),.55,green)
ico("Head",0,5.8,.05,.98,1.04,.8,green,2)
ico("Jaw",0,5.4,.48,.76,.47,.53,greenlight,2)
ico("Nose",0,5.84,.82,.28,.28,.34,greenlight,1)
box("Dark mouth",0,5.34,.97,.92,.22,.12,hair)
for side in (-1,1):
    ico("Ear",side*1,5.8,0,.4,.35,.21,green)
    ico("Eye socket",side*.4,6.04,.69,.34,.19,.17,hair)
    ico("Amber eye",side*.4,6.04,.83,.18,.095,.06,eye)
    rod("Heavy brow",(side*.1,6.25,.76),(side*.72,6.20,.64),.15,hair)
    cone("Upward tusk",side*.45,5.55,1,.16,.02,.7,fang,6)
ico("Hair cap",0,6.5,-.12,1.02,.48,.78,hair,1)
for x in (-.6,-.3,0,.3,.6):cone("Spiked hair",x,6.98,-.13,.23,.04,.65,hair,5)
export_asset("buto-ijo","Buto_Ijo",38)
bpy.data.libraries.write(os.path.join(SOURCE,"karang-tirta.blend"),{scene},fake_user=True)
print("Karang Tirta: four original assets saved.")
