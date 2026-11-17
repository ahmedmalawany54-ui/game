// ============================================================================
// MSI DRAGON VIRUS SLAYER — V3 EPIC EDITION
// - Controls: [1] Fireball, [2] Dragon Claw, [3] Nova Explosion
// - High-Detail Cyber Virus Enemies
// - Evolving Captain-Claw Style Dragon (Grows larger & gains armor/horns/aura per stage)
// - Dedicated Hardware Stages (Case -> Motherboard -> RAM -> Small GPU -> RTX 5090)
// - Dynamic Procedural Chiptune BGM per Stage that speeds up near Bosses!
// - Start Screen, Game Over Screen, and Congratulations Screen
// - Authentic MSI Dragon Shield Watermark in Background
// ============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const msiLogoImage = new Image();
msiLogoImage.src = 'msi-dragon-logo.png';

const $ = id => document.getElementById(id);

// ============================================================================
// 1. DYNAMIC PROCEDURAL BGM & SFX ENGINE
// ============================================================================
class RetroAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = 0;
    this.stepIdx = 0;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tone(f1, f2, dur = 0.12, type = 'square', vol = 0.07) {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  // Dynamic Stage Music that changes melody per stage and accelerates near Boss
  updateBGM(dt, stageIdx, bossProximityRatio, isPlaying) {
    if (!isPlaying || this.muted) return;
    this.init();

    // Base tempo accelerates up to 1.85x as player approaches the Boss!
    const tempoMultiplier = 1.0 + bossProximityRatio * 0.85;
    const stepInterval = 0.22 / tempoMultiplier;

    this.bgmTimer += dt;
    if (this.bgmTimer >= stepInterval) {
      this.bgmTimer = 0;
      this.playBGMNote(stageIdx, bossProximityRatio);
      this.stepIdx = (this.stepIdx + 1) % 16;
    }
  }

  playBGMNote(stageIdx, bossProximityRatio) {
    // Different musical scales/arpeggios for each stage
    const stageRoots = [110, 130.81, 146.83, 164.81, 98.00, 123.47, 138.59, 155.56];
    const root = stageRoots[stageIdx % stageRoots.length] * (1 + Math.floor(stageIdx / 8) * 0.25);

    const patterns = [
      [1, 1, 1.5, 1, 1.33, 1.5, 1.78, 1.5, 1, 1, 1.2, 1, 1.5, 1.33, 1.2, 0.89],
      [1, 1.2, 1.5, 1.78, 2, 1.78, 1.5, 1.2, 1, 1.33, 1.5, 2, 1.78, 1.5, 1.33, 1.2],
      [1, 1.5, 1.2, 1.5, 1.33, 1.78, 1.5, 2, 1, 1.5, 1.2, 1.5, 1.78, 1.5, 1.33, 1.2],
      [1, 1, 2, 1, 1.78, 1, 1.5, 1, 1.33, 1.33, 1.78, 1.5, 1.2, 1.33, 1.5, 1.78]
    ];

    const pat = patterns[stageIdx % patterns.length];
    const mult = pat[this.stepIdx];
    const freq = root * mult;

    // Volume increases slightly near Boss for epic tension
    const vol = 0.025 + bossProximityRatio * 0.025;
    const wave = bossProximityRatio > 0.6 ? 'sawtooth' : 'triangle';

    this.tone(freq, freq * 0.99, 0.14, wave, vol);

    // Bass pulse every 4 steps
    if (this.stepIdx % 4 === 0) {
      this.tone(root * 0.5, root * 0.48, 0.18, 'square', vol * 1.1);
    }
  }

  fire() { this.tone(680, 180, 0.16, 'sawtooth', 0.1); }
  claw() { this.tone(520, 140, 0.09, 'sawtooth', 0.09); }
  nova() { this.tone(140, 920, 0.36, 'sawtooth', 0.18); }
  jump() { this.tone(240, 560, 0.12, 'square', 0.07); }
  coin() { this.tone(880, 1320, 0.1, 'triangle', 0.09); }
  loot() { this.tone(440, 880, 0.22, 'square', 0.11); }
  hit() { this.tone(160, 55, 0.16, 'sawtooth', 0.11); }
}
const sfx = new RetroAudioEngine();

// ============================================================================
// 2. 20 UNIQUE DEDICATED HARDWARE STAGES & CUSTOM BOSSES
// ============================================================================
const MAP_ROUTE_STYLES = ['SWITCHBACK STAIRS', 'TOWER CLIMB', 'SPLIT-LEVEL MAZE', 'SUSPENDED BRIDGES', 'DESCENDING CAVERN'];
const STAGE_BLUEPRINTS = [
  { partId: 'case_mid', partName: 'MSI MAG Forge Case', icon: '🖥️', theme: 'cyber_grid', skyTop: '#0b132b', skyBot: '#1c2541', bossName: 'TROJAN GATEKEEPER', bossStyle: 'skull_bot', bossHp: 320, bossColor: '#ef4444' },
  { partId: 'psu_550', partName: 'MSI 550W Bronze PSU', icon: '⚡', theme: 'neon_forge', skyTop: '#1a0b2e', skyBot: '#3b1443', bossName: 'SURGE WORM OVERLORD', bossStyle: 'worm_mech', bossHp: 400, bossColor: '#f59e0b' },
  { partId: 'mobo_b550', partName: 'MSI B550 Tomahawk Mobo', icon: '🎛️', theme: 'circuit_city', skyTop: '#081c15', skyBot: '#1b4332', bossName: 'CIRCUIT PARASITE', bossStyle: 'spider_core', bossHp: 480, bossColor: '#10b981' },
  { partId: 'cpu_i5', partName: 'Intel Core i5 Processor', icon: '🧠', theme: 'silicon_valley', skyTop: '#03045e', skyBot: '#0077b6', bossName: 'OVERCLOCK DAEMON', bossStyle: 'twin_core', bossHp: 560, bossColor: '#38bdf8' },
  { partId: 'gpu_gt710', partName: 'Small GPU: MSI GT 710', icon: '📟', theme: 'bsod_realm', skyTop: '#002855', skyBot: '#00509d', bossName: 'WINDOWS BLUE SCREEN (BSOD)', bossStyle: 'bsod_titan', bossHp: 700, bossColor: '#0078d7' },
  { partId: 'ram_8gb', partName: '8GB DDR4 Memory Stick', icon: '📏', theme: 'crimson_tower', skyTop: '#2b080c', skyBot: '#590d22', bossName: 'MEMORY LEAK HYDRA', bossStyle: 'hydra_virus', bossHp: 800, bossColor: '#e30613' },
  { partId: 'ssd_256', partName: '256GB M.2 NVMe SSD', icon: '💾', theme: 'data_vault', skyTop: '#10002b', skyBot: '#3c096c', bossName: 'RANSOMWARE ENCRYPTOR', bossStyle: 'lock_cube', bossHp: 920, bossColor: '#a855f7' },
  { partId: 'cooler_air', partName: 'MSI Core Frozr Air Cooler', icon: '❄️', theme: 'arctic_server', skyTop: '#0b2545', skyBot: '#134074', bossName: 'THERMAL THROTTLE GOLEM', bossStyle: 'ice_mech', bossHp: 1050, bossColor: '#67e8f9' },
  { partId: 'gpu_gtx1050', partName: 'Mid GPU: MSI GTX 1050 Ti', icon: '🎮', theme: 'lava_foundry', skyTop: '#240000', skyBot: '#660708', bossName: 'PIXEL SHADER DEMON', bossStyle: 'demon_eye', bossHp: 1200, bossColor: '#f97316' },
  { partId: 'ram_16gb', partName: '16GB DDR5 Dual Channel', icon: '🚀', theme: 'kernel_abyss', skyTop: '#14213d', skyBot: '#fca311', bossName: 'LINUX KERNEL PANIC', bossStyle: 'kernel_beast', bossHp: 1450, bossColor: '#eab308' },
  { partId: 'ssd_1tb', partName: '1TB MSI Spatium Gen4', icon: '📀', theme: 'matrix_core', skyTop: '#001a00', skyBot: '#004d00', bossName: 'ROOTKIT PHANTOM', bossStyle: 'phantom_orb', bossHp: 1650, bossColor: '#22c55e' },
  { partId: 'psu_850', partName: 'MSI 850W Gold Modular', icon: '🔋', theme: 'volt_reactor', skyTop: '#1f1135', skyBot: '#4c1d95', bossName: 'VOLTAGE SPIKE TITAN', bossStyle: 'tesla_boss', bossHp: 1850, bossColor: '#c084fc' },
  { partId: 'gpu_gtx1080', partName: 'High GPU: MSI GTX 1080 Ti', icon: '🔥', theme: 'dragon_forge', skyTop: '#370617', skyBot: '#9d0208', bossName: 'CRYPTO MINER COLOSSUS', bossStyle: 'miner_rig', bossHp: 2100, bossColor: '#fb7185' },
  { partId: 'cooler_aio', partName: 'MSI MAG CoreLiquid 360R', icon: '🌊', theme: 'liquid_chamber', skyTop: '#001219', skyBot: '#005f73', bossName: 'COOLANT CORRUPTOR', bossStyle: 'aqua_virus', bossHp: 2350, bossColor: '#06b6d4' },
  { partId: 'cpu_i9', partName: 'Intel Core i9-14900KS', icon: '👑', theme: 'apple_fortress', skyTop: '#1f2937', skyBot: '#4b5563', bossName: 'MACOS KERNEL FAULT', bossStyle: 'apple_core', bossHp: 2700, bossColor: '#9ca3af' },
  { partId: 'mobo_z790', partName: 'MSI MPG Z790 Carbon WIFI', icon: '🛡️', theme: 'obsidian_citadel', skyTop: '#090d16', skyBot: '#1e293b', bossName: 'BIOS HIJACKER', bossStyle: 'cyber_knight', bossHp: 3000, bossColor: '#f43f5e' },
  { partId: 'gpu_rtx4070', partName: 'Super GPU: MSI RTX 4070', icon: '⚡', theme: 'raytrace_nexus', skyTop: '#170b3b', skyBot: '#431259', bossName: 'RAYTRACING ANOMALY', bossStyle: 'prism_lord', bossHp: 3350, bossColor: '#d946ef' },
  { partId: 'ram_64gb', partName: '64GB Extreme DDR5 RGB', icon: '🌈', theme: 'rgb_dimension', skyTop: '#0f172a', skyBot: '#312e81', bossName: 'OVERFLOW LEVIATHAN', bossStyle: 'leviathan', bossHp: 3750, bossColor: '#818cf8' },
  { partId: 'case_titan', partName: 'MSI MEG Prospect 700R', icon: '🏰', theme: 'crimson_sanctum', skyTop: '#2b0505', skyBot: '#7f1d1d', bossName: 'ZERO-DAY ARCHITECT', bossStyle: 'architect', bossHp: 4200, bossColor: '#ef4444' },
  { partId: 'gpu_rtx5090', partName: 'FLAGSHIP: MSI RTX 5090 SUPRIM', icon: '🐉', theme: 'omega_throne', skyTop: '#1a0005', skyBot: '#800013', bossName: 'OMEGA OS VIRUS EMPEROR', bossStyle: 'omega_emperor', bossHp: 5200, bossColor: '#ffbe3b' }
];

