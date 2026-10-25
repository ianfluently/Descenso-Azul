"use strict";

/* =========================================================
   DESCENSO AZUL — juego educativo ODS 14
   Algoritmos propios inspirados en conceptos de Nature of Code:
   aleatoriedad, vectores, fuerzas, partículas y agentes autónomos.
   No requiere bibliotecas externas.
   ========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const trashEl = document.getElementById("trashCount");
const depthEl = document.getElementById("depth");
const missionEl = document.getElementById("mission");
const toastEl = document.getElementById("toast");
const overlay = document.getElementById("overlay");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalScore = document.getElementById("modalScore");
const restartBtn = document.getElementById("restart");
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const referencesBtn = document.getElementById("referencesBtn");
const referencesPanel = document.getElementById("referencesPanel");
const closeReferencesBtn = document.getElementById("closeReferences");
const playAgainBtn = document.getElementById("playAgainBtn");

let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);
function resize(){
  W=innerWidth; H=innerHeight; DPR=Math.min(devicePixelRatio||1,2);
  canvas.width=W*DPR; canvas.height=H*DPR;
  canvas.style.width=W+"px"; canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize); resize();


// Utilidades aleatorias reutilizables: selección, rango y eventos probabilísticos.
function randomRange(min, max) { return min + Math.random() * (max - min); }
function randomChoice(items) { return items[Math.floor(Math.random() * items.length)]; }
function randomChance(probability) { return Math.random() < probability; }

// Agentes autónomos: movimiento mediante posición, velocidad, aceleración y fuerzas.
// Inspirado conceptualmente en vectores, steering, flocking y flow fields de Nature of Code.
class OceanAgent {
  constructor() {
    this.position = { x: randomRange(0, W), y: randomRange(80, H) };
    this.velocity = { x: randomRange(-0.35, 0.35), y: randomRange(-0.18, 0.18) };
    this.acceleration = { x: 0, y: 0 };
    this.maxSpeed = randomRange(0.35, 0.8);
    this.maxForce = 0.025;
    this.size = randomRange(3, 7);
    this.phase = randomRange(0, Math.PI * 2);
    this.color = randomChoice(["#8de8ed", "#72c6d5", "#a4e5ce", "#d2f3ff"]);
  }
  applyForce(force) {
    this.acceleration.x += force.x;
    this.acceleration.y += force.y;
  }
  steerToward(target, weight = 1) {
    let dx = target.x - this.position.x;
    let dy = target.y - this.position.y;
    const mag = Math.hypot(dx, dy) || 1;
    const desired = { x: dx / mag * this.maxSpeed, y: dy / mag * this.maxSpeed };
    let steer = { x: desired.x - this.velocity.x, y: desired.y - this.velocity.y };
    const sm = Math.hypot(steer.x, steer.y) || 1;
    const limit = Math.min(1, this.maxForce / sm);
    this.applyForce({ x: steer.x * limit * weight, y: steer.y * limit * weight });
  }
  flock(neighbors) {
    let sep = {x:0,y:0}, align = {x:0,y:0}, cohesion = {x:0,y:0};
    let countSep=0, count=0;
    for (const other of neighbors) {
      if (other === this) continue;
      const dx=this.position.x-other.position.x, dy=this.position.y-other.position.y;
      const d=Math.hypot(dx,dy);
      if (d>0 && d<42) {
        sep.x += dx/d; sep.y += dy/d; countSep++;
      }
      if (d>0 && d<95) {
        align.x += other.velocity.x; align.y += other.velocity.y;
        cohesion.x += other.position.x; cohesion.y += other.position.y; count++;
      }
    }
    if (countSep) {
      sep.x/=countSep; sep.y/=countSep;
      const m=Math.hypot(sep.x,sep.y)||1;
      sep.x=sep.x/m*this.maxSpeed-this.velocity.x;
      sep.y=sep.y/m*this.maxSpeed-this.velocity.y;
      this.applyForce({x:sep.x*this.maxForce*0.9,y:sep.y*this.maxForce*0.9});
    }
    if (count) {
      align.x/=count; align.y/=count;
      const am=Math.hypot(align.x,align.y)||1;
      this.applyForce({x:(align.x/am*this.maxSpeed-this.velocity.x)*this.maxForce*.35,
                       y:(align.y/am*this.maxSpeed-this.velocity.y)*this.maxForce*.35});
      cohesion.x/=count; cohesion.y/=count;
      this.steerToward(cohesion, .35);
    }
  }
  update(dt, neighbors) {
    this.flock(neighbors);
    // Campo de flujo suave: una corriente virtual cambia lentamente con el espacio/tiempo.
    const time = performance.now() * 0.00015;
    const angle = Math.sin(this.position.x*0.009 + time) * 0.9 +
                  Math.cos(this.position.y*0.006 - time*0.8) * 0.35;
    this.applyForce({x:Math.cos(angle)*0.004,y:Math.sin(angle)*0.004});
    this.velocity.x += this.acceleration.x * dt;
    this.velocity.y += this.acceleration.y * dt;
    const speed = Math.hypot(this.velocity.x,this.velocity.y);
    if (speed > this.maxSpeed) {
      this.velocity.x = this.velocity.x/speed*this.maxSpeed;
      this.velocity.y = this.velocity.y/speed*this.maxSpeed;
    }
    this.position.x += this.velocity.x*dt;
    this.position.y += this.velocity.y*dt;
    this.acceleration = {x:0,y:0};
    this.phase += dt*0.006;
    if (this.position.x < -20) this.position.x=W+20;
    if (this.position.x > W+20) this.position.x=-20;
    if (this.position.y < 75) this.position.y=H-20;
    if (this.position.y > H+20) this.position.y=80;
  }
  draw(ctx, depthFactor) {
    ctx.save();
    ctx.translate(this.position.x,this.position.y);
    ctx.rotate(Math.atan2(this.velocity.y,this.velocity.x));
    ctx.globalAlpha = 0.18 + (1-depthFactor)*0.2;
    ctx.fillStyle=this.color;
    ctx.beginPath();
    ctx.ellipse(0,0,this.size*1.6,this.size*.7,0,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-this.size,0);
    ctx.lineTo(-this.size*2,-this.size*.8);
    ctx.lineTo(-this.size*2,this.size*.8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// Partículas ambientales con vida limitada (sistema de partículas).
function makeAmbientParticle() {
  return {x:randomRange(0,W), y:randomRange(0,H), r:randomRange(.7,2.4),
    speed:randomRange(.04,.18), drift:randomRange(-.08,.08), alpha:randomRange(.08,.28)};
}


const stages = [
  {max:40,   name:"Pez payaso",    next:"Tortuga marina", min:10,  color:"#ff7d36", speed:40},
  {max:200,  name:"Tortuga marina",next:"Tiburón blanco", min:30,  color:"#9ad0b0", speed:160},
  {max:500,  name:"Tiburón blanco",next:"Cachalote",      min:60,  color:"#b9d3df", speed:300},
  {max:1000, name:"Cachalote",     next:"Calamar gigante",min:100, color:"#687b94", speed:500},
  {max:2000, name:"Calamar gigante",next:null,             min:150, color:"#a778d2", speed:1000}
];

// Cada tramo está calibrado para durar exactamente 60 segundos.
// Velocidades en metros por segundo: 40/60, 160/60, 300/60, 500/60 y 1000/60.
function depthSpeed(){
  const s=stages[stageForDepth(game.depth)];
  return s.speed/60;
}

const facts = [
  "ODS 14 busca conservar y utilizar sosteniblemente los océanos, mares y recursos marinos.",
  "Los océanos cubren alrededor del 71% de la superficie de la Tierra y son fundamentales para la vida del planeta.",
  "Cada año millones de toneladas de plástico llegan a los ecosistemas acuáticos, afectando a numerosas especies.",
  "Las bolsas y otros plásticos pueden ser ingeridos por tortugas, aves y mamíferos marinos al confundirse con alimento.",
  "Los aparejos de pesca abandonados pueden seguir atrapando animales durante mucho tiempo; este fenómeno se conoce como pesca fantasma.",
  "Reducir, reutilizar y reciclar ayuda a disminuir la cantidad de residuos que terminan en ríos, costas y océanos.",
  "Los arrecifes de coral son ecosistemas muy diversos y están amenazados por el calentamiento y la acidificación del océano.",
  "El océano absorbe una gran parte del exceso de calor del sistema climático, ayudando a moderar el calentamiento global.",
  "La contaminación marina no conoce fronteras: los residuos pueden viajar grandes distancias mediante corrientes y vientos.",
  "Proteger hábitats marinos y pesquerías sostenibles es parte de la conservación de la biodiversidad oceánica.",
  "Las microfibras y microplásticos son diminutos, pero pueden entrar en las cadenas alimentarias.",
  "La acidificación oceánica ocurre cuando el mar absorbe dióxido de carbono de la atmósfera, modificando su química.",
  "Los manglares, marismas y pastos marinos proporcionan refugio a muchas especies y ayudan a proteger las costas.",
  "Cuidar el océano también significa cuidar nuestra propia seguridad alimentaria, economía y bienestar."
];

const trashTypes = [
  {type:"botella", label:"Botella de plástico", pts:2},
  {type:"bolsa", label:"Bolsa de plástico", pts:2},
  {type:"gancho", label:"Aparejo abandonado", pts:3},
  {type:"vaso", label:"Vaso desechable", pts:2},
  {type:"lata", label:"Lata", pts:2},
  {type:"red", label:"Fragmento de red", pts:3},
  {type:"envase", label:"Envase plástico", pts:2}
];

let game, player, trash, particles, bubbles, agents, ambientParticles, lastTime, spawnTimer, factIndex, toastTimer;

function reset(){
  game={
    running:false, depth:0, score:0, collected:0, stage:0,
    stageAnnounced:false, failed:false, won:false
  };
  player={x:W/2,y:H*.52,targetX:W/2,targetY:H*.52,angle:0};
  trash=[]; particles=[]; bubbles=[]; agents=[]; ambientParticles=[]; lastTime=performance.now(); spawnTimer=0; factIndex=0;
  overlay.classList.remove("show");
  updateUI();
  for(let i=0;i<26;i++) bubbles.push(newBubble(true));
  for(let i=0;i<12;i++) spawnTrash(true);
  for(let i=0;i<18;i++) agents.push(new OceanAgent());
  for(let i=0;i<75;i++) ambientParticles.push(makeAmbientParticle());
}

addEventListener("mousemove",e=>{
  if (player && game && game.running) { player.targetX=e.clientX; player.targetY=e.clientY; }
});
addEventListener("touchmove",e=>{
  const t=e.touches[0]; if(t && player && game && game.running){player.targetX=t.clientX; player.targetY=t.clientY;}
},{passive:true});

function stageForDepth(d){
  for(let i=0;i<stages.length;i++) if(d<=stages[i].max) return i;
  return 4;
}

function newBubble(initial=false){
  return {
    x:Math.random()*W,y:initial?Math.random()*H:H+10,
    r:randomRange(1,4), speed:randomRange(.12,.47),
    alpha:randomRange(.12,.47)
  };
}

function spawnTrash(initial=false){
  const t=randomChoice(trashTypes);
  trash.push({
    x:randomRange(35,Math.max(36,W-35)),
    y:initial?randomRange(0,H):H+30+randomRange(0,180),
    size:randomRange(18,26),
    type:t.type,label:t.label,pts:t.pts,
    drift:randomRange(-.175,.175), rot:randomRange(0,Math.PI*2),
    rotSpeed:randomRange(-.006,.006),
    wobble:randomRange(0,Math.PI*2)
  });
}


function updateOceanAgents(dt) {
  if (!agents) return;
  for (const agent of agents) agent.update(Math.min(dt,40)*0.06, agents);
}
function updateAmbientParticles(dt) {
  if (!ambientParticles) return;
  for (const p of ambientParticles) {
    p.y -= p.speed * dt * 0.12;
    p.x += Math.sin(p.y*0.012 + performance.now()*0.0003)*p.drift*dt;
    if (p.y < -5) { p.y=H+5; p.x=randomRange(0,W); }
  }
}

function update(dt){
  // Los agentes y partículas ambientales siguen animándose también en la pantalla de inicio.
  updateOceanAgents(dt);
  updateAmbientParticles(dt);
  if(!game.running) return;

  // Descenso automático: cada nivel dura 60 segundos.
  // La velocidad de descenso se ajusta por tramo; la basura mantiene velocidad 1.0x.
  const metersPerSecond = depthSpeed();
  game.depth += metersPerSecond*dt/1000;

  // Movimiento del personaje con suavizado.
  const ease=Math.min(1,dt*.012);
  player.x += (player.targetX-player.x)*ease;
  player.y += (player.targetY-player.y)*ease;
  player.x=Math.max(34,Math.min(W-34,player.x));
  player.y=Math.max(105,Math.min(H-35,player.y));
  player.angle += (player.targetX-player.x)*.0007;

  // El escenario "sube" para dar sensación de descenso.
  for(const b of bubbles){
    b.y -= b.speed*dt*(.7+game.depth/2500);
    if(b.y<-10){Object.assign(b,newBubble(false));}
  }

  for(const t of trash){
    // La basura conserva el multiplicador 1.0x en todos los tramos.
    // Velocidad de basura constante: 1.0x en todos los niveles
    const trashDifficulty=1.0;
    t.y -= metersPerSecond*dt*.42*trashDifficulty;
    t.x += Math.sin(game.depth*.035+t.wobble)*t.drift;
    t.rot += t.rotSpeed;
  }

  spawnTimer += dt;
  const spawnEvery=Math.max(360,900-game.stage*110-game.depth*.03);
  if(spawnTimer>spawnEvery){
    spawnTimer=0; spawnTrash();
  }
  while(trash.length>34) trash.shift();

  // Recolección.
  for(let i=trash.length-1;i>=0;i--){
    const t=trash[i];
    const dx=t.x-player.x,dy=t.y-player.y;
    if(dx*dx+dy*dy < (t.size+27)*(t.size+27)){
      collectTrash(t);
      trash.splice(i,1);
    }
  }

  // Partículas.
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
    if(p.life<=0) particles.splice(i,1);
  }

  const newStage=stageForDepth(game.depth);
  if(newStage!==game.stage){
    if(newStage>game.stage){
      // Antes de entrar al nuevo tramo, comprobar el mínimo del tramo anterior.
      const previous=stages[game.stage];
      if(game.score < previous.min){
        lose(previous);
        return;
      }
      game.stage=newStage;
      showToast("¡Desbloqueado! Ahora exploras como "+stages[newStage].name+".");
    } else game.stage=newStage;
  }

  if(game.depth>=2000){
    game.depth=2000; win(); return;
  }

  updateUI();
}

function collectTrash(t){
  game.score+=t.pts; game.collected++;
  for(let i=0;i<12;i++){
    const a=randomRange(0,Math.PI*2),s=randomRange(30,120);
    particles.push({x:t.x,y:t.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:randomRange(450,900),r:randomRange(1,4)});
  }
  // Datos curiosos aparecen periódicamente, no necesariamente en cada recolección.
  if(game.collected%2===0 || randomChance(.28)){
    const fact=randomChoice(facts); factIndex++;
    showToast("🌊 Dato ODS 14 · "+fact);
  }
  updateUI();
}

function showToast(text){
  toastEl.textContent=text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.remove("show"),5200);
}

function updateUI(){
  scoreEl.textContent=game.score;
  trashEl.textContent=game.collected;
  depthEl.textContent=Math.floor(game.depth);
  const s=stages[game.stage];
  const remain=Math.max(0,s.min-game.score);
  if(game.stage<4){
    const stageStart = game.stage===0 ? 0 : stages[game.stage-1].max;
    const stageProgress=Math.max(0,Math.min(60,(game.depth-stageStart)/(s.max-stageStart)*60));
    const secondsLeft=Math.max(0,60-stageProgress);
    missionEl.textContent=remain>0
      ? `Meta: ${s.min} puntos · faltan ${remain} · ${secondsLeft.toFixed(0)} s para ${s.max} m · siguiente: ${s.next}.`
      : `¡Meta cumplida! ${secondsLeft.toFixed(0)} s para llegar a ${s.next}.`;
  }else{
    missionEl.textContent=`Último descenso · ${Math.max(0,150-game.score)} puntos para completar el objetivo final.`;
  }
}

function lose(previous){
  game.running=false; game.failed=true;
  modalTitle.textContent="Has perdido la expedición";
  modalText.innerHTML=`No reuniste los <b>${previous.min} puntos</b> necesarios antes de llegar a <b>${previous.max} m</b>.<br>La contaminación siguió avanzando y no pudiste desbloquear al siguiente explorador.`;
  modalScore.textContent=`Profundidad: ${Math.floor(game.depth)} m · Puntos: ${game.score}`;
  overlay.classList.add("show");
}

function win(){
  game.running=false; game.won=true;
  modalTitle.textContent="Ganaste. Has limpiado el océano";
  modalText.innerHTML="Llegaste a <b>2000 metros</b> con el calamar gigante y retiraste residuos durante toda la expedición.<br><br>El ODS 14 nos recuerda que proteger la vida submarina requiere acciones sostenidas mucho más allá de este juego.";
  modalScore.textContent=`Basura recolectada: ${game.collected} · Puntos: ${game.score}`;
  overlay.classList.add("show");
}

function startExpedition() {
  startScreen.classList.add("hidden");
  referencesPanel.classList.add("hidden");
  game.running = true;
  lastTime = performance.now();
  canvas.style.cursor = "none";
}
startBtn.addEventListener("click", startExpedition);
playAgainBtn.addEventListener("click", startExpedition);
referencesBtn.addEventListener("click", () => referencesPanel.classList.remove("hidden"));
closeReferencesBtn.addEventListener("click", () => referencesPanel.classList.add("hidden"));
restartBtn.onclick = () => {
  reset();
  startScreen.classList.add("hidden");
  game.running = true;
  canvas.style.cursor = "none";
};

function draw(){
  // Fondo por profundidad: de azul claro a azul casi negro.
  const p=Math.min(1,game.depth/2000);
  const topR=Math.floor(4*(1-p)), topG=Math.floor(45*(1-p)+7), topB=Math.floor(72*(1-p)+22);
  const botG=Math.floor(105*(1-p)+10), botB=Math.floor(150*(1-p)+27);
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,`rgb(${topR},${topG},${topB})`);
  grad.addColorStop(1,`rgb(1,${botG},${botB})`);
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // Rayos superficiales que se desvanecen.
  ctx.save();
  ctx.globalAlpha=Math.max(0,.16-p*.19);
  for(let i=0;i<8;i++){
    ctx.beginPath();
    const x=i*W/7;
    ctx.moveTo(x,0); ctx.lineTo(x+90,H); ctx.lineTo(x+150,H); ctx.lineTo(x+35,0);
    ctx.fillStyle="rgba(80,225,255,.10)"; ctx.fill();
  }
  ctx.restore();

  // Partículas/burbujas.
  for(const b of bubbles){
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(190,245,255,${b.alpha*(1-p*.55)})`;ctx.fill();
  }

  // Partículas ambientales: sistema de partículas sencillo.
  for (const q of (ambientParticles || [])) {
    ctx.beginPath(); ctx.arc(q.x,q.y,q.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(175,235,245,${q.alpha*(1-p*.6)})`; ctx.fill();
  }

  // Cardumen autónomo: separación, alineación, cohesión y corriente virtual.
  for (const agent of (agents || [])) agent.draw(ctx,p);

  // Siluetas ambientales.
  drawEnvironment(p);

  // Basura.
  for(const t of trash) drawTrash(t,p);

  // Jugador.
  drawCreature(player.x,player.y,game.stage,player.angle,p);

  // Partículas de recolección.
  for(const q of particles){
    ctx.globalAlpha=Math.max(0,q.life/900);
    ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);
    ctx.fillStyle="#9cf5ff";ctx.fill();
  }
  ctx.globalAlpha=1;

  // Viñeta de profundidad.
  const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.18,W/2,H/2,Math.max(W,H)*.75);
  vignette.addColorStop(0,"rgba(0,0,0,0)");
  vignette.addColorStop(1,`rgba(0,0,0,${.15+p*.45})`);
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}

function drawEnvironment(p){
  ctx.save();
  // Plantas / coral cerca del fondo visual.
  const density=.25+p*.8;
  ctx.globalAlpha=.13*density;
  for(let i=0;i<18;i++){
    const x=(i/17)*W+Math.sin(i*7.2)*25;
    const h=25+((i*31)%85)*density;
    ctx.strokeStyle="#6bd6d4";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x,H+10);
    ctx.quadraticCurveTo(x-15,H-h*.5,x+5,H-h);
    ctx.stroke();
  }
  // Formas rocosas.
  ctx.globalAlpha=.18*density;
  ctx.fillStyle="#0a303c";
  for(let i=0;i<7;i++){
    const x=i*W/6-40;
    ctx.beginPath();ctx.ellipse(x,H+25,90,50+((i*13)%35),0,0,Math.PI*2);ctx.fill();
  }
  // Fauna distante en profundidad.
  if(p>.35){
    ctx.globalAlpha=.11;
    for(let i=0;i<5;i++){
      const x=((i*173+game.depth*1.7)% (W+200))-100;
      const y=190+i*100;
      ctx.fillStyle="#8bb8c6";
      ctx.beginPath();ctx.ellipse(x,y,25,7,0,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();
}

function drawTrash(t,p){
  ctx.save();
  ctx.translate(t.x,t.y);ctx.rotate(t.rot);
  ctx.shadowBlur=10;ctx.shadowColor="rgba(0,0,0,.3)";
  ctx.lineWidth=1.5;
  if(t.type==="botella"){
    ctx.fillStyle="#72c9c6";ctx.fillRect(-6,-14,12,27);
    ctx.fillStyle="#d5f1ef";ctx.fillRect(-5,-11,10,8);
    ctx.fillStyle="#4b8d8e";ctx.fillRect(-4,-19,8,5);
  } else if(t.type==="bolsa"){
    ctx.fillStyle="#c5d9d7";ctx.beginPath();
    ctx.moveTo(-13,-13);ctx.lineTo(13,-13);ctx.lineTo(10,14);ctx.lineTo(-11,17);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#739a9e";ctx.beginPath();ctx.arc(-6,-13,5,Math.PI,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(6,-13,5,Math.PI,Math.PI*2);ctx.stroke();
  } else if(t.type==="gancho"){
    ctx.strokeStyle="#d5b58a";ctx.lineWidth=4;ctx.beginPath();
    ctx.moveTo(-8,-15);ctx.lineTo(5,2);ctx.quadraticCurveTo(15,14,4,17);ctx.stroke();
    ctx.strokeStyle="#6f7e86";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,-13);ctx.lineTo(-15,-19);ctx.stroke();
  } else if(t.type==="vaso"){
    ctx.fillStyle="#e8ece6";ctx.beginPath();
    ctx.moveTo(-10,-14);ctx.lineTo(10,-14);ctx.lineTo(7,14);ctx.lineTo(-7,14);ctx.closePath();ctx.fill();
    ctx.fillStyle="#8ab0ad";ctx.fillRect(-11,-17,22,4);
  } else if(t.type==="lata"){
    ctx.fillStyle="#b9c2c7";ctx.fillRect(-8,-14,16,28);
    ctx.fillStyle="#5f8792";ctx.fillRect(-6,-9,12,8);
    ctx.strokeStyle="#e3eaeb";ctx.strokeRect(-8,-14,16,28);
  } else if(t.type==="red"){
    ctx.strokeStyle="#dfbf72";ctx.lineWidth=2;
    for(let i=-12;i<=12;i+=8){ctx.beginPath();ctx.moveTo(i,-14);ctx.lineTo(i+6,14);ctx.stroke()}
    for(let i=-12;i<=12;i+=8){ctx.beginPath();ctx.moveTo(-14,i);ctx.lineTo(14,i+5);ctx.stroke()}
  } else {
    ctx.fillStyle="#d1d8cf";ctx.fillRect(-13,-10,26,20);
    ctx.fillStyle="#86a4a1";ctx.fillRect(-9,-6,18,5);
    ctx.strokeStyle="#8aa5a4";ctx.strokeRect(-13,-10,26,20);
  }
  ctx.restore();
}

function drawCreature(x,y,stage,angle,p){
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.max(-.25,Math.min(.25,angle)));
  ctx.shadowBlur=22;ctx.shadowColor=stages[stage].color;
  const dim=1+stage*.05;

  if(stage===0) drawClownfish(dim);
  if(stage===1) drawTurtle(dim);
  if(stage===2) drawShark(dim);
  if(stage===3) drawWhale(dim);
  if(stage===4) drawSquid(dim);

  ctx.restore();
}

function drawClownfish(s){
  ctx.scale(s,s);
  ctx.fillStyle="#ff7135";ctx.beginPath();ctx.ellipse(0,0,30,17,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#f4f7ed";ctx.fillRect(-9,-16,7,32);ctx.fillRect(8,-15,7,30);
  ctx.fillStyle="#ff7135";ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(-43,-15);ctx.lineTo(-43,15);ctx.closePath();ctx.fill();
  ctx.fillStyle="#111";ctx.beginPath();ctx.arc(20,-5,3.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ff9b59";ctx.beginPath();ctx.moveTo(-1,-17);ctx.lineTo(7,-28);ctx.lineTo(13,-16);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(-1,17);ctx.lineTo(7,28);ctx.lineTo(13,16);ctx.closePath();ctx.fill();
}
function drawTurtle(s){
  ctx.scale(s,s);
  ctx.fillStyle="#5c9b83";ctx.beginPath();ctx.ellipse(0,0,29,22,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#8ec7a9";ctx.beginPath();ctx.ellipse(3,0,22,16,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#4e846f";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-17,0);ctx.lineTo(17,0);ctx.moveTo(3,-15);ctx.lineTo(3,15);ctx.stroke();
  ctx.fillStyle="#72b394";
  [[-25,-18],[-25,18],[8,-25],[8,25]].forEach(a=>{ctx.beginPath();ctx.ellipse(a[0],a[1],10,5,.4,0,Math.PI*2);ctx.fill()});
  ctx.fillStyle="#80bfa0";ctx.beginPath();ctx.arc(31,0,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#102f2c";ctx.beginPath();ctx.arc(34,-3,1.8,0,Math.PI*2);ctx.fill();
}
function drawShark(s){
  ctx.scale(s,s);
  ctx.fillStyle="#b9c6ce";ctx.beginPath();ctx.ellipse(0,0,43,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#dbe4e6";ctx.beginPath();ctx.ellipse(8,7,29,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#9eafb8";ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(-51,-18);ctx.lineTo(-48,4);ctx.lineTo(-35,8);ctx.closePath();ctx.fill();
  ctx.fillStyle="#788c97";ctx.beginPath();ctx.moveTo(-4,-11);ctx.lineTo(5,-30);ctx.lineTo(14,-11);ctx.closePath();ctx.fill();
  ctx.fillStyle="#6d818c";ctx.beginPath();ctx.moveTo(9,11);ctx.lineTo(18,25);ctx.lineTo(25,10);ctx.closePath();ctx.fill();
  ctx.fillStyle="#111";ctx.beginPath();ctx.arc(27,-4,2.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#5b6b72";ctx.lineWidth=1;ctx.beginPath();ctx.arc(20,5,8,.1,1.4);ctx.stroke();
}
function drawWhale(s){
  ctx.scale(s,s);
  ctx.fillStyle="#526b82";ctx.beginPath();ctx.ellipse(0,0,48,20,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#3f566c";ctx.beginPath();ctx.moveTo(-38,0);ctx.lineTo(-63,-23);ctx.lineTo(-56,0);ctx.lineTo(-63,23);ctx.closePath();ctx.fill();
  ctx.fillStyle="#354b60";ctx.beginPath();ctx.moveTo(-5,-18);ctx.lineTo(3,-35);ctx.lineTo(12,-18);ctx.closePath();ctx.fill();
  ctx.fillStyle="#9cb1bd";ctx.beginPath();ctx.ellipse(20,8,27,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#0a1820";ctx.beginPath();ctx.arc(34,-5,2.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#aac1cc";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(20,-19);ctx.quadraticCurveTo(18,-31,24,-37);ctx.stroke();
}
function drawSquid(s){
  ctx.scale(s,s);
  ctx.fillStyle="#8e68ad";ctx.beginPath();ctx.ellipse(12,-5,28,36,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#b087c8";ctx.beginPath();ctx.ellipse(18,-15,19,24,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#f2d9fa";ctx.beginPath();ctx.arc(23,-20,5,0,Math.PI*2);ctx.arc(7,-20,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#111";ctx.beginPath();ctx.arc(23,-20,2.2,0,Math.PI*2);ctx.arc(7,-20,2.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#a77bc0";ctx.lineWidth=5;ctx.lineCap="round";
  for(let i=0;i<8;i++){
    const a=-1.25+i*.35;
    ctx.beginPath();ctx.moveTo(0,15);ctx.quadraticCurveTo(Math.cos(a)*25,35,Math.cos(a)*42,48+Math.sin(i)*6);ctx.stroke();
  }
}

function loop(now){
  const dt=Math.min(40,now-lastTime); lastTime=now;
  update(dt); draw();
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
