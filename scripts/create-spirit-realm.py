"""Run inside Blender through MCP. Builds original low-poly game assets."""
import bpy, math, json, os, bmesh
from mathutils import Vector
ROOT = r"C:\Users\Eko Priha\Downloads\ronda"
SOURCE = os.path.join(ROOT, "assets", "spirit-realm")
EXPORT = os.path.join(ROOT, "public", "models", "spirit-realm")
RUNTIME = os.path.join(ROOT, "src", "assets", "spirit-realm")
for p in (SOURCE, EXPORT, RUNTIME): os.makedirs(p, exist_ok=True)
scene = bpy.data.scenes.new("Samudra Sunyi • Asset Workshop")
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
stone=material("Sunyi | weathered limestone",(.30,.35,.31))
brick=material("Sunyi | ancient red brick",(.32,.105,.065))
dark=material("Sunyi | basalt",(.045,.085,.09))
jade=material("Sunyi | sea jade",(.025,.23,.19),.3)
roofmat=material("Sunyi | turquoise roof",(.025,.14,.145),.25)
gold=material("Sunyi | old gold",(.57,.34,.10),.65)
light=material("Sunyi | spirit turquoise",(.12,.8,.64),.2,1.5)
pearl=material("Sunyi | pearl",(.67,.76,.67),.15)
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
    ob.asset_mark(); ob.asset_data.description="Original low-poly Samudra Sunyi game asset. Y-up exports. No textures."
    for t in ("Ronda","Low Poly","Spirit Realm"): ob.asset_data.tags.new(t)
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
# Open pendopo: layered joglo roof, real passage between columns, worn base.
box("Terrace",0,.18,0,25,.36,20,stone)
box("Foundation",0,.52,0,23,.32,18,brick)
box("Floor",0,.72,0,22.5,.12,17.5,stone)
for i in range(3): box("Entry stair",0,.12+i*.13,10-i*.5,7,.24+i*.26,1.2,stone)
for x in (-9,-5,5,9):
    for z in (-6,6):
        box("Column foot",x,1,z,1.2,.5,1.2,stone)
        box("Teak column",x,3.8,z,.55,5.2,.55,jade)
        box("Gold capital",x,6.25,z,.9,.3,.9,gold)
        for y in (1.4,5.8): box("Column binding",x,y,z,.65,.16,.65,gold)
for z in (-6,6): box("Long lintel",0,6.5,z,20,.5,.6,brick)
for x in (-9,9): box("Side lintel",x,6.5,0,.6,.5,13,brick)
for y,w,d,tw,td,h in [(6.7,26,21,16,12,2.4),(9.2,18,14,7,5,2.3),(11.6,9,7,1,.7,2.4)]:
    roof("Joglo tier",y,w,d,tw,td,h,roofmat)
    for z in (-d/2,d/2): box("Golden eave",0,y,z,w,.15,.15,gold)
    for x in (-w/2,w/2): box("Golden side eave",x,y,0,.15,.15,d,gold)
    for x in (-w/2,w/2):
        for z in (-d/2,d/2):
            rod("Upturned roof finial",(x,y,z),(x*1.03,y+.75,z*1.03),.09,gold)
cone("Crown",0,14.6,0,.55,0,1.5,gold)
for x in (-7,7):
    box("Carved screen",x,2,-7,3,2.4,.4,brick)
    for dx in (-.8,0,.8): ico("Screen inset",x+dx,2.2,-6.76,.22,.7,.10,gold)
box("Throne dais",0,1,-5,4,.5,3,gold)
box("Throne back",0,2.7,-6,2.8,3,.45,jade)
for x in (-1.5,1.5): cone("Throne spire",x,4,-6,.25,0,1.8,gold)
export_asset("keraton-samudra-sunyi","Keraton_Samudra_Sunyi",0)
# Candi bentar gateway, reused on beach and at palace.
for side in (-1,1):
    for y,w,h in [(.3,4,.6),(1,3.6,.8),(3.2,2.8,3.6),(5.4,3.2,.6),(6.2,2.5,1),(7.2,1.8,1),(8.1,1.1,.8)]:
        box("Candi brick",side*4,y,0,w,h,2.6 if y<5 else 2,brick)
    for y in (1.5,4.9,5.6,6.7,7.7): box("Stone course",side*4,y,0,3 if y<6 else 1.9,.16,2.8,gold)
    ico("Sea seal",side*4,3.5,1.42,.7,1.1,.16,jade)
    ico("Seal light",side*4,3.5,1.61,.22,.45,.1,light)
export_asset("gerbang-sukma","Gerbang_Sukma",33)
# Penjaga Palung: heavily faceted coral armour, mask, fins and trident.
ico("Armoured torso",0,3,0,1.6,1.9,.85,jade,2)
ico("Basalt belly",0,2.6,.63,.9,1,.38,dark,1)
for side in (-1,1):
    ico("Foot",side*.9,.35,.3,.7,.35,.9,dark)
    rod("Leg",(side*.75,.5,0),(side*.8,2,0),.45,stone)
    ico("Shoulder",side*1.65,4,0,.95,.9,.9,stone)
    rod("Arm",(side*1.7,3.9,0),(side*2.2,2.3,.25),.4,jade)
    ico("Fist",side*2.2,2.2,.25,.55,.6,.5,dark)
    for i in range(3):
        rod("Coral spike",(side*(1.3+i*.25),4.4,0),(side*(1.4+i*.5),5.5-i*.2,-.2),.15,gold)
    ico("Eye",side*.32,5.1,.68,.19,.1,.1,light)
    for i in range(4):
        ico("Gold scale",side*(.45+i*.18),3.7-i*.35,.73,.33,.23,.12,gold)
ico("Mask",0,4.9,.12,.8,.9,.65,stone,2)
box("Mouth",0,4.68,.77,.65,.12,.08,dark)
cone("Crown middle",0,6,0,.28,0,1.2,gold)
for side in (-1,1):
    rod("Horn",(side*.55,5.4,0),(side*1.05,6.2,-.1),.16,gold)
    rod("Horn hook",(side*1.05,6.2,-.1),(side*.7,6.6,.1),.10,gold)
rod("Trident shaft",(2.4,.2,.3),(2.4,6.6,.3),.12,gold)
rod("Trident crossbar",(1.65,5.8,.3),(3.15,5.8,.3),.11,gold)
for x in (1.65,2.4,3.15):
    rod("Trident tine",(x,5.8,.3),(x,6.8 if x==2.4 else 6.5,.3),.12,gold)
    ico("Trident light",x,6.8 if x==2.4 else 6.5,.3,.13,.25,.13,light)
export_asset("penjaga-palung","Penjaga_Palung",50)
bpy.data.libraries.write(os.path.join(SOURCE,"samudra-sunyi.blend"),{scene},fake_user=True)
print("Saved source, three GLBs, and exact runtime triangle batches.")