// Every Boss has a distinct combat identity, mythic silhouette and a component stolen from the MSI build.
const BOSS_INTEL = [
  { abilityId: 'web', ability: 'Silk Firewall', weakness: 'Fireball chains', stolen: 'MSI MAG Forge Case', myth: 'Anansi • Akan', glyph: '🕷️', lore: 'A gatekeeper woven from corrupted access logs. Its firewall traps movement in a red data web.' },
  { abilityId: 'burrow', ability: 'Volcanic Burrow', weakness: 'Aerial claw strikes', stolen: 'MSI 550W Bronze PSU', myth: 'Lindworm • Norse', glyph: '🐍', lore: 'A power-eating worm from the neon forge, vanishing below the arena before erupting under its prey.' },
  { abilityId: 'orbit', ability: 'Parasite Orbit', weakness: 'Nova at close range', stolen: 'MSI B550 Tomahawk Mobo', myth: 'Arachne • Greek', glyph: '🕸️', lore: 'A circuit spider that rotates infected nodes around its core and turns safe ground into a live motherboard.' },
  { abilityId: 'overclock', ability: 'Overclock Time-Split', weakness: 'Lightning during cooldown', stolen: 'Intel Core i5 Processor', myth: 'Ammit • Egyptian', glyph: '🐊', lore: 'A twin-core daemon that accelerates one half of the arena while freezing the other.' },
  { abilityId: 'bsod', ability: 'Blue-Screen Lockout', weakness: 'Claw from behind', stolen: 'MSI GT 710 GPU', myth: 'Golem • Jewish folklore', glyph: '☹', lore: 'A living crash screen that deletes safe lanes and flashes a fatal error across the battlefield.' },
  { abilityId: 'hydra', ability: 'Memory-Leak Heads', weakness: 'Hit the glowing head', stolen: '8GB DDR4 Memory Stick', myth: 'Lernaean Hydra • Greek', glyph: '🐲', lore: 'Every damaged head forks into a new process. Patience is stronger than panic.' },
  { abilityId: 'encrypt', ability: 'Ransom Lock', weakness: 'Three-hit rhythm', stolen: '256GB M.2 NVMe SSD', myth: 'Níðhöggr • Norse', glyph: '🔒', lore: 'A vault-born serpent that encrypts the floor and demands a key hidden in its attack rhythm.' },
  { abilityId: 'blizzard', ability: 'Cryo Vortex', weakness: 'Fireball in the eye', stolen: 'MSI Core Frozr Air Cooler', myth: 'Yuki-onna • Japanese', glyph: '❄️', lore: 'A frost golem whose orbiting snow code slows every escape route.' },
  { abilityId: 'mirror', ability: 'Shader Mirror', weakness: 'Nova breaks clones', stolen: 'MSI GTX 1050 Ti', myth: 'Tezcatlipoca • Aztec', glyph: '🪞', lore: 'A demon eye that mirrors attacks into false pixels and punishes predictable aim.' },
  { abilityId: 'panic', ability: 'Kernel Panic Pulse', weakness: 'Stay on upper floor', stolen: '16GB DDR5 Dual Channel', myth: 'Fenrir • Norse', glyph: '🐺', lore: 'A kernel beast that broadcasts a golden panic pulse through every connected platform.' },
  { abilityId: 'rootkit', ability: 'Invisible Rootkit', weakness: 'Watch the shadow', stolen: '1TB MSI Spatium Gen4', myth: 'Baba Yaga • Slavic', glyph: '👁️', lore: 'A phantom process that disappears from the render layer, leaving only a hostile shadow trail.' },
  { abilityId: 'tesla', ability: 'Tesla Cage', weakness: 'Grounded lower floor', stolen: 'MSI 850W Gold Modular', myth: 'Raijin • Japanese', glyph: '⚡', lore: 'A voltage titan that links lightning pillars into a cage around the dragon.' },
  { abilityId: 'mine', ability: 'Cryptomine Swarm', weakness: 'Destroy the nodes', stolen: 'MSI GTX 1080 Ti', myth: 'Quetzalcoatl • Aztec', glyph: '⛏️', lore: 'A mining colossus that seeds the arena with greedy autonomous coin nodes.' },
  { abilityId: 'tidal', ability: 'Coolant Undertow', weakness: 'Jump the wave', stolen: 'MSI MAG CoreLiquid 360R', myth: 'Njord • Norse', glyph: '🌊', lore: 'Aqua code rises in a tidal sweep, forcing the player to read the three-floor route.' },
  { abilityId: 'apple', ability: 'Forbidden Kernel', weakness: 'Lightning overload', stolen: 'Intel Core i9-14900KS', myth: 'Eris • Greek', glyph: '🍎', lore: 'A silver kernel fault that drops tempting false power-ups before striking.' },
  { abilityId: 'bios', ability: 'BIOS Possession', weakness: 'Break the shield', stolen: 'MSI MPG Z790 Carbon WIFI', myth: 'Morrígan • Celtic', glyph: '🛡️', lore: 'A cyber knight that hijacks the arena rules and seals one route at a time.' },
  { abilityId: 'prism', ability: 'Prism Refraction', weakness: 'Dark-side attacks', stolen: 'MSI RTX 4070', myth: 'Iris • Greek', glyph: '🌈', lore: 'A raytrace lord that bends projectiles through impossible angles.' },
  { abilityId: 'overflow', ability: 'RGB Overflow', weakness: 'Match the pulse', stolen: '64GB Extreme DDR5 RGB', myth: 'Leviathan • Hebrew', glyph: '🐋', lore: 'A dimension leviathan whose RGB pulse changes the safe floor every few seconds.' },
  { abilityId: 'architect', ability: 'Zero-Day Rewrite', weakness: 'Attack the exposed core', stolen: 'MSI MEG Prospect 700R', myth: 'Ptah • Egyptian', glyph: '🏛️', lore: 'A mythic architect that rebuilds platforms while rewriting the arena collision grid.' },
  { abilityId: 'omega', ability: 'Omega Singularity', weakness: 'All three abilities in sequence', stolen: 'MSI RTX 5090 SUPRIM', myth: 'Apophis • Egyptian', glyph: '🐉', lore: 'The final emperor: an original MSI dragon-virus myth that compresses every previous threat into one singularity.' }
];

// ============================================================================
// 3. STATE & PERSISTENCE
// ============================================================================
const SAVE_KEY = 'msi_dragon_virus_slayer_v3';

const state = {
  started: false,
  stageIdx: 0, // 0 to 19
  gold: 300,
  cabinetUnlocked: {},
  hp: 100,
  maxHp: 100,
  shield: 20,
  maxShield: 20,
  fireAmmo: 25,
  ultimateAmmo: 3,
  clawLevel: 1,
  fireLevel: 1,
  primaryAbility: 'fire',
  lightningUnlocked: false,
  primaryPowerLevel: 1,
  dragonEvoLevel: 1, // Increases with stages & upgrades!
  stagePartCollected: false,
  bossDefeated: false,
  bossIntelShown: false
};

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadGame() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw) return false;
    Object.assign(state, raw);
    state.cabinetUnlocked = raw.cabinetUnlocked || {};
    return true;
  } catch (e) {
    return false;
  }
}

function getClawDamage() {
  return 35 + (state.clawLevel - 1) * 22 + (state.stageIdx * 6);
}

function getFireDamage() {
  return 45 + (state.fireLevel - 1) * 28 + (state.stageIdx * 8);
}
function getPrimaryDamage() {
  const base = 45 + (state.primaryPowerLevel - 1) * 28 + state.stageIdx * 8;
  return state.primaryAbility === 'lightning' ? Math.round(base * 1.25) : base;
}
function primaryAbilityName() { return state.primaryAbility === 'lightning' ? 'LIGHTNING' : 'FIRE'; }

function getEffectiveDragonEvolution() {
  // Automatically evolves every 4 stages + shop upgrades!
  return Math.min(6, 1 + Math.floor(state.stageIdx / 4) + (state.dragonEvoLevel - 1));
}

// ============================================================================
// 4. PROCEDURAL UNIQUE STAGE GENERATOR (NO TWO LEVELS LOOK OR PLAY THE SAME)
// ============================================================================
let platforms = [];
let ladders = [];
let elevators = [];
let spikes = [];
let waterPools = [];
let hiddenRooms = [];
let chests = [];
let pickups = [];
let enemies = [];
let projectiles = [];
let particles = [];
let floatingTexts = [];
let boss = null;
let stageWorldWidth = 5000;

const player = {
  x: 140,
  y: 420,
  vx: 0,
  vy: 0,
  w: 48,
  h: 56,
  facing: 1,
  onGround: false,
  onLadder: false,
  jumpsLeft: 2,
  slashTimer: 0,
  slashCooldown: 0,
  invulnTimer: 0,
  animFrame: 0,
  checkpointX: 140,
  checkpointY: 420
};

let cameraX = 0;
let worldTime = 0;

