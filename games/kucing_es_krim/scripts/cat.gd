extends Node2D
## The kawaii cat + its cone and scoop stack. Eases toward target_x while
## playing; mood > 0 shows happy ^^ eyes, mood < 0 shows X eyes.

var target_x := 240.0
var mood := 0
var stack: Array[int] = []
var playing := false

var _t := 0

const BODY := Color("9aa0ad")
const TAIL := Color("8b8f9c")
const PINK := Color("e8a0ac")
const FACE := Color("3f3a45")


func _physics_process(_delta: float) -> void:
	_t += 1
	if mood != 0:
		mood += -1 if mood > 0 else 1
	if playing:
		position.x += (target_x - position.x) * 0.25
	queue_redraw()


func _draw() -> void:
	var wob := sin(_t * 0.08) * 2.0
	# Soft shadow under the cat.
	KDraw.ellipse(self, Vector2(0, 62), 60, 12, Color(0, 0, 0, 0.10))
	_draw_cat(wob)
	_draw_stack_and_cone()


func _draw_cat(wob: float) -> void:
	# Tail.
	KDraw.stroke_qbezier(self, Vector2(38, 18), Vector2(66, 10), Vector2(62, -16 + wob), 13.0, TAIL, true)
	# Body + belly patch.
	KDraw.ellipse(self, Vector2(0, 18), 44, 38, BODY)
	KDraw.ellipse(self, Vector2(-14, 32), 13, 10, PINK, 0.3)

	var hy := -36.0 + wob
	# Ears (outer + inner).
	draw_colored_polygon(PackedVector2Array([Vector2(-30, hy - 18), Vector2(-38, hy - 42), Vector2(-12, hy - 30)]), BODY)
	draw_colored_polygon(PackedVector2Array([Vector2(30, hy - 18), Vector2(38, hy - 42), Vector2(12, hy - 30)]), BODY)
	draw_colored_polygon(PackedVector2Array([Vector2(-29, hy - 22), Vector2(-34, hy - 37), Vector2(-17, hy - 29)]), PINK)
	draw_colored_polygon(PackedVector2Array([Vector2(29, hy - 22), Vector2(34, hy - 37), Vector2(17, hy - 29)]), PINK)
	# Head.
	KDraw.ellipse(self, Vector2(0, hy), 36, 32, BODY)

	# Eyes by mood.
	if mood < 0:
		for ex in [-14.0, 14.0]:
			var ey := hy - 4.0
			draw_line(Vector2(ex - 4, ey - 4), Vector2(ex + 4, ey + 4), FACE, 3.0, true)
			draw_line(Vector2(ex + 4, ey - 4), Vector2(ex - 4, ey + 4), FACE, 3.0, true)
	elif mood > 0:
		for ex in [-14.0, 14.0]:
			var ey := hy - 3.0
			KDraw.stroke_qbezier(self, Vector2(ex - 5, ey + 2), Vector2(ex, ey - 4), Vector2(ex + 5, ey + 2), 3.0, FACE, true)
	else:
		draw_circle(Vector2(-14, hy - 4), 3.5, FACE)
		draw_circle(Vector2(14, hy - 4), 3.5, FACE)

	# Nose + mouth.
	draw_colored_polygon(PackedVector2Array([Vector2(-4, hy + 5), Vector2(4, hy + 5), Vector2(0, hy + 10)]), PINK)
	KDraw.stroke_qbezier(self, Vector2(0, hy + 10), Vector2(-4, hy + 15), Vector2(-8, hy + 13), 1.6, FACE, true)
	KDraw.stroke_qbezier(self, Vector2(0, hy + 10), Vector2(4, hy + 15), Vector2(8, hy + 13), 1.6, FACE, true)

	# Whiskers.
	var wc := Color(0.247, 0.227, 0.271, 0.6)
	draw_line(Vector2(-30, hy + 4), Vector2(-46, hy + 1), wc, 1.3, true)
	draw_line(Vector2(-30, hy + 9), Vector2(-46, hy + 11), wc, 1.3, true)
	draw_line(Vector2(30, hy + 4), Vector2(46, hy + 1), wc, 1.3, true)
	draw_line(Vector2(30, hy + 9), Vector2(46, hy + 11), wc, 1.3, true)


func _draw_stack_and_cone() -> void:
	# Cone anchor is +34 px right of the cat, +8 px down (matches catch hitbox).
	KDraw.cone(self, Vector2(34, 2), 1.1)
	for i in stack.size():
		var sway := sin(_t * 0.1 + i * 0.5) * (i * 0.7)
		KDraw.scoop(self, Vector2(34 + sway, 8 - 16 - i * 20), stack[i], 14.0)
