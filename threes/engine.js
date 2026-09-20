export const points = face => face === 3 ? 0 : face;
const factorial = [1,1,2,6,24,120];
const rolls = Array.from({length:6},()=>[]);
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
// Translation-invariant exact minimum-mean policy; full terminal distribution.
export const baseline = [Array(31).fill(0)]; baseline[0][0]=1;
const means=[0];
for(let n=1;n<=5;n++){
  const dist=Array(31).fill(0);
  for(const roll of rolls[n]){
    const best=roll.options.reduce((a,b)=>b.sum+means[n-b.count]<a.sum+means[n-a.count]-1e-12?b:a);
    baseline[n-best.count].forEach((p,s)=>{if(p)dist[s+best.sum]+=p*roll.prob;});
  }
  baseline[n]=dist;means[n]=dist.reduce((s,p,i)=>s+p*i,0);
}
// A tied low score reaches a playoff; it does not receive a share of the pot.
export function isBust(score,target,dice=[]){
  return Number.isFinite(target) && (score>target || (dice.length>0 && score+Math.min(...dice.map(points))>target));
}
export function createAdvisor(known=[],future=0){
  known=known.filter(Number.isFinite);
  const target=known.length?Math.min(...known):Infinity;
  const objective=known.length?'survive':'mean', memo=new Map();
  const terminal=Array.from({length:31},(_,score)=>{
    if(score>target)return {survive:0,mean:score,win:0,tie:0};
    const tied=score===target;
    const equal=baseline[5][score],above=baseline[5].slice(score+1).reduce((a,b)=>a+b,0);
    const survive=(equal+above)**future,win=tied?0:above**future;
    return {survive,mean:score,win,tie:Math.max(0,survive-win)};
  });
  function compare(a,b){return objective==='mean'?(a.mean-b.mean||b.survive-a.survive):(Math.abs(a.survive-b.survive)>1e-12?b.survive-a.survive:Math.abs(a.win-b.win)>1e-12?b.win-a.win:a.mean-b.mean);}
  function state(n,score){
    if(!n)return terminal[score];
    const key=n*31+score;if(memo.has(key))return memo.get(key);
    const result={survive:0,mean:0,win:0,tie:0};
    for(const roll of rolls[n]){
      let best=null;
      for(const h of roll.options){const value=state(n-h.count,score+h.sum);if(!best||compare(value,best)<0)best=value;}
      for(const key of Object.keys(result))result[key]+=best[key]*roll.prob;
    }
    memo.set(key,result);return result;
  }
  return {target,objective,known:[...known],future,terminal,state,analyze(dice,score){return holds(dice).map(h=>({...h,...state(dice.length-h.count,score+h.sum)})).sort(compare);}};
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
