class_name KDraw
## Shared procedural-drawing helpers for Kucing Es Krim.
## The art is drawn in code (like the HTML5 prototype); swap these for
## sprites later without touching the game logic.

const SCOOP_COLORS := [
	[Color("7fd8c8"), Color("5bbfae")],
	[Color("f6a1b5"), Color("e87f98")],
	[Color("f7d774"), Color("e8bd4a")],
	[Color("c3a1e8"), Color("a97fd4")],
	[Color("f7b27f"), Color("e8945a")],
]

const ACCENT := Color("b0483f")
const CARD_BG := Color("fdf3ec")
const TEXT_BROWN := Color("7a544a")
const HEART_RED := Color("e0526b")

static var _bold_font: FontVariation


static func font() -> Font:
	return ThemeDB.fallback_font


static func bold_font() -> Font:
	if _bold_font == null:
		_bold_font = FontVariation.new()
		_bold_font.base_font = ThemeDB.fallback_font
		_bold_font.variation_embolden = 0.7
	return _bold_font


## Text centered horizontally on pos.x, vertically on pos.y (canvas "middle" baseline).
static func text_c(ci: CanvasItem, f: Font, pos: Vector2, txt: String, size: int, color: Color) -> void:
	ci.draw_string(f, Vector2(pos.x - 500.0, pos.y + size * 0.36), txt,
			HORIZONTAL_ALIGNMENT_CENTER, 1000.0, size, color)


static func ellipse(ci: CanvasItem, center: Vector2, rx: float, ry: float, color: Color, rot := 0.0, steps := 40) -> void:
	var pts := PackedVector2Array()
	for i in steps:
		var a := TAU * i / steps
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry).rotated(rot))
	ci.draw_colored_polygon(pts, color)


static func rounded_rect(ci: CanvasItem, rect: Rect2, radius: float, color: Color) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = color
	sb.set_corner_radius_all(int(radius))
	ci.draw_style_box(sb, rect)


static func rounded_rect_outline(ci: CanvasItem, rect: Rect2, radius: float, width: float, color: Color) -> void:
	var sb := StyleBoxFlat.new()
	sb.draw_center = false
	sb.border_color = color
	sb.set_border_width_all(int(width))
	sb.set_corner_radius_all(int(radius))
	ci.draw_style_box(sb, rect)


static func qbezier(p0: Vector2, p1: Vector2, p2: Vector2, steps := 16) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in steps + 1:
		var u := float(i) / steps
		pts.append(p0.lerp(p1, u).lerp(p1.lerp(p2, u), u))
	return pts


static func cbezier(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, steps := 16) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in steps + 1:
		var u := float(i) / steps
		var a := p0.lerp(p1, u)
		var b := p1.lerp(p2, u)
		var c := p2.lerp(p3, u)
		pts.append(a.lerp(b, u).lerp(b.lerp(c, u), u))
	return pts


static func stroke_qbezier(ci: CanvasItem, p0: Vector2, p1: Vector2, p2: Vector2, width: float, color: Color, round_cap := false) -> void:
	var pts := qbezier(p0, p1, p2)
	ci.draw_polyline(pts, color, width, true)
	if round_cap:
		ci.draw_circle(pts[0], width / 2.0, color)
		ci.draw_circle(pts[pts.size() - 1], width / 2.0, color)


static func scoop(ci: CanvasItem, pos: Vector2, color_index: int, r := 16.0) -> void:
	var c1: Color = SCOOP_COLORS[color_index][0]
	var c2: Color = SCOOP_COLORS[color_index][1]
	ci.draw_circle(pos + Vector2(0, 2), r, c2)
	ci.draw_circle(pos, r, c1)
	for k in [-1, 0, 1]:
		ci.draw_circle(pos + Vector2(k * r * 0.55, r * 0.75), r * 0.32, c1)
	ci.draw_circle(pos + Vector2(-r * 0.35, -r * 0.35), r * 0.28, Color(1, 1, 1, 0.5))


static func cone(ci: CanvasItem, pos: Vector2, s := 1.0) -> void:
	ci.draw_colored_polygon(PackedVector2Array([
		pos + Vector2(-15 * s, 0), pos + Vector2(15 * s, 0), pos + Vector2(0, 34 * s),
	]), Color("e8a45c"))
	var hatch := Color(0.549, 0.314, 0.078, 0.45)
	ci.draw_line(pos + Vector2(-10 * s, 10 * s), pos + Vector2(6 * s, 10 * s), hatch, 1.5, true)
	ci.draw_line(pos + Vector2(-6 * s, 20 * s), pos + Vector2(4 * s, 20 * s), hatch, 1.5, true)


static func heart(ci: CanvasItem, pos: Vector2, s: float, filled: bool) -> void:
	var pts := PackedVector2Array()
	pts.append(Vector2(0, 3))
	pts.append_array(cbezier(Vector2(0, 3), Vector2(-10, -6), Vector2(-4, -14), Vector2(0, -8), 12).slice(1))
	pts.append_array(cbezier(Vector2(0, -8), Vector2(4, -14), Vector2(10, -6), Vector2(0, 3), 12).slice(1))
	var world := PackedVector2Array()
	for p in pts:
		world.append(pos + p * s)
	if filled:
		ci.draw_colored_polygon(world, HEART_RED)
	else:
		world.append(world[0])
		ci.draw_polyline(world, Color(0.706, 0.353, 0.392, 0.5), 2.0 * s, true)
