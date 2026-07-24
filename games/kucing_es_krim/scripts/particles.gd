extends Node2D
## Simple frame-based particle bursts (10 dots, gravity 0.15/frame).

var _parts: Array = []


func burst(pos: Vector2, color: Color) -> void:
	for k in 10:
		var a := randf() * TAU
		var v := 1.5 + randf() * 2.5
		_parts.append({
			pos = pos,
			vel = Vector2(cos(a) * v, sin(a) * v - 1.5),
			life = 24.0 + randf() * 14.0,
			color = color,
		})


func clear() -> void:
	_parts.clear()
	queue_redraw()


func _physics_process(_delta: float) -> void:
	if _parts.is_empty():
		return
	for i in range(_parts.size() - 1, -1, -1):
		var p: Dictionary = _parts[i]
		p.pos += p.vel
		p.vel.y += 0.15
		p.life -= 1.0
		if p.life <= 0.0:
			_parts.remove_at(i)
	queue_redraw()


func _draw() -> void:
	for p in _parts:
		draw_circle(p.pos, 3.0, Color(p.color, minf(1.0, p.life / 15.0)))
