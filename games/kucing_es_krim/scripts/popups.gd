extends Node2D
## Floating text popups ("YUMMY! +50", "ADUH!", "Duhh!").
## Rise 0.8 px/frame, fade out over the last 20 frames of life.

var _pops: Array = []


func add(txt: String, pos: Vector2, color: Color, life: int) -> void:
	_pops.append({txt = txt, pos = pos, life = float(life), color = color})


func clear() -> void:
	_pops.clear()
	queue_redraw()


func _physics_process(_delta: float) -> void:
	if _pops.is_empty():
		return
	for i in range(_pops.size() - 1, -1, -1):
		var p: Dictionary = _pops[i]
		p.pos.y -= 0.8
		p.life -= 1.0
		if p.life <= 0.0:
			_pops.remove_at(i)
	queue_redraw()


func _draw() -> void:
	for p in _pops:
		var c: Color = p.color
		c.a *= minf(1.0, p.life / 20.0)
		KDraw.text_c(self, KDraw.bold_font(), p.pos, p.txt, 22, c)