// Deterministic seeded pseudo-random generator per stage so every level has unique layout
function seededRandom(seed) {
  let s = (seed + 1) * 9301 + 49297;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildStageWorld() {
  const bp = STAGE_BLUEPRINTS[state.stageIdx];
  const rand = seededRandom(state.stageIdx * 137);
  const difficulty = state.stageIdx + 1;
  stageWorldWidth = 4800 + state.stageIdx * 200;

  // Scale player hitbox slightly as dragon grows
  const evo = getEffectiveDragonEvolution();
  player.w = 46 + evo * 3;
  player.h = 54 + evo * 4;

  platforms = [];
  ladders = [];
  elevators = [];
  spikes = [];
  waterPools = [];
  hiddenRooms = [];
  chests = [];
  pickups = [];
  enemies = [];
  projectiles = [];
  particles = [];
  floatingTexts = [];

  player.x = 140;
  player.y = 400;
  player.vx = 0;
  player.vy = 0;
  player.checkpointX = 140;
  player.checkpointY = 400;

  // Every level is a deliberate three-floor route: lower maintenance deck, mid circuit deck, upper boss approach.
  // Ladders and moving elevator shafts make the vertical challenge readable and traversable.
  const floorSpan = stageWorldWidth - 1160;
  const floorBands = [610, 455, 300];
  floorBands.forEach((floorY, floorIndex) => {
    const floorStart = 220 + floorIndex * 150;
    platforms.push({ x: floorStart, y: floorY, w: floorSpan - floorIndex * 180, h: 16, type: floorIndex === 1 ? 'bridge' : 'stone', floor: floorIndex + 1 });
  });
  for (let floorIndex = 0; floorIndex < 2; floorIndex++) {
    const liftX = 980 + state.stageIdx * 47 + floorIndex * 235;
    ladders.push({ x: liftX, y: floorBands[floorIndex + 1], w: 30, h: floorBands[floorIndex] - floorBands[floorIndex + 1], floorLink: true });
    elevators.push({ x: liftX + 48, y: floorBands[floorIndex + 1] - 14, w: 74, h: 14, fromY: floorBands[floorIndex + 1], toY: floorBands[floorIndex], phase: floorIndex * 1.7 });
  }

  // Unique Terrain Layout per Level
  let cursorX = 0;
  let stepCount = 0;
  while (cursorX < stageWorldWidth - 950) {
    const segW = Math.floor(380 + rand() * 340);
    // Vary ground elevation per stage for distinct platforming feel!
    const groundOffset = (state.stageIdx % 3 === 1 && stepCount % 2 === 1) ? -35 : 0;
    const floorY = 610 + groundOffset;

    platforms.push({ x: cursorX, y: floorY, w: segW, h: 180, type: 'stone' });

    const gapW = Math.floor(150 + rand() * 110);
    if (rand() > 0.45) {
      platforms.push({ x: cursorX + segW, y: floorY + 6, w: gapW, h: 16, type: 'bridge' });
    } else {
      // Deep, stage-tinted water/void pits replace the old safe lower floor.
      waterPools.push({ x: cursorX + segW, y: 638, w: gapW, h: 82, variant: state.stageIdx % 5 });
      if (rand() < 0.50 + Math.min(0.22, state.stageIdx * 0.012)) {
        spikes.push({ x: cursorX + segW + 25, y: 592, w: Math.max(36, gapW - 50), h: 18 });
      }
    }

    // Elevated Multi-Tier Platforms unique to this stage
    if (cursorX > 300 && rand() > 0.25) {
      const p1Y = 460 - Math.floor(rand() * 55);
      const p1W = Math.floor(180 + rand() * 120);
      platforms.push({ x: cursorX + 40, y: p1Y, w: p1W, h: 20, type: 'bridge' });

      if (rand() > 0.4) {
        ladders.push({ x: cursorX + 60, y: p1Y, w: 32, h: floorY - p1Y });
      }

      if (rand() > 0.45) {
        const p2Y = p1Y - Math.floor(130 + rand() * 35);
        platforms.push({ x: cursorX + 120, y: p2Y, w: 170, h: 20, type: 'stone' });
      }
    }

    cursorX += segW + gapW;
    stepCount++;
  }

  // Each level gets a distinct traversal motif, with seeded offsets and heights.
  const bossArenaX = stageWorldWidth - 940;
  const routeStyle = state.stageIdx % MAP_ROUTE_STYLES.length;
  const anchors = [700, Math.floor(bossArenaX * 0.48), Math.floor(bossArenaX * 0.72)];
  anchors.forEach((anchor, section) => {
    const x = anchor + Math.floor(rand() * 90);
    const drift = Math.floor(rand() * 34);
    if (routeStyle === 0) {
      for (let i = 0; i < 6; i++) {
        const y = 545 - Math.round(Math.sin((i / 5) * Math.PI) * (120 + drift));
        platforms.push({ x: x + i * 92, y, w: 132, h: 18, type: i % 2 ? 'bridge' : 'stone' });
        if (i % 2 === 0) ladders.push({ x: x + i * 92 + 18, y, w: 28, h: 610 - y });
      }
    } else if (routeStyle === 1) {
      for (let i = 0; i < 5; i++) {
        const side = i % 2;
        const y = 525 - i * (54 + Math.floor(drift / 5));
        const px = x + side * 150 + Math.floor(rand() * 26);
        platforms.push({ x: px, y, w: 158, h: 18, type: 'bridge' });
        ladders.push({ x: px + (side ? 118 : 14), y, w: 26, h: 72 + Math.floor(drift / 2) });
      }
    } else if (routeStyle === 2) {
      for (let i = 0; i < 4; i++) {
        const y = 510 - i * 72;
        platforms.push({ x: x + (i % 2) * 155, y, w: 205, h: 18, type: i % 2 ? 'stone' : 'bridge' });
        ladders.push({ x: x + 18 + i * 35, y, w: 24, h: 82 });
      }
    } else if (routeStyle === 3) {
      for (let i = 0; i < 5; i++) {
        const y = 390 + ((i + section) % 3) * 64 + Math.floor(rand() * 24);
        const px = x + i * 112;
        platforms.push({ x: px, y, w: 170, h: 18, type: i % 2 ? 'bridge' : 'stone' });
        if (i < 4) ladders.push({ x: px + 30, y: Math.min(y, 610 - 90), w: 26, h: Math.max(80, 610 - y) });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const y = 365 + Math.round(Math.sin((i / 5) * Math.PI) * (165 + drift));
        platforms.push({ x: x + i * 100, y, w: 138, h: 18, type: i % 2 ? 'stone' : 'bridge' });
        if (i % 2 === 1) ladders.push({ x: x + i * 100 + 12, y, w: 25, h: Math.max(70, 610 - y) });
      }
    }
  });
  // A climbable clue leads to a secret room; its platforms and treasure reveal on entry.
  const secretX = Math.floor(bossArenaX * (0.54 + rand() * 0.08));
  platforms.push({ x: secretX - 90, y: 610, w: 430, h: 150, type: 'stone' });
  waterPools = waterPools.filter(pool => pool.x + pool.w < secretX - 100 || pool.x > secretX + 350);
  spikes = spikes.filter(sp => sp.x + sp.w < secretX - 100 || sp.x > secretX + 350);
  hiddenRooms.push({ x: secretX + 42, y: 285, w: 310, h: 150, discovered: false });
  ladders.push({ x: secretX + 24, y: 350, w: 34, h: 260 });
  platforms.push({ x: secretX + 40, y: 420, w: 320, h: 18, type: 'bridge', secret: true });
  platforms.push({ x: secretX + 188, y: 345, w: 158, h: 18, type: 'stone', secret: true });
  chests.push({ x: secretX + 128, y: 382, opened: false, secret: true, roomId: 0 });
  // Boss Arena at the end of the level
  platforms.push({ x: bossArenaX, y: 610, w: 940, h: 150, type: 'stone' });
  // Arena side ledges for tactical jumping
  platforms.push({ x: bossArenaX + 120, y: 460, w: 160, h: 18, type: 'bridge' });
  platforms.push({ x: bossArenaX + 640, y: 460, w: 160, h: 18, type: 'bridge' });

  // Treasure Chests
  for (let i = 0; i < 4; i++) {
    const cx = 620 + i * Math.floor((bossArenaX - 800) / 4);
    const cy = (i % 2 === 0) ? 560 : 410;
    chests.push({ x: cx, y: cy, opened: false });
  }

  // Dedicated PC Hardware Component Pickup for THIS stage (placed right before Boss Arena)
  if (!state.stagePartCollected) {
    pickups.push({
      x: bossArenaX - 240,
      y: 540,
      type: 'hardware_part',
      partId: bp.partId,
      label: bp.partName,
      icon: bp.icon,
      bob: 0
    });
  }

  // Gold, Fireball & Shield Pickups
  for (let x = 280; x < bossArenaX - 280; x += 210) {
    const r = rand();
    const py = (r > 0.5) ? 550 : 390;
    if (r < 0.45) pickups.push({ x, y: py, type: 'gold', label: '+150 GOLD', bob: r * 5 });
    else if (r < 0.8) pickups.push({ x, y: py, type: 'fire', label: '+10 FIREBALLS', bob: r * 5 });
    else pickups.push({ x, y: py, type: 'heal', label: '+35 HP', bob: r * 5 });
  }

  // High-Detail Cyber Virus Enemies
  const virusKinds = ['trojan_spider', 'ransom_cube', 'worm_serpent', 'cyber_drone'];
  const spacing = Math.max(180, 340 - state.stageIdx * 9);
  for (let x = 520; x < bossArenaX - 220; x += spacing) {
    const kind = virusKinds[Math.floor(rand() * virusKinds.length)];
    const ey = kind === 'cyber_drone' ? 350 : 550;
    // Enemy health rises by exactly 15% per level (compounded), making every level a clear challenge tier.
    const hp = Math.round((70 + state.stageIdx * 26) * Math.pow(1.15, state.stageIdx));
    enemies.push({
      x,
      y: ey,
      w: 48,
      h: 50,
      hp,
      maxHp: hp,
      kind,
      patrolMin: x - 140,
      patrolMax: x + 140,
      facing: -1,
      attackCd: 1.1 + rand()
    });
  }

  // Unique Stage Boss
  if (!state.bossDefeated) {
    const intel = BOSS_INTEL[state.stageIdx];
    boss = {
      x: bossArenaX + 600,
      y: 470,
      w: 132,
      h: 136,
      hp: Math.round(bp.bossHp * (1 + state.stageIdx * 0.12)),
      maxHp: Math.round(bp.bossHp * (1 + state.stageIdx * 0.12)),
      facing: -1,
      stateTimer: 1.6,
      attackPattern: 0,
      name: bp.bossName,
      style: bp.bossStyle,
      color: bp.bossColor,
      dmg: Math.round((14 + state.stageIdx * 1.7) * Math.pow(1.08, state.stageIdx)),
      abilityId: intel.abilityId,
      ability: intel.ability,
      weakness: intel.weakness,
      stolen: intel.stolen,
      myth: intel.myth,
      glyph: intel.glyph,
      lore: intel.lore
    };
  } else {
    boss = null;
  }

  updateHUD();
}

// ============================================================================
// 5. INPUT CONTROLS ([1] FIRE, [2] CLAW, [3] NOVA EXPLOSION)
// ============================================================================
const keys = {};

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === 'escape') {
    $('shopModal').classList.add('hidden');
    $('cabinetModal').classList.add('hidden');
  }

  if (!state.started) return;
  if (!$('gameOverScreen').classList.contains('hidden')) return;
  if (!$('congratsScreen').classList.contains('hidden')) return;

  if (k === 'w' || k === ' ' || k === 'enter' || k === 'arrowup') {
    e.preventDefault();
    jumpPlayer();
  }

  // Requested Keybindings: 1 = Fireball, 2 = Claw, 3 = Explosion Nova
  if (k === '1') shootPrimaryAbility();
  if (k === '2') triggerClawSlash();
  if (k === '3') castUltimateNova();

  if (k === 'e') interactWorld();
  if (k === 'i') toggleCabinetModal();
  if (k === 'm') toggleShopModal();
});

