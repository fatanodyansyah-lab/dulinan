extends Node2D
## Kucing Es Krim — orchestrator: state machine, spawning, collisions,
## score/lives, input, screen shake, music. All tuning matches the HTML5
## design prototype (per 60 fps physics tick).

enum State { START, PLAY, OVER }

const W := 480.0
const H := 854.0
const CAT_Y := H - 215.0        # 639
const CATCH_Y := CAT_Y - 10.0   # 629
const SAVE_PATH := "user://save.cfg"

const FallingItem := preload("res://games/kucing_es_krim/scripts/falling_item.gd")

var state: State = State.START
var score := 0
var best := 0
var lives := 3
var combo := 0
var elapsed := 0.0
var spawn_timer := 0.0
var shake := 0
var hurt_flash := 0
var hold_dir := 0
var dragging := false
var muted := false

@onready var shaker: Node2D = $Shaker
@onready var cat: Node2D = $Shaker/Cat
@onready var items_node: Node2D = $Shaker/Items
@onready var fx_particles: Node2D = $Shaker/Particles
@onready var fx_popups: Node2D = $Shaker/Popups
@onready var hud: Node2D = $Shaker/HUD
@onready var music: AudioStreamPlayer = $Music


func _ready() -> void:
	best = _load_best()
	music.stream.loop = true
	music.volume_db = linear_to_db(0.6)


func _physics_process(_delta: float) -> void:
	if state == State.PLAY:
		_update_play()
	if shake > 0:
		shake -= 1
		shaker.position = Vector2(randf() - 0.5, randf() - 0.5) * shake
	else:
		shaker.position = Vector2.ZERO
	if hurt_flash > 0:
		hurt_flash -= 1
	hud.queue_redraw()


func _update_play() -> void:
	elapsed += 1.0 / 60.0

	# Cat target movement (hold buttons / keys); easing happens in cat.gd.
	if hold_dir != 0:
		cat.target_x += hold_dir * 7.5
	cat.target_x = clampf(cat.target_x, 50.0, W - 50.0)

	# Spawning.
	spawn_timer -= 1.0
	if spawn_timer <= 0.0:
		_spawn()
		spawn_timer = maxf(28.0, 70.0 - elapsed * 1.4)

	var speed := 2.2 + minf(6.0, elapsed / 18.0)
	var cone_x: float = cat.position.x + 34.0

	for item in items_node.get_children():
		item.position.y += speed
		item.rot += item.vr
		if item.type != FallingItem.Type.SCOOP:
			item.queue_redraw()

		# Catch check against the cone.
		if absf(item.position.y - CATCH_Y) < 26.0 and absf(item.position.x - cone_x) < 40.0:
			if item.type == FallingItem.Type.SCOOP:
				_catch_scoop(item, cone_x)
			else:
				_take_hit(item)
			item.queue_free()
			continue

		# Fell past the bottom.
		if item.position.y > H + 40.0:
			if item.type == FallingItem.Type.SCOOP and combo > 0:
				combo = 0
				fx_popups.add("Duhh!", Vector2(item.position.x, H - 160), Color(0.478, 0.329, 0.29, 0.8), 40)
			item.queue_free()


func _spawn() -> void:
	var item := FallingItem.new()
	var bad_chance := minf(0.3, 0.10 + elapsed / 200.0)
	if randf() < bad_chance:
		item.type = FallingItem.Type.BOMB if randf() < 0.5 else FallingItem.Type.FISH
	item.color_index = randi() % KDraw.SCOOP_COLORS.size()
	item.rot = randf() * TAU
	item.vr = (randf() - 0.5) * 0.06
	item.position = Vector2(40.0 + randf() * (W - 80.0), -30.0)
	items_node.add_child(item)


func _catch_scoop(item: Node2D, cone_x: float) -> void:
	cat.stack.append(item.color_index)
	score += 10
	combo += 1
	cat.mood = 25
	fx_particles.burst(item.position, KDraw.SCOOP_COLORS[item.color_index][0])
	if cat.stack.size() >= 8:
		score += 50
		fx_popups.add("YUMMY! +50", Vector2(cat.position.x, CAT_Y - 220), KDraw.HEART_RED, 60)
		fx_particles.burst(Vector2(cone_x, CATCH_Y - 80), Color("f7d774"))
		cat.stack.clear()


func _take_hit(item: Node2D) -> void:
	lives -= 1
	combo = 0
	cat.stack.clear()
	cat.mood = -40
	shake = 14
	hurt_flash = 12
	fx_particles.burst(item.position, Color("4a4046"))
	fx_popups.add("ADUH!", item.position, KDraw.ACCENT, 50)
	Input.vibrate_handheld(120)
	if lives <= 0:
		_game_over()


func _start_game() -> void:
	for c in items_node.get_children():
		c.queue_free()
	fx_particles.clear()
	fx_popups.clear()
	score = 0
	lives = 3
	combo = 0
	elapsed = 0.0
	spawn_timer = 0.0
	shake = 0
	hurt_flash = 0
	cat.position.x = W / 2.0
	cat.target_x = W / 2.0
	cat.stack.clear()
	cat.mood = 0
	cat.playing = true
	state = State.PLAY
	_try_music()


func _game_over() -> void:
	state = State.OVER
	cat.playing = false
	if score > best:
		best = score
		_save_best()


# ---------- input ----------

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			_pointer_down(event.position)
		else:
			_pointer_up()
	elif event is InputEventScreenDrag:
		if dragging:
			cat.target_x = event.position.x - 34.0
	elif event is InputEventKey and not event.echo:
		_handle_key(event)


func _pointer_down(pos: Vector2) -> void:
	# Mute toggle (always active, matches prototype hit zone).
	if pos.x > W - 66.0 and pos.y > 12.0 and pos.y < 68.0:
		_toggle_mute()
		return
	if state != State.PLAY:
		_start_game()
		return
	# Hold buttons in the bottom corners.
	var by := H - 92.0
	if pos.y > by - 50.0:
		if pos.x < 100.0:
			hold_dir = -1
			return
		if pos.x > W - 100.0:
			hold_dir = 1
			return
	dragging = true
	cat.target_x = pos.x - 34.0


func _pointer_up() -> void:
	dragging = false
	hold_dir = 0


func _handle_key(event: InputEventKey) -> void:
	if event.pressed:
		match event.keycode:
			KEY_A, KEY_LEFT:
				hold_dir = -1
			KEY_D, KEY_RIGHT:
				hold_dir = 1
			KEY_SPACE, KEY_ENTER, KEY_KP_ENTER:
				if state != State.PLAY:
					_start_game()
	else:
		if event.keycode in [KEY_A, KEY_LEFT] and hold_dir == -1:
			hold_dir = 0
		if event.keycode in [KEY_D, KEY_RIGHT] and hold_dir == 1:
			hold_dir = 0


# ---------- audio ----------

func _try_music() -> void:
	if muted:
		return
	if not music.playing:
		music.play()
	music.stream_paused = false


func _toggle_mute() -> void:
	muted = not muted
	if muted:
		music.stream_paused = true
	else:
		_try_music()


# ---------- save ----------

func _load_best() -> int:
	var cf := ConfigFile.new()
	if cf.load(SAVE_PATH) == OK:
		return cf.get_value("game", "best", 0)
	return 0


func _save_best() -> void:
	var cf := ConfigFile.new()
	cf.load(SAVE_PATH)
	cf.set_value("game", "best", best)
	cf.save(SAVE_PATH)
