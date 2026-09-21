import {points} from './engine.js?v=10';
import {playoffScoreValues,liveRoundChances} from './playoffs.js?v=10';
import {Game} from './game.js?v=10';
const pushName=n=>n===1?'Push':n===2?'Double push':n===3?'Triple push':`${n}× push`;
const signedMoney=c=>(c>=0?'+':'−')+money(Math.abs(c));
const $=id=>document.getElementById(id),money=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'}),pct=x=>(x*100).toFixed(1)+'%';
let game,showLens=true;
function fresh(bank=10000,count=3,bet=500){game=new Game(bank,count,bet);showLens=true;render();}
function setSelection(indices){game.setSelection(indices);render();}
function action(){game.action();$('settings').hidden=true;render();}
const pipLocations={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function render(){
  const {players,ante,leader,round,playoff,order,cursor,scores,busts,pot,dice,locked,selection,phase,advisor,history,previous}=game;
  const active=()=>game.active(),eligible=()=>game.eligible();
  const myTurn=phase==='turn'&&active()===0,done=phase==='complete';
  $('bankroll').textContent=money(players[0].bank);$('pot').textContent=money(done?0:pot);$('round').textContent=round||'—';$('roundLabel').textContent=round?`ROUND ${String(round).padStart(2,'0')} · ${playoff?pushName(playoff).toUpperCase()+' · ':''}${order.length} AT THE TABLE`:'THE TABLE';
  $('orderNote').textContent=done?`${players[leader].name} leads next ↻`:'Winner leads the next round ↻';
  $('settingsToggle').disabled=['turn','bust'].includes(phase);
  $('seats').innerHTML=order.map((id,i)=>`<div class="seat ${phase==='turn'&&i===cursor?'active':''}"><span class="seat-order">${i+1}${i===0?' · LEADS':''}</span><h3>${players[id].name}${id===0?' ↗':''}</h3><span class="seat-score">${busts[id]?'BUST':scores[id]??(phase==='turn'&&i===cursor?'•••':'—')}</span><small>${money(players[id].bank)} bankroll</small><small class="seat-paid">${money(game.paid[id]??0)} in this round</small></div>`).join('');
  $('score').textContent=myTurn?locked.reduce((s,f)=>s+points(f),0):(busts[0]?'BUST':scores[0]??0);
  const posted=Object.values(scores).filter(Number.isFinite);$('target').textContent=phase==='turn'&&posted.length?`LOW SCORE TO BEAT: ${Math.min(...posted)}`:'';
  $('locked').innerHTML=myTurn?locked.map(f=>`<span title="Locked ${f}: ${points(f)} points">${f}</span>`).join(''):'';
  $('dice').innerHTML=myTurn?dice.map((f,i)=>`<button class="die ${f===3?'three':''} ${selection.has(i)?'selected':''}" data-die="${i}" aria-label="Die ${i+1}: ${f}, ${points(f)} points" aria-pressed="${selection.has(i)}">${pipLocations[f].map(p=>`<span class="pip" style="grid-row:${Math.floor(p/3)+1};grid-column:${p%3+1}"></span>`).join('')}</button>`).join(''):phase==='ready'?[3,1,3,2,3].map(f=>`<span class="die ${f===3?'three':''}">${pipLocations[f].map(p=>`<span class="pip" style="grid-row:${Math.floor(p/3)+1};grid-column:${p%3+1}"></span>`).join('')}</span>`).join(''):'';
  if(phase==='bust'){
    $('dice').innerHTML=dice.map((f,i)=>`<span class="die ${f===3?'three':''}" role="img" aria-label="Last roll die ${i+1}: ${f}, ${points(f)} points">${pipLocations[f].map(p=>`<span class="pip" style="grid-row:${Math.floor(p/3)+1};grid-column:${p%3+1}"></span>`).join('')}</span>`).join('');
  }
  $('clear').hidden=!myTurn||selection.size===0;$('action').disabled=myTurn&&!selection.size;
  if(phase==='ready'){
    $('phase').textContent='TAKE YOUR SEAT';$('headline').textContent='Let the low rolls win.';$('message').textContent='Threes count as zero. Hold at least one die each roll.';$('action').textContent=`Deal me in · ${money(ante)} ante`;$('hint').textContent='Play money only · strategy shown automatically';
  }else if(phase==='bust'){
    $('phase').textContent='TURN ENDED · BUST';$('headline').textContent=active()===0?'You’re bust.':`${players[active()].name} is bust.`;
    $('message').textContent=game.bustReason+' Your last roll is shown below.';
    $('action').textContent=cursor+1<order.length?'Continue to next player':'See round result';$('action').disabled=false;
    $('hint').textContent='Matching the low score is still alive. Exceeding it ends your turn.';
  }else if(phase==='tie'){
    const tied=previous.playoffOrder,short=game.playoffShortfall();
    $('phase').textContent=`${pushName(playoff+1).toUpperCase()} · ${tied.length}-WAY TIE`;
    $('headline').textContent=pushName(playoff+1)+'. Ante again.';
    $('message').textContent=`Tied at ${previous.low}. ${money(pot)} stays in the pot. ${tied.map(i=>players[i].name).join(', ')} each add ${money(ante)}. New contributions: ${tied.map(i=>players[i].name+' '+money(game.paid[i]+ante)).join(' · ')}. New pot: ${money(pot+tied.length*ante)}.`;
    $('action').textContent=short.length?'Push paused · bankroll too low':`Ante again · ${money(ante)} per tied player`;$('action').disabled=short.length>0;
    $('hint').textContent=short.length?`${short.map(i=>players[i].name).join(', ')} cannot cover the ante. The pot is held. Table settings can start a fresh session, clearing this unfinished pot.`:`Next order: ${tied.map(i=>players[i].name).join(' → ')}. Last to tie goes first.`;
    $('orderNote').textContent=`PUSH: ${tied.map(i=>players[i].name).join(' → ')}`;
  }else if(done){
    const winnerNames=previous.winners.map(i=>players[i].name).join(' + ');
    $('phase').textContent='ROUND COMPLETE';$('headline').textContent=`${winnerNames} ${previous.winners[0]===0?'win':'wins'} the pot.`;
    $('message').textContent=`Low score: ${previous.low}. ${money(pot)} paid out. ${players[leader].name} goes first next round.`;
    const seats=eligible(),canPlay=seats.includes(0)&&seats.length>1;
    $('action').textContent=canPlay?`Next round · ${money(ante)} ante`:'Table finished';$('action').disabled=!canPlay;
    $('hint').textContent=canPlay?'Same seats, new leader. Play continues around the table.':!seats.includes(0)?'Your bankroll is below the ante. Use Table settings to start fresh.':'No opponent can afford the ante. Use Table settings to start fresh.';
  }else if(myTurn){
    $('phase').textContent=`YOUR TURN · POSITION ${cursor+1} OF ${order.length}`;$('headline').textContent=selection.size?`Keep ${selection.size}. Roll ${dice.length-selection.size}.`:'What will you keep?';
    $('message').textContent=advisor.known.length?`The table has posted ${advisor.known.join(', ')}. ${advisor.future?`${advisor.future} player${advisor.future===1?'':'s'} still to act.`:'You have the final word.'}`:'You set the target. Everyone after you gets to see your score.';
    $('action').textContent=selection.size===dice.length?'Lock dice & post score':selection.size?'Hold selected & roll':'Select dice to hold';$('hint').textContent='Tap dice to select · at least one must stay · threes are worth zero';
  }else{
    $('phase').textContent=`POSITION ${cursor+1} OF ${order.length}`;$('headline').textContent=`${players[active()].name} is up.`;$('message').textContent=advisor.known.length?`Low score to beat: ${advisor.target}. ${players[active()].name} can use every posted score.`:'First to act. No scores to condition on yet.';$('action').textContent=`Play ${players[active()].name}’s turn`;$('hint').textContent='Advance one seat at a time to follow the table.';
  }
  renderLens(myTurn);
  renderScoreOdds();
  $('history').innerHTML=history.length?history.slice(0,12).map(h=>`<div class="ledger-row"><span>#${h.round}</span><span>${h.winners} · score ${h.low}${h.playoffs?' · '+pushName(h.playoffs):''}</span><span class="${h.net>=0?'positive':'negative'}">${h.net>=0?'+':'−'}${money(Math.abs(h.net))}</span></div>`).join(''):'<p class="muted">Your table’s story starts with the first roll.</p>';
}
function renderLens(myTurn){
  const {options,advisor,selection,dice}=game;
  $('lensToggle').textContent=showLens?'Hide':'Reveal';$('lensToggle').setAttribute('aria-pressed',String(showLens));
  if(!showLens){$('lensBody').innerHTML='<div class="lens-hidden"><div class="lens-icon">◈</div><h3>Trust your read.</h3><p>Choose your dice first. Reveal the lens whenever you want to compare your options.</p><span>BEST HOLD · WORST HOLD · ODDS</span></div>';return;}
  if(!myTurn){renderRoundChances();return;}
  const best=options[0],worst=options.at(-1),holdText=h=>[...h.faces].sort((a,b)=>points(a)-points(b)).join(' · ');
  const bestWin=options.reduce((a,b)=>b.win>a.win+1e-12?b:a),bestAlive=options.reduce((a,b)=>b.survive>a.survive+1e-12?b:a);
  const selected=dice.filter((_,i)=>selection.has(i)).sort((a,b)=>a-b).join(',');
  const joint=(a,b)=>Math.abs(a.ev-b.ev)<1e-7;
  const explanation=bestWin.ev<best.ev-0.005?`The highest win-now row keeps ${holdText(bestWin)} (${pct(bestWin.win)} now), but keeping ${holdText(best)} has a better expected return by ${money(best.ev-bestWin.ev)} after push value and extra antes.`:bestAlive.ev<best.ev-0.005?`Keeping ${holdText(bestAlive)} stays alive more often (${pct(bestAlive.survive)}), but keeping ${holdText(best)} returns ${money(best.ev-bestAlive.ev)} more on average. A push entry is worth less than a win now.`:'This hold gives the highest modeled return after valuing push wins and extra antes.';
  const short=game.order.some(i=>game.players[i].bank<game.ante);
  $('lensBody').innerHTML=`<div class="analysis"><p><b>Play for expected return</b><br>${advisor.known.length?`Posted target: ${advisor.target}. `:''}${advisor.future} opponent${advisor.future===1?'':'s'} still to act.</p><div class="recommend"><span class="eyebrow">BEST EV${options.filter(h=>joint(h,best)).length>1?' · JOINT BEST':''}</span><strong>Keep ${holdText(best)}</strong><strong>${signedMoney(best.ev)} expected round profit</strong><small>${pct(best.win)} win now + ${pct(best.viaPlayoff)} win through a push = ${pct(best.eventual)} total win</small><br><button id="useBest" class="quiet" style="margin-top:12px">Select this hold</button></div><p>${explanation}</p><p><b>Highest win-now row:</b> keep ${holdText(bestWin)} · ${pct(bestWin.win)}<br><b>Highest win-or-tie row:</b> keep ${holdText(bestAlive)} · ${pct(bestAlive.survive)}</p><div class="ev-breakdown"><p><b>Push chance:</b> ${pct(best.tie)}<br><b>Win it if you enter:</b> ${best.tie>1e-12?pct(best.viaPlayoff/best.tie):'— (no push entry)'}<br><b>Expected extra antes:</b> ${money(best.extraCost)}<br><b>Already paid this round:</b> ${money(game.paid[0])}</p></div><div class="option-list"><table><thead><tr><th>HOLD</th><th>WIN NOW</th><th>PUSH</th><th>TOTAL WIN</th><th>NET EV</th></tr></thead><tbody>${options.map(h=>`<tr class="${joint(h,best)?'best':joint(h,worst)?'worst':''}"><td>${holdText(h)}${h.faces.join(',')===selected?' ✓':''}<span class="badge">${joint(h,best)?'BEST EV':joint(h,worst)?'WORST EV':''}</span><br><small>${h.mean.toFixed(2)} avg</small></td><td>${pct(h.win)}</td><td>${pct(h.tie)}</td><td>${pct(h.eventual)}</td><td>${signedMoney(h.ev)}</td></tr>`).join('')}</tbody></table></div><p>NET EV = expected full-pot payout minus all your antes, including future push antes. Each row assumes EV-advised play on your remaining rolls this turn. AVG projects a full five-dice score even on branches that bust. Total win includes wins now and through any number of pushes; a push entry is not counted as a win.</p><details class="model-note"><summary>How the push estimate works</summary><p>The pot carries forward; only tied players re-ante and their order reverses. Multiway and repeated ties are included. Opponents follow the actual computers’ target-aware policy. Future push turns assume that same policy for everyone, including you. Your remaining rolls in this turn are optimized for EV; following improved advice in later pushes can change the results. This is the best current-turn return under that model, not a universal optimum.</p><p>Assumes everyone can cover required push antes. Your current ante is already paid and counts toward round profit; it does not change which hold is best.</p></details>${short?'<p class="funding-note">At least one seat cannot cover another ante. A tie involving that seat will pause the actual game; modeled push returns assume it can be funded.</p>':''}</div>`;
  $('useBest').onclick=()=>setSelection(best.indices);
}

function renderRoundChances(){
  let {order,scores,pot,ante,phase}=game,paid=game.paid[0]??0;
  let context;
  if(phase==='ready'){
    scores={};pot=order.length*ante;paid=ante;context='Before the opening roll';
  }else if(phase==='tie'){
    order=game.previous.playoffOrder;scores={};pot+=order.length*ante;paid+=order.includes(0)?ante:0;
    context=`Before the ${pushName(game.playoff+1).toLowerCase()} · next order: ${order.map(i=>game.players[i].name).join(' → ')}`;
  }else if(phase==='complete')context='Final result for this round';
  else{
    const pending=order.filter(i=>!Object.hasOwn(scores,i));
    context=pending.length?`Before ${game.players[pending[0]].name} rolls · ${pending.length} player${pending.length===1?'':'s'} still to act`:'All turns finished';
  }
  const row=liveRoundChances({order,hero:0,scores,pot,ante,paid});
  const posted=Object.hasOwn(scores,0),score=Number.isFinite(scores[0])?scores[0]:'BUST';
  $('lensBody').innerHTML=`<div class="analysis round-chances" aria-live="polite"><h3>Your round chances</h3><p>${context}${posted?`<br><b>Your posted score: ${score}</b>`:''}</p><div class="chance-grid">${[['Win outright',row.win],['Push (tie)',row.tie],['Lose this round',row.lose]].map(([label,value])=>`<div><span>${label}</span><strong>${pct(value)}</strong></div>`).join('')}</div><div class="eventual-chance"><span>Eventual win</span><strong>${pct(row.eventual)}</strong><small>Win outright or win after one or more pushes.</small></div><p>${signedMoney(row.ev)} expected round profit.</p><p>Win outright = take the pot this pass. Push = tie for the lowest score and ante again in reverse order. Lose this round = someone beats your score and you are eliminated. Eventual win includes outright wins, so it is not a fourth separate outcome.</p><p class="forecast-note">${posted?'Uses your actual posted score and all known results.':'Before your turn, this forecast assumes you follow the same target-aware policy as the computers; your choices can change these odds.'} Remaining computer turns use their actual strategy. Future pushes assume that policy for everyone and enough bankroll to re-ante.</p></div>`;
}

function renderScoreOdds(){
  const first=$('oddsMode').value==='first';$('oddsPlayersLabel').hidden=!first;
  let order,scores={},pot,paid,context;
  if(first){const n=Number($('oddsPlayers').value);order=Array.from({length:n},(_,i)=>i);pot=n*game.ante;paid=game.ante;context=`First to roll · ${n} players total`;}
  else{
    order=game.phase==='complete'?game.eligible():game.phase==='tie'?game.previous.playoffOrder:game.order;
    if(!order.includes(0)||order.length<2){$('scoreOddsBody').innerHTML='<p>You are not in the next playable field. Choose “First to roll” to explore another scenario.</p>';return;}
    const fresh=['ready','complete','tie'].includes(game.phase),waiting=order.slice(0,order.indexOf(0)).some(i=>!Object.hasOwn(game.scores,i));
    if(fresh||waiting){order=[0,...order.filter(i=>i!==0)];context='First-to-roll preview · live odds resume on your turn';pot=game.phase==='tie'?game.pot+order.length*game.ante:order.length*game.ante;paid=game.phase==='tie'?game.paid[0]+game.ante:game.ante;}
    else{scores=Object.fromEntries(Object.entries(game.scores).filter(([i])=>Number(i)!==0));pot=game.pot;paid=game.paid[0];context='Current pass · if you post this final score';}
  }
  const rows=playoffScoreValues({order,hero:0,scores,pot,ante:game.ante,paid}),target=Math.min(...Object.values(scores));
  const goals=[50,75,90].map(goal=>{const qualifying=rows.filter(r=>r.eventual+1e-12>=goal/100);return `${goal}% total win chance: <b>${qualifying.length?'score '+qualifying.at(-1).mean+' or less':'not achievable'}</b>`;});
  $('scoreOddsBody').innerHTML=`<p><b>${context}</b></p>${Number.isFinite(target)?`<p>Beat <b>${target}</b> to win now; match it for a possible push.</p>`:''}<div class="score-examples">${[2,4].map(score=>`<div><small>FINISH WITH ${score}</small><strong>${pct(rows[score].eventual)}</strong><span>total win, including pushes<br>${pct(rows[score].win)} win now<br>${signedMoney(rows[score].ev)} net EV</span></div>`).join('')}</div><p>${goals.join('<br>')}</p><div class="option-list"><table><thead><tr><th scope="col">SCORE</th><th scope="col">WIN NOW</th><th scope="col">PUSH</th><th scope="col">TOTAL WIN</th><th scope="col">NET EV</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.mean===2||r.mean===4?'example-row':''}"><th scope="row">${r.mean}</th><td>${pct(r.win)}</td><td>${pct(r.tie)}</td><td>${pct(r.eventual)}</td><td>${signedMoney(r.ev)}</td></tr>`).join('')}</tbody></table></div><p>Conditional on already scoring that total, not the chance of rolling it. NET EV includes the current ante and expected extra push antes. Forecasts target-aware computer play, reversed push order, and repeated ties. Future push turns assume the computer policy for everyone and sufficient bankroll to re-ante; these are model-based estimates. Live rows replace your score hypothetically.</p>`;
}
$('oddsMode').onchange=renderScoreOdds;$('oddsPlayers').onchange=renderScoreOdds;
$('action').onclick=action;$('clear').onclick=()=>setSelection([]);
$('dice').onclick=e=>{const b=e.target.closest('[data-die]');if(!b)return;const i=Number(b.dataset.die);game.selection.has(i)?game.selection.delete(i):game.selection.add(i);render();};
$('lensToggle').onclick=()=>{showLens=!showLens;render();};
$('settingsToggle').onclick=()=>{$('settings').hidden=!$('settings').hidden;};
$('settings').onsubmit=e=>{e.preventDefault();if(['turn','bust'].includes(game.phase))return;const bank=Math.round(Number($('starting').value)*100),bet=Math.round(Number($('ante').value)*100),count=Number($('opponents').value)+1;if(!Number.isFinite(bank)||!Number.isFinite(bet)||bank<100||bet<1||bet>bank||bank>100000000||![2,3,4,5].includes(count)){$('ante').setCustomValidity('Ante must be positive and no more than the starting bankroll.');$('ante').reportValidity();return;}$('ante').setCustomValidity('');$('settings').hidden=true;fresh(bank,count,bet);};
$('ante').oninput=()=> $('ante').setCustomValidity('');$('starting').oninput=()=> $('ante').setCustomValidity('');
function snapshot(){return game.snapshot();}
fresh();
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_threes_table',description:'Read current play-money table, visible dice, posted scores, and turn order.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>snapshot()});
  register({name:'select_threes_dice',description:'Stage dice to hold on your turn using zero-based indices. Does not roll or finish the turn.',inputSchema:{type:'object',properties:{indices:{type:'array',items:{type:'integer',minimum:0,maximum:4},uniqueItems:true}},required:['indices'],additionalProperties:false},execute:input=>{setSelection(input?.indices);return snapshot();}});
}