window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function jumpPlayer() {
  // Space/Enter/W can attach to a nearby ladder instead of forcing a jump.
  const ladder = ladders.find(l => Math.abs((player.x + player.w / 2) - (l.x + l.w / 2)) < 54 && player.y + player.h >= l.y - 28 && player.y <= l.y + l.h + 20);
  if (ladder) {
    player.onLadder = true;
    player.vy = 0;
    player.x += ((ladder.x + ladder.w / 2) - (player.x + player.w / 2)) * 0.65;
    player.y = Math.max(ladder.y - player.h + 4, Math.min(ladder.y + ladder.h - 8, player.y - 18));
    return;
  }
  if (player.onGround || player.onLadder) {
    player.vy = -630;
    player.onGround = false;
    player.onLadder = false;
    player.jumpsLeft = 1;
    sfx.jump();
  } else if (player.jumpsLeft > 0) {
    player.vy = -570;
    player.jumpsLeft--;
    sfx.jump();
  }
}

// [1] Equipped primary ability (Fire or unlockable Lightning).
function shootPrimaryAbility() {
  if (state.fireAmmo <= 0) {
    showToast(`NO ${primaryAbilityName()} CHARGES LEFT! BUY IN SHOP [M]`);
    return;
  }
  state.fireAmmo--;
  sfx.fire();
  const evo = getEffectiveDragonEvolution();
  const isLightning = state.primaryAbility === 'lightning';
  projectiles.push({
    x: player.facing === 1 ? player.x + player.w + 4 : player.x - 16,
    y: player.y + player.h * 0.35,
    vx: player.facing * (isLightning ? 1050 : 760),
    vy: isLightning ? Math.sin(worldTime * 18) * 45 : 0,
    fromPlayer: true,
    dmg: getPrimaryDamage(),
    size: isLightning ? 21 : 14 + evo * 2,
    color: isLightning ? '#38e8ff' : (evo >= 4 ? '#38e8ff' : '#ffbe3b'),
    ability: state.primaryAbility,
    life: 1.3
  });
  updateHUD();
}

// [2] Dragon Claw Slash
function triggerClawSlash() {
  if (player.slashCooldown > 0) return;
  player.slashTimer = 0.22;
  player.slashCooldown = 0.28;
  sfx.claw();

  const reach = 64 + getEffectiveDragonEvolution() * 6;
  const reachX = player.facing === 1 ? player.x + player.w : player.x - reach;
  const hitBox = { x: reachX, y: player.y, w: reach, h: player.h };
  const dmg = getClawDamage();

  enemies.forEach(en => {
    if (rectsOverlap(hitBox, en)) damageEnemy(en, dmg);
  });
  if (boss && rectsOverlap(hitBox, boss)) damageBoss(dmg);
}

// [3] Dragon Nova Explosion
function castUltimateNova() {
  if (state.ultimateAmmo <= 0) {
    showToast('NO EXPLOSION CHARGES! BUY IN SHOP [M]');
    return;
  }
  state.ultimateAmmo--;
  sfx.nova();
  const novaDmg = Math.round(getPrimaryDamage() * 4.5);
  spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#e30613', 55);
  spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ffbe3b', 45);

  enemies.forEach(en => {
    if (Math.abs(en.x - player.x) < 750) damageEnemy(en, novaDmg);
  });
  if (boss && Math.abs(boss.x - player.x) < 850) damageBoss(novaDmg);

  showToast(`DRAGON NOVA EXPLOSION! (${novaDmg} DMG)`);
  updateHUD();
}

function interactWorld() {
  chests.forEach(ch => {
    if (ch.secret && !hiddenRooms[ch.roomId]?.discovered) return;
    if (!ch.opened && Math.hypot(player.x - ch.x, player.y - ch.y) < 75) {
      ch.opened = true;
      sfx.loot();
      const bonusGold = 400 + state.stageIdx * 120;
      state.gold += bonusGold;
      state.fireAmmo += 12;
      showToast(`CHEST OPENED! +${bonusGold} GOLD & +12 FIREBALLS`);
      saveGame();
      updateHUD();
    }
  });
}

// ============================================================================
// 6. PHYSICS, VICTORY & GAME OVER LOGIC
// ============================================================================
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addFloatingText(x, y, text, color = '#ffbe3b') {
  floatingTexts.push({ x, y, text, color, life: 1.15 });
}

function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 340,
      vy: -Math.random() * 260 - 30,
      color,
      size: 4 + Math.random() * 5,
      life: 0.45 + Math.random() * 0.35
    });
  }
}

function damageEnemy(en, dmg) {
  en.hp -= dmg;
  sfx.hit();
  spawnParticles(en.x + en.w / 2, en.y + en.h / 2, '#e30613', 12);
  addFloatingText(en.x, en.y - 10, `-${dmg}`, '#ff545e');

  if (en.hp <= 0) {
    const goldDrop = 95 + state.stageIdx * 40;
    state.gold += goldDrop;
    addFloatingText(en.x, en.y - 26, `+${goldDrop} GOLD`, '#38e8ff');
    updateHUD();
  }
}

function damageBoss(dmg) {
  if (!boss) return;
  boss.hp = Math.max(0, boss.hp - dmg);
  sfx.hit();
  spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffbe3b', 18);
  addFloatingText(boss.x + 30, boss.y - 12, `-${dmg}`, '#ffbe3b');

  if (boss.hp <= 0) {
    state.bossDefeated = true;
    const goldReward = 1200 + state.stageIdx * 550;
    state.gold += goldReward;
    spawnParticles(boss.x + 60, boss.y + 60, '#ffd43b', 65);
    boss = null;
    sfx.loot();
    saveGame();
    updateHUD();
    checkStageCompletion();
  }
}

