import {points,scoreOutcomes} from './engine.js';
import {Game} from './game.js';
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
  $('bankroll').textContent=money(players[0].bank);$('pot').textContent=money(done?0:pot);$('round').textContent=round||'—';$('roundLabel').textContent=round?`ROUND ${String(round).padStart(2,'0')} · ${playoff?'PLAYOFF '+playoff+' · ':''}${order.length} AT THE TABLE`:'THE TABLE';
  $('orderNote').textContent=done?`${players[leader].name} leads next ↻`:'Winner leads the next round ↻';
  $('settingsToggle').disabled=['turn','bust'].includes(phase);
  $('seats').innerHTML=order.map((id,i)=>`<div class="seat ${phase==='turn'&&i===cursor?'active':''}"><span class="seat-order">${i+1}${i===0?' · LEADS':''}</span><h3>${players[id].name}${id===0?' ↗':''}</h3><span class="seat-score">${busts[id]?'BUST':scores[id]??(phase==='turn'&&i===cursor?'•••':'—')}</span><small>${money(players[id].bank)}</small></div>`).join('');
  $('score').textContent=myTurn?locked.reduce((s,f)=>s+points(f),0):(busts[0]?'BUST':scores[0]??0);
  const posted=Object.values(scores).filter(Number.isFinite);$('target').textContent=phase==='turn'&&posted.length?`LOW SCORE TO BEAT: ${Math.min(...posted)}`:'';
  $('locked').innerHTML=myTurn?locked.map(f=>`<span title="Locked ${f}: ${points(f)} points">${f}</span>`).join(''):'';
  $('dice').innerHTML=myTurn?dice.map((f,i)=>`<button class="die ${f===3?'three':''} ${selection.has(i)?'selected':''}" data-die="${i}" aria-label="Die ${i+1}: ${f}, ${points(f)} points" aria-pressed="${selection.has(i)}">${pipLocations[f].map(p=>`<span class="pip" style="grid-row:${Math.floor(p/3)+1};grid-column:${p%3+1}"></span>`).join('')}</button>`).join(''):phase==='ready'?[3,1,3,2,3].map(f=>`<span class="die ${f===3?'three':''}">${pipLocations[f].map(p=>`<span class="pip" style="grid-row:${Math.floor(p/3)+1};grid-column:${p%3+1}"></span>`).join('')}</span>`).join(''):'';
  $('clear').hidden=!myTurn||selection.size===0;$('action').disabled=myTurn&&!selection.size;
  if(phase==='ready'){
    $('phase').textContent='TAKE YOUR SEAT';$('headline').textContent='Let the low rolls win.';$('message').textContent='Threes count as zero. Hold at least one die each roll.';$('action').textContent=`Deal me in · ${money(ante)} ante`;$('hint').textContent='Play money only · strategy shown automatically';
  }else if(phase==='bust'){
    $('phase').textContent='TURN ENDED · BUST';$('headline').textContent=active()===0?'You’re bust.':`${players[active()].name} is bust.`;
    $('message').textContent=game.bustReason+' No more dice to play.';
    $('action').textContent=cursor+1<order.length?'Continue to next player':'See round result';$('action').disabled=false;
    $('hint').textContent='Matching the low score is still alive. Exceeding it ends your turn.';
  }else if(phase==='tie'){
    const tied=previous.playoffOrder,short=game.playoffShortfall();
    $('phase').textContent=`${tied.length}-WAY TIE · POT CARRIES OVER`;
    $('headline').textContent='Settle it in a playoff.';
    $('message').textContent=`Tied at ${previous.low}. ${money(pot)} stays in the pot. Only ${tied.map(i=>players[i].name).join(', ')} add ${money(ante)} each.`;
    $('action').textContent=short.length?'Playoff paused · bankroll too low':`Ante again · ${money(ante)} per tied player`;$('action').disabled=short.length>0;
    $('hint').textContent=short.length?`${short.map(i=>players[i].name).join(', ')} cannot cover the ante. The pot is held. Table settings can start a fresh session, clearing this unfinished pot.`:`Next order: ${tied.map(i=>players[i].name).join(' → ')}. Last to tie goes first.`;
    $('orderNote').textContent=`PLAYOFF: ${tied.map(i=>players[i].name).join(' → ')}`;
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
  $('history').innerHTML=history.length?history.slice(0,12).map(h=>`<div class="ledger-row"><span>#${h.round}</span><span>${h.winners} · score ${h.low}${h.playoffs?' · '+h.playoffs+' playoff'+(h.playoffs===1?'':'s'):''}</span><span class="${h.net>=0?'positive':'negative'}">${h.net>=0?'+':'−'}${money(Math.abs(h.net))}</span></div>`).join(''):'<p class="muted">Your table’s story starts with the first roll.</p>';
}
function renderLens(myTurn){
  const {options,advisor,selection,dice}=game;
  $('lensToggle').textContent=showLens?'Hide':'Reveal';$('lensToggle').setAttribute('aria-pressed',String(showLens));
  if(!showLens){$('lensBody').innerHTML='<div class="lens-hidden"><div class="lens-icon">◈</div><h3>Trust your read.</h3><p>Choose your dice first. Reveal the lens whenever you want to compare your options.</p><span>BEST HOLD · WORST HOLD · ODDS</span></div>';return;}
  if(!myTurn){$('lensBody').innerHTML='<div class="lens-hidden"><div class="lens-icon">◈</div><h3>Ready when you roll.</h3><p>Your legal holds, best and worst choices, and outcome probabilities appear during your turn.</p></div>';return;}
  const best=options[0],worst=options.at(-1),holdText=h=>h.faces.join(' · '),isMean=advisor.objective==='mean';
  const sameObjective=(a,b)=>Math.abs(isMean?a.mean-b.mean:a.survive-b.survive)<1e-10;
    const selected=dice.filter((_,i)=>selection.has(i)).sort((a,b)=>a-b).join(',');
  $('lensBody').innerHTML=`<div class="analysis"><p><b>${isMean?'First to act · minimize expected score':`Playing to beat ${advisor.target} · maximize win-or-playoff chance`}</b><br>${advisor.future?`${advisor.future} player${advisor.future===1?'':'s'} still to act. Round odds are estimated.`:'Last to act. This pass’s win and tie probabilities are exact.'}</p><div class="recommend"><span class="eyebrow">BEST HOLD${options.filter(h=>sameObjective(h,best)).length>1?' · JOINT BEST':''}</span><strong>${holdText(best)}</strong><small>${best.mean.toFixed(2)} expected score · ${pct(best.survive)} win or reach playoff</small><br><button id="useBest" class="quiet" style="margin-top:12px">Select this hold</button></div><div class="option-list"><table><thead><tr><th>HOLD</th><th>WIN</th><th>TIE</th><th>AVG.</th><th>ALIVE</th></tr></thead><tbody>${options.map(h=>{const isBest=sameObjective(h,best),isWorst=sameObjective(h,worst)&&!isBest;return `<tr class="${isBest?'best':isWorst?'worst':''}"><td>${holdText(h)}${h.faces.join(',')===selected?' ✓':''}<span class="badge">${isBest?'BEST':isWorst?'WORST':''}</span></td><td>${pct(h.win)}</td><td>${pct(h.tie)}</td><td>${h.mean.toFixed(2)}</td><td>${pct(h.survive)}</td></tr>`;}).join('')}</tbody></table></div><p>Win = take the pot now. Tie = enter a playoff. Alive = win + tie. AVG. projects a completed five-dice score, even when play would end early as a bust. Identical dice holds are grouped. All holds assume advised play on later rolls. Ties are ranked as staying alive; these are not eventual playoff-win odds or bankroll-return estimates.</p>${advisor.future?'<p>Forecast: unplayed opponents minimize expected score. Actual computers adapt to posted scores; these odds are estimates.</p>':''}</div>`;
  $('useBest').onclick=()=>setSelection(best.indices);
}
function renderScoreOdds(){
  const first=$('oddsMode').value==='first';
  $('oddsPlayersLabel').hidden=!first;
  let known=[],future=0,context='';
  if(first){future=Number($('oddsPlayers').value)-1;context=`First to roll · ${future+1} players total`;}
  else{
    let seats=game.order;
    if(game.phase==='complete')seats=game.eligible();
    if(game.phase==='tie')seats=game.previous.playoffOrder;
    const fresh=['ready','complete','tie'].includes(game.phase);
    if(!seats.includes(0)||seats.length<2){$('scoreOddsBody').innerHTML='<p>You are not in the next playable field. Choose “First to roll” to explore another scenario.</p>';return;}
    const opponents=seats.filter(i=>i!==0);
    known=fresh?[]:opponents.filter(i=>Object.hasOwn(game.scores,i)).map(i=>game.scores[i]).filter(Number.isFinite);
    future=fresh?opponents.length:opponents.filter(i=>!Object.hasOwn(game.scores,i)).length;
    context=`${fresh?'Next pass': 'Current pass'} · ${future} opponent${future===1?'':'s'} with no posted score${known.length?' · posted: '+known.join(', '):''}`;
  }
  const rows=scoreOutcomes(known,future),target=Math.min(...known);
  const goals=[50,75,90].map(goal=>{const qualifying=rows.filter(r=>r.win+1e-12>=goal/100);return `${goal}% win chance: <b>${qualifying.length?'score '+qualifying.at(-1).score+' or less':'not achievable'}</b>`;});
  $('scoreOddsBody').innerHTML=`<p><b>${context}</b></p>${Number.isFinite(target)?`<p>Score below <b>${target}</b> to have a chance to win outright; match it to stay alive for a playoff.</p>`:''}<div class="score-examples">${[2,4].map(score=>`<div><small>FINISH WITH ${score}</small><strong>${pct(rows[score].win)}</strong><span>win outright</span></div>`).join('')}</div><p>${goals.join('<br>')}</p><div class="option-list"><table><thead><tr><th scope="col">FINAL SCORE</th><th scope="col">WIN</th><th scope="col">PLAYOFF</th><th scope="col">LOSE</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.score===2||r.score===4?'example-row':''}"><th scope="row">${r.score}</th><td>${pct(r.win)}</td><td>${pct(r.tie)}</td><td>${pct(r.lose)}</td></tr>`).join('')}</tbody></table></div><p>${future?'Estimated: opponents without scores are forecast independently using a minimum-expected-score strategy. Actual computers adapt to targets, so real odds can differ.':'All opponents have posted or busted; current-pass outcomes are certain.'} These odds assume you have already scored the listed total; they are not your chance of rolling it. “Playoff” means tying the lowest score, not eventually winning the pot. Live scenarios are hypothetical replacements for your score.</p>`;
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
