export const points = face => face === 3 ? 0 : face;
const factorial = [1,1,2,6,24,120];
export const rolls = Array.from({length:6},()=>[]);
export function holds(dice) {
  const unique = new Map();
  for(let mask=1;mask<(1<<dice.length);mask++){
    const indices=dice.map((_,i)=>i).filter(i=>mask&(1<<i));
    const faces=indices.map(i=>dice[i]).sort((a,b)=>a-b),key=faces.join(',');
    if(!unique.has(key)) unique.set(key,{indices,faces,count:faces.length,sum:faces.reduce((s,f)=>s+points(f),0)});
  }
  return [...unique.values()];
}
for(let n=1;n<=5;n++){
  function enumerate(dice,min){
    if(dice.length===n){const counts=Array(7).fill(0);dice.forEach(f=>counts[f]++);rolls[n].push({prob:factorial[n]/counts.reduce((p,c)=>p*factorial[c],1)/6**n,options:holds(dice)});return;}
    for(let f=min;f<=6;f++)enumerate([...dice,f],f);
  }
  enumerate([],1);
}
// Full-score dynamic program: five sixes (raw total 30) scores zero.
export const finalScore = score => score===30?0:score;
export const scoreDice = dice => finalScore(dice.reduce((s,f)=>s+points(f),0));
const meanMemo=new Map();
function meanDistribution(n,score){
  const key=n*31+score;if(meanMemo.has(key))return meanMemo.get(key);
  const dist=Array(31).fill(0);
  if(!n){dist[finalScore(score)]=1;return dist;}
  for(const roll of rolls[n]){
    let best,mean=Infinity;
    for(const hold of roll.options){
      const d=meanDistribution(n-hold.count,score+hold.sum),m=d.reduce((v,p,i)=>v+p*i,0);
      if(m<mean-1e-12){mean=m;best=d;}
    }
    best.forEach((p,i)=>dist[i]+=p*roll.prob);
  }
  meanMemo.set(key,dist);return dist;
}
export const baseline=Array.from({length:6},(_,n)=>meanDistribution(n,0));
// A tied low score reaches a playoff; it does not receive a share of the pot.
export function isBust(score,target,dice=[],locked=null){
  if(locked&&locked.every(f=>f===6)&&(locked.length===5||!dice.length||dice.includes(6)))return false;
  return Number.isFinite(target) && (score>target || (dice.length>0 && score+Math.min(...dice.map(points))>target));
}
export function createAdvisor(known=[],future=0,terminalValues=null){
  known=known.filter(Number.isFinite);
  const target=known.length?Math.min(...known):Infinity;
  const objective=terminalValues?'ev':known.length?'survive':'mean', memo=new Map();
  const terminal=terminalValues??Array.from({length:31},(_,score)=>{
    if(score>target)return {survive:0,mean:score,win:0,tie:0};
    const tied=score===target;
    const equal=baseline[5][score],above=baseline[5].slice(score+1).reduce((a,b)=>a+b,0);
    const survive=(equal+above)**future,win=tied?0:above**future;
    return {survive,mean:score,win,tie:Math.max(0,survive-win)};
  });
  function compare(a,b){if(objective==='ev')return Math.abs(a.ev-b.ev)>1e-8?b.ev-a.ev:Math.abs(a.eventual-b.eventual)>1e-12?b.eventual-a.eventual:a.mean-b.mean;return objective==='mean'?(a.mean-b.mean||b.survive-a.survive):(Math.abs(a.survive-b.survive)>1e-12?b.survive-a.survive:Math.abs(a.win-b.win)>1e-12?b.win-a.win:a.mean-b.mean);}
  const fields=Object.keys(terminal[0]);
  function state(n,score){
    if(!n)return terminal[finalScore(score)];
    const key=n*31+score;if(memo.has(key))return memo.get(key);
    const result=Object.fromEntries(fields.map(key=>[key,0]));
    for(const roll of rolls[n]){
      let best=null;
      for(const h of roll.options){const value=state(n-h.count,score+h.sum);if(!best||compare(value,best)<0)best=value;}
      for(const key of fields)result[key]+=best[key]*roll.prob;
    }
    memo.set(key,result);return result;
  }
  return {target,objective,known:[...known],future,terminal,state,compare,analyze(dice,score){return holds(dice).map(h=>({...h,...state(dice.length-h.count,score+h.sum)})).sort(compare);}};
}
export function rotateOrder(count,leader,eligible=Array.from({length:count},(_,i)=>i)){
  return Array.from({length:count},(_,i)=>(leader+i)%count).filter(i=>eligible.includes(i));
}
export function settle(order,scores,pot){
  const low=Math.min(...order.map(i=>scores[i])),winners=order.filter(i=>scores[i]===low);
  if(!Number.isFinite(low))throw new Error('A round must have at least one posted score.');
  const tied=winners.length>1;
  return {low,winners,leader:tied?null:winners[0],playoffOrder:tied?[...winners].reverse():[],awards:tied?[]:[{id:winners[0],cents:pot}]};
}
export function rollDice(n,random=Math.random){return Array.from({length:n},()=>1+Math.floor(random()*6));}

// Conditional outcomes for an already-posted total under the same forecast as holds.
export function scoreOutcomes(known=[],future=0){
  if(!Number.isInteger(future)||future<0||future>4)throw new Error('Use zero to four unplayed opponents.');
  const advisor=createAdvisor(known,future);
  return advisor.terminal.map((value,score)=>({score,win:Math.max(0,Math.min(1,value.win)),tie:Math.max(0,Math.min(1,value.tie)),lose:Math.max(0,Math.min(1,1-value.survive))}));
}