function damagePlayer(dmg) {
  if (player.invulnTimer > 0) return;
  player.invulnTimer = 0.85;
  sfx.hit();
  spawnParticles(player.x + 20, player.y + 28, '#e30613', 14);

  let rem = dmg;
  if (state.shield > 0) {
    const abs = Math.min(state.shield, rem);
    state.shield -= abs;
    rem -= abs;
  }
  state.hp = Math.max(0, state.hp - rem);
  addFloatingText(player.x, player.y - 14, `-${dmg}`, '#ff3b30');
  updateHUD();

  if (state.hp <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver(cause = 'DEFEATED') {
  if (!$('gameOverScreen').classList.contains('hidden')) return;
  $('gameOverStats').textContent = `${cause} — Stage ${state.stageIdx + 1} (${STAGE_BLUEPRINTS[state.stageIdx].partName}). Gold Saved: ${state.gold}`;
  $('gameOverScreen').classList.remove('hidden');
}

function collectPickup(p) {
  sfx.coin();
  spawnParticles(p.x + 12, p.y + 12, '#38e8ff', 14);

  if (p.type === 'hardware_part') {
    state.stagePartCollected = true;
    state.cabinetUnlocked[p.partId] = true;
    addFloatingText(p.x, p.y - 16, `ACQUIRED: ${p.label}!`, '#ffd43b');
    showToast(`PC COMPONENT COLLECTED: ${p.label}!`);
    saveGame();
    updateHUD();
    checkStageCompletion();
  } else if (p.type === 'gold') {
    state.gold += 150;
    addFloatingText(p.x, p.y - 12, '+150 GOLD', '#ffbe3b');
  } else if (p.type === 'fire') {
    state.fireAmmo += 10;
    addFloatingText(p.x, p.y - 12, '+10 FIREBALLS', '#38e8ff');
  } else if (p.type === 'heal') {
    state.hp = Math.min(state.maxHp, state.hp + 35);
    addFloatingText(p.x, p.y - 12, '+35 HP', '#4ade80');
  }
  updateHUD();
}

function checkStageCompletion() {
  if (state.bossDefeated && state.stagePartCollected) {
    const bp = STAGE_BLUEPRINTS[state.stageIdx];
    $('congratsSubtitle').textContent = `STAGE ${state.stageIdx + 1} COMPLETED! COMPONENT ADDED TO CABINET!`;
    $('congratsIcon').textContent = bp.icon;
    $('congratsPartName').textContent = bp.partName;
    $('congratsPartDesc').textContent = `Unlocked and mounted into your MSI PC Build Cabinet! Dragon Evolution Level: ${getEffectiveDragonEvolution()}`;

    if (state.stageIdx === STAGE_BLUEPRINTS.length - 1) {
      $('finalPcShowcase').classList.remove('hidden');
      $('btnNextLevelCongrats').textContent = 'PLAY NEW GAME+ ►';
    } else {
      $('finalPcShowcase').classList.add('hidden');
      $('btnNextLevelCongrats').textContent = `START STAGE ${state.stageIdx + 2} ►`;
    }

    setTimeout(() => {
      $('congratsScreen').classList.remove('hidden');
    }, 650);
  } else if (state.bossDefeated && !state.stagePartCollected) {
    showToast('BOSS DEFEATED! GO BACK SLIGHTLY TO PICK UP THE PC COMPONENT!');
  }
}

function openBossIntel() {
  if (!boss || state.bossIntelShown) return;
  state.bossIntelShown = true;
  $('intelBossGlyph').textContent = boss.glyph;
  $('intelThreatLevel').textContent = `THREAT ${String(state.stageIdx + 1).padStart(2, '0')} • HP ${boss.maxHp}`;
  $('intelStageName').textContent = `STAGE ${String(state.stageIdx + 1).padStart(2, '0')} • ${STAGE_BLUEPRINTS[state.stageIdx].partName}`;
  $('intelBossName').textContent = boss.name;
  $('intelBossLore').textContent = boss.lore;
  $('intelAbility').textContent = boss.ability;
  $('intelWeakness').textContent = boss.weakness;
  $('intelStolenPart').textContent = boss.stolen;
  $('intelMyth').textContent = boss.myth;
  $('bossIntelModal').classList.remove('hidden');
  sfx.tone(180, 60, 0.45, 'sawtooth', 0.12);
}

function closeBossIntel() {
  $('bossIntelModal').classList.add('hidden');
  showToast(`${boss.name} ENGAGED — EXPLOIT: ${boss.weakness}`);
}

function bossProjectile(vx, vy, dmg, color = boss.color, size = 16, life = 2.3) {
  projectiles.push({ x: boss.facing === 1 ? boss.x + boss.w : boss.x - 16, y: boss.y + 56, vx, vy, fromPlayer: false, dmg, size, color, life });
}

function emitBossAbility() {
  const speed = 420 + state.stageIdx * 18;
  const d = boss.dmg;
  switch (boss.abilityId) {
    case 'web': for (const vy of [-70, 0, 70]) bossProjectile(boss.facing * speed, vy, d, '#f43f5e', 22); break;
    case 'burrow': bossProjectile(boss.facing * 180, -520, Math.round(d * 1.5), '#f59e0b', 26); break;
    case 'orbit': for (let i = 0; i < 6; i++) bossProjectile(Math.cos(i) * speed, Math.sin(i) * speed, d, '#10b981', 13); break;
    case 'overclock': bossProjectile(boss.facing * 900, 0, Math.round(d * 1.25), '#38bdf8', 10, 1.5); bossProjectile(boss.facing * 280, 0, d, '#a5f3fc', 26); break;
    case 'bsod': bossProjectile(boss.facing * 520, 0, Math.round(d * 1.4), '#0078d7', 30); break;
    case 'hydra': for (const vy of [-130, -45, 45, 130]) bossProjectile(boss.facing * speed, vy, d, '#e30613', 15); break;
    case 'encrypt': for (let i = 0; i < 3; i++) bossProjectile(boss.facing * (300 + i * 180), 0, d, '#a855f7', 18); break;
    case 'blizzard': for (let i = 0; i < 8; i++) bossProjectile(boss.facing * (260 + i * 35), Math.sin(i) * 150, d, '#67e8f9', 12); break;
    case 'mirror': bossProjectile(boss.facing * speed, -115, d, '#f97316', 16); bossProjectile(boss.facing * speed, 115, d, '#f97316', 16); break;
    case 'panic': bossProjectile(boss.facing * 500, 0, Math.round(d * 1.6), '#eab308', 34); break;
    case 'rootkit': bossProjectile(boss.facing * 650, 35, d, '#22c55e', 11); bossProjectile(boss.facing * 650, -35, d, '#22c55e', 11); break;
    case 'tesla': for (let i = 0; i < 5; i++) bossProjectile(boss.facing * (350 + i * 100), 0, d, '#c084fc', 10); break;
    case 'mine': for (let i = 0; i < 4; i++) bossProjectile(boss.facing * (250 + i * 70), -220 - i * 30, d, '#fb7185', 20); break;
    case 'tidal': bossProjectile(boss.facing * 360, -250, Math.round(d * 1.3), '#06b6d4', 38); break;
    case 'apple': bossProjectile(boss.facing * 300, 0, d, '#9ca3af', 25); bossProjectile(boss.facing * 700, 0, Math.round(d * 1.2), '#f43f5e', 11); break;
    case 'bios': bossProjectile(boss.facing * 440, -180, d, '#f43f5e', 24); bossProjectile(boss.facing * 440, 180, d, '#f43f5e', 24); break;
    case 'prism': bossProjectile(boss.facing * 700, -90, d, '#d946ef', 12); bossProjectile(boss.facing * 700, 90, d, '#d946ef', 12); break;
    case 'overflow': for (let i = 0; i < 5; i++) bossProjectile(boss.facing * (330 + i * 80), Math.sin(worldTime + i) * 210, d, '#818cf8', 16); break;
    case 'architect': bossProjectile(boss.facing * 380, 0, Math.round(d * 1.7), '#ef4444', 36); break;
    case 'omega': bossProjectile(boss.facing * 820, 0, Math.round(d * 2), '#ffbe3b', 28); bossProjectile(boss.facing * 520, -180, d, '#ffbe3b', 18); bossProjectile(boss.facing * 520, 180, d, '#ffbe3b', 18); break;
  }
}

function updateSimulation(dt) {
  worldTime += dt;

  if (player.slashTimer > 0) player.slashTimer -= dt;
  if (player.slashCooldown > 0) player.slashCooldown -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;

  // Captain-Claw style responsive movement & momentum
  let dirX = 0;
  if (keys['a'] || keys['arrowleft']) dirX -= 1;
  if (keys['d'] || keys['arrowright']) dirX += 1;

  if (dirX !== 0) {
    player.vx += dirX * 2200 * dt;
    player.vx = Math.max(-360, Math.min(360, player.vx));
    player.facing = dirX;
    player.animFrame += dt * 16;
  } else {
    player.vx *= Math.pow(0.001, dt);
    if (Math.abs(player.vx) < 8) player.vx = 0;
  }

  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
  const touchingLadder = ladders.find(l => rectsOverlap(playerBox, l));
  const ladderDownIntent = keys['s'] || keys['arrowdown'];
  const ladderUpIntent = keys['w'] || keys['arrowup'] || keys['enter'] || keys[' '];
  const nearbyLadder = touchingLadder || ladders.find(l => Math.abs((player.x + player.w / 2) - (l.x + l.w / 2)) < 58 && player.y + player.h >= l.y - 34 && player.y <= l.y + l.h + 34);
  if (nearbyLadder && (ladderUpIntent || ladderDownIntent)) {
    const ladder = nearbyLadder;
    player.onLadder = true;
    player.vy = 0;
    player.x += ((ladder.x + ladder.w / 2) - (player.x + player.w / 2)) * Math.min(1, dt * 18);
    if (ladderUpIntent) player.y -= 260 * dt;
    if (ladderDownIntent) player.y += 260 * dt;
    player.y = Math.max(ladder.y - player.h + 2, Math.min(ladder.y + ladder.h - 4, player.y));
  } else if (!touchingLadder) {
    player.onLadder = false;
  }

  if (!player.onLadder) player.vy += 1550 * dt;

  player.x = Math.max(20, Math.min(stageWorldWidth - player.w - 20, player.x + player.vx * dt));

  const prevBottom = player.y + player.h;
  player.y += player.vy * dt;
  player.onGround = false;

  hiddenRooms.forEach((room, index) => {
    if (!room.discovered && rectsOverlap(player, room)) {
      room.discovered = true;
      spawnParticles(room.x + room.w / 2, room.y + room.h / 2, '#38e8ff', 28);
      showToast('SECRET ROOM FOUND! TREASURE INSIDE!');
    }
  });
  if (!player.onLadder && player.vy >= 0) {
    platforms.forEach(pl => {
      if (pl.secret && !hiddenRooms[0]?.discovered) return;
      const withinX = player.x + player.w > pl.x + 6 && player.x < pl.x + pl.w - 6;
      if (withinX && prevBottom <= pl.y + 16 && player.y + player.h >= pl.y) {
        player.y = pl.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.jumpsLeft = 2;
      }
    });
  }

  spikes.forEach(sp => {
    if (rectsOverlap(player, sp)) triggerGameOver('SPIKES');
  });

  if (player.y > canvas.height + 36) triggerGameOver('FELL INTO THE ABYSS');
  if (waterPools.some(pool => rectsOverlap(player, pool))) triggerGameOver('FELL INTO THE WATER');
  if (!$('gameOverScreen').classList.contains('hidden')) return;
  pickups = pickups.filter(p => {
    p.bob += dt * 4;
    if (rectsOverlap(player, { x: p.x - 10, y: p.y - 10, w: 42, h: 42 })) {
      collectPickup(p);
      return false;
    }
    return true;
  });

  // Update Cyber Virus Enemies
  enemies = enemies.filter(en => {
    if (en.hp <= 0) return false;
    en.x += en.facing * (125 + state.stageIdx * 9) * dt;
    if (en.x < en.patrolMin) { en.x = en.patrolMin; en.facing = 1; }
    if (en.x > en.patrolMax) { en.x = en.patrolMax; en.facing = -1; }

    en.attackCd -= dt;
    if (Math.hypot(player.x - en.x, player.y - en.y) < 420 && en.attackCd <= 0) {
      en.attackCd = Math.max(1.0, 2.0 - state.stageIdx * 0.04);
      const dir = player.x > en.x ? 1 : -1;
      projectiles.push({
        x: en.x + 24, y: en.y + 24,
        vx: dir * (390 + state.stageIdx * 10), vy: 0,
        fromPlayer: false,
        dmg: Math.round((10 + state.stageIdx * 1.5) * (1 + state.stageIdx * 0.035)),
        size: 12,
        color: '#ff2a36',
        life: 2.0
      });
    }

    if (rectsOverlap(player, en)) damagePlayer(Math.round((14 + state.stageIdx * 1.5) * (1 + state.stageIdx * 0.035)));
    return true;
  });

  // Update Stage Boss with Escalating Abilities
  if (boss && boss.hp > 0) {
    const dist = player.x - boss.x;
    if (!state.bossIntelShown && player.x > stageWorldWidth - 1240) openBossIntel();
    if (Math.abs(dist) < 880) {
      boss.facing = dist > 0 ? 1 : -1;
      boss.x += boss.facing * (135 + state.stageIdx * 8) * dt;
      boss.stateTimer -= dt;

      if (boss.stateTimer <= 0) {
        boss.attackPattern = (boss.attackPattern + 1) % 3;
        boss.stateTimer = Math.max(0.62, 1.8 - state.stageIdx * 0.035) * (boss.hp < boss.maxHp * 0.5 ? 0.68 : 1);

        emitBossAbility();
        if (boss.attackPattern === 2) {
          boss.y -= 28;
          setTimeout(() => { if (boss) boss.y = 470; }, 220);
        }
      }

      if (rectsOverlap(player, boss)) damagePlayer(boss.dmg);
    }
  }

  projectiles = projectiles.filter(pr => {
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;

    if (pr.fromPlayer) {
      for (const en of enemies) {
        if (rectsOverlap({ x: pr.x - pr.size / 2, y: pr.y - pr.size / 2, w: pr.size, h: pr.size }, en)) {
          damageEnemy(en, pr.dmg);
          return false;
        }
      }
      if (boss && rectsOverlap({ x: pr.x - pr.size / 2, y: pr.y - pr.size / 2, w: pr.size, h: pr.size }, boss)) {
        damageBoss(pr.dmg);
        return false;
      }
    } else {
      if (rectsOverlap({ x: pr.x - 8, y: pr.y - 8, w: 16, h: 16 }, player)) {
        damagePlayer(pr.dmg);
        return false;
      }
    }
    return pr.life > 0;
  });

  particles = particles.filter(pt => {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 600 * dt;
    return pt.life > 0;
  });

  floatingTexts = floatingTexts.filter(ft => {
    ft.life -= dt;
    ft.y -= 38 * dt;
    return ft.life > 0;
  });

  const targetCamX = Math.max(0, Math.min(stageWorldWidth - canvas.width, player.x - canvas.width * 0.36));
  cameraX += (targetCamX - cameraX) * Math.min(1, dt * 8);
}

// ============================================================================
// 7. HIGH-GRAPHICS PIXEL RENDERER
// ============================================================================
function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function renderBackground() {
  const bp = STAGE_BLUEPRINTS[state.stageIdx];
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, bp.skyTop);
  grad.addColorStop(1, bp.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Parallax Cyber Grid Lines unique to stage theme
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridOffset = -(cameraX * 0.25) % 80;
  for (let gx = gridOffset; gx < canvas.width; gx += 80) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, canvas.height);
    ctx.stroke();
  }

  // User-supplied MSI dragon shield, preserved as an image and repeated large to fill the backdrop.
  if (msiLogoImage.complete && msiLogoImage.naturalWidth) {
    const logoH = canvas.height;
    const logoW = logoH * msiLogoImage.naturalWidth / msiLogoImage.naturalHeight;
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.drawImage(msiLogoImage, (canvas.width - logoW) / 2, 0, logoW, logoH);
    ctx.restore();
  }
}
// High-Detail Cyber Virus Enemies
function renderCyberVirus(en) {
  const cx = en.x + en.w / 2;
  const cy = en.y + en.h / 2;
  const pulse = Math.sin(worldTime * 9 + en.x) * 3;

  const palettes = {
    trojan_spider: { main: '#ef4444', dark: '#7f1d1d', glow: '#facc15' },
    ransom_cube:   { main: '#a855f7', dark: '#581c87', glow: '#38e8ff' },
    worm_serpent:  { main: '#22c55e', dark: '#14532d', glow: '#bef264' },
    cyber_drone:   { main: '#0ea5e9', dark: '#0c4a6e', glow: '#f43f5e' }
  };
  const pal = palettes[en.kind] || palettes.trojan_spider;

  // Rotating Viral Antigen Spikes / Tendrils
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + worldTime * 2.5;
    const sx = cx + Math.cos(angle) * (24 + pulse);
    const sy = cy + Math.sin(angle) * (24 + pulse);
    drawPixelRect(sx - 4, sy - 4, 8, 8, pal.dark);
    drawPixelRect(sx - 2, sy - 2, 4, 4, pal.glow);
  }

  // Multi-Layered Hexagonal/Stepped Cyber Capsid Shell
  drawPixelRect(en.x + 10, en.y + 2, 28, 46, pal.dark);
  drawPixelRect(en.x + 4, en.y + 8, 40, 34, pal.main);
  drawPixelRect(en.x + 10, en.y + 10, 28, 28, '#090d16');

  // Circuit Lines inside Virus
  drawPixelRect(en.x + 12, en.y + 14, 24, 2, pal.main);
  drawPixelRect(en.x + 12, en.y + 32, 24, 2, pal.main);

  // Menacing Glowing Digital Eyes
  const look = en.facing === 1 ? 5 : -3;
  drawPixelRect(cx - 10 + look, cy - 5, 7, 6, pal.glow);
  drawPixelRect(cx + 4 + look, cy - 5, 7, 6, pal.glow);
  drawPixelRect(cx - 8 + look, cy - 3, 3, 3, '#ffffff');
  drawPixelRect(cx + 6 + look, cy - 3, 3, 3, '#ffffff');

  // Health Bar
  drawPixelRect(en.x, en.y - 12, en.w, 5, '#1e293b');
  drawPixelRect(en.x, en.y - 12, en.w * (en.hp / en.maxHp), 5, '#e30613');
}

