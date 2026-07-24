extends Node2D
## A falling scoop / bomb / rotten fish. Movement and collision are driven
## by main.gd each physics tick; this node only knows how to draw itself.

enum Type { SCOOP, BOMB, FISH }

var type: Type = Type.SCOOP
var color_index := 0
var rot := 0.0
var vr := 0.0


func _draw() -> void:
	match type:
		Type.SCOOP:
			KDraw.scoop(self, Vector2.ZERO, color_index, 16.0)
		Type.BOMB:
			_draw_bomb()
		Type.FISH:
			_draw_fish()


func _draw_bomb() -> void:
	draw_set_transform(Vector2.ZERO, rot * 0.3, Vector2.ONE)
	draw_circle(Vector2(0, 2), 16, Color("4a4046"))
	draw_circle(Vector2(0, 0), 15, Color("5d525a"))
	draw_circle(Vector2(-5, -5), 5, Color(1, 1, 1, 0.25))
	KDraw.stroke_qbezier(self, Vector2(4, -13), Vector2(10, -20), Vector2(16, -18), 3.0, Color("8a6a4a"))
	draw_circle(Vector2(17, -18), 4, Color("f7b13f"))
	draw_circle(Vector2(17, -19), 2.2, Color("f76a3f"))


func _draw_fish() -> void:
	draw_set_transform(Vector2.ZERO, sin(rot) * 0.25, Vector2.ONE)
	var body := Color("9db3b8")
	KDraw.ellipse(self, Vector2.ZERO, 16, 9, body)
	draw_colored_polygon(PackedVector2Array([Vector2(13, 0), Vector2(24, -8), Vector2(24, 8)]), body)
	KDraw.ellipse(self, Vector2(0, 3), 14, 5, Color("7d9398"))
	draw_circle(Vector2(-8, -2), 1.8, Color("33383a"))
	KDraw.stroke_qbezier(self, Vector2(-2, -12), Vector2(2, -17), Vector2(-1, -22), 2.0, Color(0.471, 0.588, 0.353, 0.6))
