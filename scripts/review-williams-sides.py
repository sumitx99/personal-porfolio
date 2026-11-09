"""Review both baked sides without modifying approved nose/front-wing materials."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path('/Users/sk/PORTFOLIO/artifacts/williams')
scene = bpy.context.scene
changed = []
for material in bpy.data.materials:
    if not material.get('FW48_side'):
        continue
    if 'williams_paint' not in material.get('FW48_original', ''):
        continue
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Coat Weight'].default_value = .12
    shader.inputs['Coat Roughness'].default_value = .28
    changed.append(material.name)

camera = scene.camera
camera.data.type = 'ORTHO'
scene.cycles.samples = 32
previews = []
for side, sign in [('right', -1), ('left', 1)]:
    for view, location, target, scale, size in [
        ('side', (sign * 10, 0, .67), (0, 0, .55), 6.1, (1800, 700)),
        ('quarter', (sign * 6, -7, 5), (0, 0, .50), 6.0, (1600, 1000)),
    ]:
        camera.location = location
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = scale
        scene.render.resolution_x, scene.render.resolution_y = size
        scene.render.resolution_percentage = 100
        scene.render.filepath = str(ROOT / 'previews' / f'{side}-{view}-resumed-01.png')
        bpy.ops.render.render(write_still=True)
        previews.append(scene.render.filepath)

bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'williams-fw48-2026.blend'))
result = {'materials': changed, 'previews': previews}