// Captain-Claw Style Evolving Realistic Pixel Dragon
function renderEvolvingDragon() {
  if (player.invulnTimer > 0 && Math.floor(worldTime * 22) % 2 === 0) return;

  const evo = getEffectiveDragonEvolution();
  const scaleFactor = 1 + (evo - 1) * 0.11; // Dragon visibly grows bigger per stage!

  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.facing * scaleFactor, scaleFactor);

  // Captain-Claw inspired dynamic pose offsets
  const isRunning = Math.abs(player.vx) > 20 && player.onGround;
  const isJumping = !player.onGround;
  const runCycle = isRunning ? Math.sin(player.animFrame) : 0;
  const wingFlap = isJumping ? Math.sin(worldTime * 22) * 10 : Math.sin(worldTime * 10) * 5;
  const bodyBob = isRunning ? Math.abs(Math.cos(player.animFrame)) * -3 : Math.sin(worldTime * 5) * 1.5;

  // Evolution Aura at Stage 9+
  if (evo >= 3) {
    ctx.fillStyle = evo >= 5 ? 'rgba(56, 232, 255, 0.18)' : 'rgba(255, 190, 59, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 36 + Math.sin(worldTime * 10) * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1. Articulated Sweeping Dragon Tail (Longer with evolution)
  drawPixelRect(-32, 8 + bodyBob, 12, 6, '#800008');
  drawPixelRect(-42, 4 + bodyBob + wingFlap * 0.3, 12, 5, '#e30613');
  drawPixelRect(-50 - evo * 2, -2 + bodyBob + wingFlap * 0.5, 10 + evo * 2, 4, '#ffbe3b');

  // 2. Detailed Multi-Joint Dragon Wings (Larger & Armored in higher stages)
  drawPixelRect(-26, -16 + wingFlap + bodyBob, 20 + evo * 2, 16, '#7f0007');
  drawPixelRect(-32, -24 + wingFlap + bodyBob, 16 + evo * 2, 12, '#e30613');
  drawPixelRect(-36, -28 + wingFlap + bodyBob, 10, 6, '#ffbe3b'); // Wing claw tip

  // 3. Muscular Tapered Torso & Golden Chest Scales
  drawPixelRect(-12, -4 + bodyBob, 24, 24, '#e30613');
  drawPixelRect(-7, 0 + bodyBob, 16, 18, '#fde047'); // Golden belly plates
  if (evo >= 2) {
    // Crimson/Silver Shoulder Armor Plate
    drawPixelRect(-10, -8 + bodyBob, 14, 8, evo >= 4 ? '#38e8ff' : '#94a3b8');
  }

  // 4. S-Curved Dragon Neck & Heroic Head
  drawPixelRect(4, -16 + bodyBob, 14, 15, '#e30613');
  drawPixelRect(6, -26 + bodyBob, 20, 14, '#e30613');
  drawPixelRect(20, -22 + bodyBob, 13, 9, '#b91c1c'); // Upper snout
  drawPixelRect(18, -14 + bodyBob, 12, 4, '#991b1b'); // Jaw

  // Evolving Crown & Horns (Grow longer and turn icy-cyan at max evolution)
  const hornCol = evo >= 5 ? '#38e8ff' : '#ffbe3b';
  drawPixelRect(0, -32 + bodyBob, 10 + evo * 2, 5, hornCol);
  drawPixelRect(-8 - evo * 2, -36 + bodyBob, 10 + evo * 2, 4, '#ffffff');
  if (evo >= 3) {
    // Dorsal Neck Spines
    drawPixelRect(-2, -16 + bodyBob, 5, 5, hornCol);
    drawPixelRect(-4, -8 + bodyBob, 5, 5, hornCol);
  }

  // Fierce Glowing Eye
  drawPixelRect(15, -23 + bodyBob, 6, 5, '#ffffff');
  drawPixelRect(18, -22 + bodyBob, 3, 3, evo >= 5 ? '#0284c7' : '#000000');

  // 5. Captain-Claw Style Striding Legs & Golden Talons
  const leg1X = -8 + runCycle * 7;
  const leg2X = 4 - runCycle * 7;
  drawPixelRect(leg1X, 18, 9, 10, '#800008');
  drawPixelRect(leg1X + 2, 26, 9, 3, '#ffbe3b');

  drawPixelRect(leg2X, 18, 9, 10, '#b91c1c');
  drawPixelRect(leg2X + 2, 26, 9, 3, '#ffbe3b');

  // 6. Melee Claw Slash Arc ([2] Attack)
  if (player.slashTimer > 0) {
    ctx.strokeStyle = evo >= 4 ? '#38e8ff' : '#ffbe3b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(34, 0, 34, -1.15, 1.15);
    ctx.stroke();
  }

  ctx.restore();
}

function renderUniqueBoss(b) {
  const pulse = Math.sin(worldTime * 6) * 3;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dark = '#090d16';
  // Each silhouette is intentionally different: spider, serpent, tank, drone, reactor, knight and dragon forms.
  switch (b.abilityId) {
    case 'web': case 'orbit':
      drawPixelRect(b.x + 22, b.y + 28, b.w - 44, 72, b.color);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + worldTime; drawPixelRect(cx + Math.cos(a) * 58 - 5, cy + Math.sin(a) * 58 - 5, 10, 10, b.color); }
      drawPixelRect(cx - 28, cy - 16, 18, 12, '#fff'); drawPixelRect(cx + 10, cy - 16, 18, 12, '#fff');
      break;
    case 'burrow': case 'hydra': case 'tidal':
      for (let i = 0; i < (b.abilityId === 'hydra' ? 3 : 1); i++) { const hx = cx - 30 + i * 30; drawPixelRect(hx - 22, b.y - 20 - Math.sin(worldTime * 4 + i) * 8, 44, 58, b.color); drawPixelRect(hx - 12, b.y - 2, 8, 8, '#fff'); drawPixelRect(hx + 8, b.y - 2, 8, 8, '#fff'); }
      drawPixelRect(b.x + 22, b.y + 52, b.w - 44, 58, dark);
      break;
    case 'bsod': case 'panic':
      drawPixelRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16, b.color);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText(b.abilityId === 'bsod' ? ':(' : '!_', cx, b.y + 62);
      ctx.font = 'bold 8px "Press Start 2P", monospace'; ctx.fillText(b.abilityId === 'bsod' ? 'STOP_ERR' : 'KERNEL_PANIC', cx, b.y + 90);
      break;
    case 'tesla': case 'prism': case 'overflow':
      drawPixelRect(b.x + 34, b.y + 10, b.w - 68, b.h - 20, b.color);
      for (let i = 0; i < 5; i++) { const ang = worldTime * 2 + i * 1.25; drawPixelRect(cx + Math.cos(ang) * 54 - 7, cy + Math.sin(ang) * 54 - 7, 14, 14, '#fff'); }
      drawPixelRect(cx - 18, cy - 18, 36, 36, dark);
      break;
    case 'encrypt': case 'rootkit': case 'apple':
      drawPixelRect(b.x + 14, b.y + 10, b.w - 28, b.h - 20, b.color);
      drawPixelRect(b.x + 28, b.y + 28, b.w - 56, b.h - 56, dark);
      drawPixelRect(cx - 10, b.y - 14 - pulse, 20, 20, b.color);
      break;
    case 'blizzard': case 'mirror': case 'mine':
      drawPixelRect(b.x + 8, b.y + 26, b.w - 16, 78, dark);
      for (let i = 0; i < 5; i++) drawPixelRect(b.x + 8 + i * 27, b.y + 10 + (i % 2) * 22, 18, 58, b.color);
      drawPixelRect(cx - 12, cy - 12, 24, 24, '#fff');
      break;
    case 'bios': case 'architect':
      drawPixelRect(b.x + 28, b.y + 12, 76, 116, b.color);
      drawPixelRect(b.x + 8, b.y + 34, 25, 70, '#64748b'); drawPixelRect(b.x + 104, b.y + 34, 25, 70, '#64748b');
      drawPixelRect(cx - 24, b.y + 44, 48, 18, dark); drawPixelRect(cx - 7, b.y + 64, 14, 30, '#fff');
      break;
    case 'overclock':
      drawPixelRect(b.x + 18, b.y + 22, 38, 88, b.color); drawPixelRect(b.x + 76, b.y + 22, 38, 88, '#38bdf8');
      drawPixelRect(cx - 10, b.y - 12 - pulse, 20, 18, '#fff'); drawPixelRect(cx - 10, b.y + 116, 20, 18, '#fff');
      break;
    case 'omega':
      drawPixelRect(b.x + 26, b.y + 30, b.w - 52, 80, '#e30613'); drawPixelRect(b.x + 36, b.y + 8, b.w - 72, 35, '#ffbe3b');
      drawPixelRect(cx - 16, b.y + 55, 32, 22, dark); drawPixelRect(b.x - 18, b.y + 48, 25, 18, '#ffbe3b'); drawPixelRect(b.x + b.w - 7, b.y + 48, 25, 18, '#ffbe3b');
      break;
    default:
      drawPixelRect(b.x + 20, b.y + 20, b.w - 40, b.h - 34, b.color); drawPixelRect(cx - 25, cy - 18, 18, 12, '#fff'); drawPixelRect(cx + 7, cy - 18, 18, 12, '#fff');
  }

  // Boss Overhead Health Bar
  drawPixelRect(b.x, b.y - 24, b.w, 8, '#1e293b');
  drawPixelRect(b.x, b.y - 24, b.w * (b.hp / b.maxHp), 8, '#ffbe3b');
}

function renderWorld() {
  ctx.save();
  ctx.translate(-Math.round(cameraX), 0);

  hiddenRooms.forEach(room => {
    if (!room.discovered) return;
    ctx.fillStyle = 'rgba(6, 13, 28, 0.88)';
    ctx.fillRect(room.x, room.y, room.w, room.h);
    ctx.strokeStyle = '#38e8ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(room.x, room.y, room.w, room.h);
  });
  platforms.forEach(pl => {
    if (pl.secret && !hiddenRooms[0]?.discovered) return;
    if (pl.x + pl.w < cameraX - 100 || pl.x > cameraX + canvas.width + 100) return;
    if (pl.type === 'bridge') {
      drawPixelRect(pl.x, pl.y, pl.w, 14, '#78350f');
      drawPixelRect(pl.x, pl.y, pl.w, 3, '#f59e0b');
    } else {
      drawPixelRect(pl.x, pl.y, pl.w, pl.h, '#0f172a');
      drawPixelRect(pl.x, pl.y, pl.w, 8, '#1e293b');
      drawPixelRect(pl.x, pl.y + 8, pl.w, 4, '#e30613');
    }
  });

  ladders.forEach(l => {
    drawPixelRect(l.x, l.y, 4, l.h, '#b45309');
    drawPixelRect(l.x + l.w - 4, l.y, 4, l.h, '#b45309');
    for (let ly = l.y + 10; ly < l.y + l.h; ly += 20) {
      drawPixelRect(l.x, ly, l.w, 3, '#fcd34d');
    }
  });

  elevators.forEach(ev => {
    const travel = Math.sin(worldTime * 0.9 + ev.phase) * 0.5 + 0.5;
    const y = ev.toY + (ev.fromY - ev.toY) * travel;
    drawPixelRect(ev.x, y, ev.w, ev.h, '#c084fc');
    drawPixelRect(ev.x + 5, y + 4, ev.w - 10, 4, '#f5d0fe');
    drawPixelRect(ev.x - 6, y - 9, 4, 18, '#7c3aed');
    drawPixelRect(ev.x + ev.w + 2, y - 9, 4, 18, '#7c3aed');
  });

  waterPools.forEach(pool => {
    if (pool.x + pool.w < cameraX - 80 || pool.x > cameraX + canvas.width + 80) return;
    const shades = [['#075985','#22d3ee'],['#164e63','#67e8f9'],['#1e3a8a','#60a5fa'],['#064e3b','#4ade80'],['#312e81','#a78bfa']][pool.variant];
    drawPixelRect(pool.x, pool.y, pool.w, pool.h, shades[0]);
    drawPixelRect(pool.x, pool.y, pool.w, 5, shades[1]);
    for (let wx = pool.x + 8; wx < pool.x + pool.w - 8; wx += 30) {
      drawPixelRect(wx + Math.sin(worldTime * 3 + wx) * 4, pool.y + 15 + (wx % 3) * 8, 14, 3, 'rgba(255,255,255,0.55)');
    }
  });
  spikes.forEach(sp => {
    for (let sx = sp.x; sx < sp.x + sp.w; sx += 16) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(sx, sp.y + sp.h);
      ctx.lineTo(sx + 8, sp.y);
      ctx.lineTo(sx + 16, sp.y + sp.h);
      ctx.fill();
    }
  });

  chests.forEach(ch => {
    if (ch.secret && !hiddenRooms[ch.roomId]?.discovered) return;
    drawPixelRect(ch.x, ch.y + 10, 38, 22, ch.opened ? '#334155' : '#92400e');
    drawPixelRect(ch.x + 14, ch.y + 12, 10, 10, '#ffbe3b');
  });

  pickups.forEach(p => {
    const py = p.y + Math.sin(p.bob) * 5;
    if (p.type === 'hardware_part') {
      // Glowing Hardware Component Crate
      drawPixelRect(p.x - 4, py - 4, 38, 38, 'rgba(255, 190, 59, 0.3)');
      drawPixelRect(p.x, py, 30, 30, '#ffbe3b');
      drawPixelRect(p.x + 4, py + 4, 22, 22, '#0f172a');
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.icon || '🖥️', p.x + 15, py + 21);
    } else {
      drawPixelRect(p.x + 4, py + 4, 20, 20, p.type === 'gold' ? '#ffbe3b' : p.type === 'heal' ? '#4ade80' : '#38e8ff');
      drawPixelRect(p.x + 8, py + 8, 12, 12, '#090d16');
    }
  });

  enemies.forEach(renderCyberVirus);
  if (boss && boss.hp > 0) renderUniqueBoss(boss);
  renderEvolvingDragon();

  projectiles.forEach(pr => {
    const s = pr.size || 14;
    drawPixelRect(pr.x - s / 2, pr.y - s / 2, s, s * 0.75, pr.color);
    drawPixelRect(pr.x - s / 4, pr.y - s / 4, s / 2, s * 0.38, '#ffffff');
  });

  particles.forEach(pt => {
    drawPixelRect(pt.x, pt.y, pt.size, pt.size, pt.color);
  });

  floatingTexts.forEach(ft => {
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x + 16, ft.y);
  });

  ctx.restore();
}

// ============================================================================
// 8. SHOP & PC HARDWARE CABINET MODALS
// ============================================================================
let activeShopTab = 'skills';

function renderShopModal() {
  $('shopGold').textContent = state.gold.toLocaleString();
  const box = $('shopContent');
  box.innerHTML = '';

  if (activeShopTab === 'skills') {
    const items = [
      {
        title: '[1] FIREBALL AMMO PACK (+25)',
        desc: 'Refill 25 dragon fireballs for key [1].',
        cost: 150,
        buy: () => { state.gold -= 150; state.fireAmmo += 25; }
      },
      {
        title: `[1] EQUIP FIRE ${state.primaryAbility === 'fire' ? '✓' : ''}`,
        desc: 'Select Fireball for ability slot [1].',
        cost: 0, buttonText: state.primaryAbility === 'fire' ? 'EQUIPPED' : 'EQUIP', disabled: state.primaryAbility === 'fire',
        buy: () => { state.primaryAbility = 'fire'; }
      },
      {
        title: `[1] ${state.lightningUnlocked ? 'EQUIP' : 'UNLOCK'} LIGHTNING ${state.primaryAbility === 'lightning' ? '✓' : ''}`,
        desc: `A faster electric bolt for slot [1] (Current damage: ${state.primaryAbility === 'lightning' ? getPrimaryDamage() : Math.round((45 + (state.primaryPowerLevel - 1) * 28 + state.stageIdx * 8) * 1.25)}).`,
        cost: state.lightningUnlocked ? 0 : 600, buttonText: state.primaryAbility === 'lightning' ? 'EQUIPPED' : (state.lightningUnlocked ? 'EQUIP' : 'UNLOCK — 600 GOLD'),
        disabled: state.primaryAbility === 'lightning',
        buy: () => { if (!state.lightningUnlocked) { state.gold -= 600; state.lightningUnlocked = true; } state.primaryAbility = 'lightning'; }
      },
      {
        title: `[1] PRIMARY POWER LV.${state.primaryPowerLevel}`,
        desc: `Upgrade the equipped ${primaryAbilityName()} (Current: ${getPrimaryDamage()} DMG).`,
        cost: state.primaryPowerLevel * 320,
        buy: () => { state.gold -= state.primaryPowerLevel * 320; state.primaryPowerLevel++; }
      },
      {
        title: `[2] DRAGON CLAW POWER LV.${state.clawLevel}`,
        desc: `Increase [2] Claw melee damage (Current: ${getClawDamage()} DMG).`,
        cost: state.clawLevel * 300,
        buy: () => { state.gold -= state.clawLevel * 300; state.clawLevel++; }
      },
      {
        title: '[3] NOVA EXPLOSION CHARGE (+2)',
        desc: 'Add +2 screen-clearing Nova Explosions for key [3].',
        cost: 450,
        buy: () => { state.gold -= 450; state.ultimateAmmo += 2; }
      }
    ];

    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'card-item';
      card.innerHTML = `<div><h4>${it.title}</h4><p>${it.desc}</p></div><button class="card-btn" ${state.gold < it.cost || it.disabled ? 'disabled' : ''}>${it.buttonText || `BUY — ${it.cost} GOLD`}</button>`;
      card.querySelector('button').onclick = () => {
        if (state.gold < it.cost || it.disabled) return;
        it.buy();
        sfx.loot();
        saveGame();
        updateHUD();
        renderShopModal();
      };
      box.appendChild(card);
    });
  } else {
    const stats = [
      {
        title: 'DRAGON EVOLUTION BOOST',
        desc: `Evolve your dragon faster! Increases size, horns, and aura (Current Evo: Lv.${getEffectiveDragonEvolution()}).`,
        cost: state.dragonEvoLevel * 600,
        buy: () => { state.gold -= state.dragonEvoLevel * 600; state.dragonEvoLevel++; buildStageWorld(); }
      },
      {
        title: 'MAX HP REINFORCEMENT (+60)',
        desc: 'Increase maximum HP and heal completely.',
        cost: 350,
        buy: () => { state.gold -= 350; state.maxHp += 60; state.hp = state.maxHp; }
      },
      {
        title: 'ENERGY SHIELD BARRIER (+50)',
        desc: 'Upgrade protective dragon scale shield.',
        cost: 400,
        buy: () => { state.gold -= 400; state.maxShield += 50; state.shield = state.maxShield; }
      }
    ];

    stats.forEach(st => {
      const card = document.createElement('div');
      card.className = 'card-item';
      card.innerHTML = `<div><h4>${st.title}</h4><p>${st.desc}</p></div><button class="card-btn" ${state.gold < st.cost ? 'disabled' : ''}>BUY — ${st.cost} GOLD</button>`;
      card.querySelector('button').onclick = () => {
        if (state.gold < st.cost) return;
        st.buy();
        sfx.loot();
        saveGame();
        updateHUD();
        renderShopModal();
      };
      box.appendChild(card);
    });
  }
}

function renderCabinetModal() {
  const grid = $('cabinetGrid');
  grid.innerHTML = '';
  let unlockedCount = 0;

  STAGE_BLUEPRINTS.forEach((bp, idx) => {
    const isUnlocked = state.cabinetUnlocked[bp.partId];
    if (isUnlocked) unlockedCount++;

    const slot = document.createElement('div');
    slot.className = `cabinet-slot ${isUnlocked ? 'collected' : ''}`;
    slot.innerHTML = `
      <div style="font-size:24px;">${isUnlocked ? bp.icon : '🔒'}</div>
      <b>${bp.partName}</b>
      <small>${isUnlocked ? 'INSTALLED ✓' : 'STAGE ' + (idx + 1)}</small>
    `;
    grid.appendChild(slot);
  });

  $('cabinetCount').textContent = `${unlockedCount} / 20`;
}

function toggleShopModal() {
  const opening = $('shopModal').classList.contains('hidden');
  $('cabinetModal').classList.add('hidden');
  if (opening) {
    renderShopModal();
    $('shopModal').classList.remove('hidden');
  } else {
    $('shopModal').classList.add('hidden');
  }
}

function toggleCabinetModal() {
  const opening = $('cabinetModal').classList.contains('hidden');
  $('shopModal').classList.add('hidden');
  if (opening) {
    renderCabinetModal();
    $('cabinetModal').classList.remove('hidden');
  } else {
    $('cabinetModal').classList.add('hidden');
  }
}

// ============================================================================
// 9. HUD & MAIN LOOP
// ============================================================================
let toastTimeout = null;
function showToast(msg) {
  $('toastMsg').textContent = msg;
  $('toastMsg').classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('toastMsg').classList.remove('show'), 2600);
}

function updateHUD() {
  const bp = STAGE_BLUEPRINTS[state.stageIdx];

  $('hudDragonEvo').textContent = getEffectiveDragonEvolution();
  $('hpText').textContent = `${Math.ceil(state.hp)}/${state.maxHp}`;
  $('hpFill').style.width = `${(state.hp / state.maxHp) * 100}%`;

  $('shieldText').textContent = `${Math.ceil(state.shield)}/${state.maxShield}`;
  $('shieldFill').style.width = state.maxShield > 0 ? `${(state.shield / state.maxShield) * 100}%` : '0%';

  $('fireAmmo').textContent = state.fireAmmo;
  $('primaryAbilityLabel').textContent = `${state.primaryAbility === 'lightning' ? '⚡ LIGHTNING' : '🔥 FIRE'}: `;
  $('ultimateAmmo').textContent = state.ultimateAmmo;
  $('goldText').textContent = state.gold.toLocaleString();

  $('stageLabel').textContent = `STAGE ${state.stageIdx + 1}/20 • THREAT ×${state.stageIdx + 1} • ${MAP_ROUTE_STYLES[state.stageIdx % MAP_ROUTE_STYLES.length]}`;
  $('rigMiniSummary').textContent = `PART: ${state.stagePartCollected ? 'COLLECTED ✓' : 'FIND ON MAP'} • BOSS: ${state.bossDefeated ? 'DEFEATED ✓' : bp.bossName}`;

  if (boss && boss.hp > 0 && Math.abs(player.x - boss.x) < 920) {
    $('bossBarWrap').classList.remove('hidden');
    $('bossTitle').textContent = boss.name;
    $('bossHpLabel').textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    $('bossHpFill').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  } else {
    $('bossBarWrap').classList.add('hidden');
  }
}

let lastFrameTime = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  const isGameActive =
    state.started &&
    $('shopModal').classList.contains('hidden') &&
    $('cabinetModal').classList.contains('hidden') &&
    $('gameOverScreen').classList.contains('hidden') &&
    $('congratsScreen').classList.contains('hidden');

  if (isGameActive) {
    updateSimulation(dt);
    updateHUD();

    // Compute proximity to Boss (0.0 at start -> 1.0 at Boss Arena) to speed up & raise BGM!
    const bossArenaX = stageWorldWidth - 940;
    const bossProximity = Math.max(0, Math.min(1, player.x / bossArenaX));
    sfx.updateBGM(dt, state.stageIdx, bossProximity, true);
  }

  renderBackground();
  renderWorld();
  requestAnimationFrame(gameLoop);
}

// ============================================================================
// 10. BUTTON EVENT LISTENERS
// ============================================================================
$('btnStart').onclick = () => {
  sfx.init();
  state.started = true;
  $('startScreen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  buildStageWorld();
};

$('btnContinue').onclick = () => {
  sfx.init();
  loadGame();
  state.started = true;
  $('startScreen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  buildStageWorld();
};

$('btnRetryStage').onclick = () => {
  $('gameOverScreen').classList.add('hidden');
  state.hp = state.maxHp;
  state.shield = state.maxShield;
  buildStageWorld();
};

$('btnBackToTitle').onclick = () => {
  $('gameOverScreen').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('startScreen').classList.remove('hidden');
  state.started = false;
};

$('btnNextLevelCongrats').onclick = () => {
  $('congratsScreen').classList.add('hidden');
  if (state.stageIdx < STAGE_BLUEPRINTS.length - 1) {
    state.stageIdx++;
  } else {
    state.stageIdx = 0;
  }
  state.bossDefeated = false;
  state.stagePartCollected = false;
  state.bossIntelShown = false;
  state.maxHp += 25;
  state.hp = state.maxHp;
  state.shield = state.maxShield;
  saveGame();
  buildStageWorld();
};

$('btnToggleMute').onclick = () => {
  sfx.muted = !sfx.muted;
  $('btnToggleMute').textContent = sfx.muted ? '🔇 MUTED' : '🔊 BGM';
};

$('btnOpenShop').onclick = toggleShopModal;
$('btnCloseShop').onclick = () => $('shopModal').classList.add('hidden');

$('btnOpenCabinet').onclick = toggleCabinetModal;
$('btnCloseCabinet').onclick = () => $('cabinetModal').classList.add('hidden');
$('btnEnterBoss').onclick = closeBossIntel;

$('btnSaveGame').onclick = () => {
  saveGame();
  showToast('PROGRESS SAVED!');
};

document.querySelectorAll('.tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeShopTab = btn.dataset.tab;
    renderShopModal();
  };
});

if (localStorage.getItem(SAVE_KEY)) {
  $('btnContinue').classList.remove('hidden');
}

buildStageWorld();
requestAnimationFrame(gameLoop);
