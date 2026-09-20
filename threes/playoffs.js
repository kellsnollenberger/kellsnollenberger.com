import {createAdvisor,rolls} from './engine.js?v=7';

// Exact enumeration under the existing computer policy. This is a specified
// continuation model, not a Nash equilibrium or a globally optimal policy.
const distributions=new Map(),models=new Map();
export function policyDistribution(target=Infinity,future=0){
  const key=`${target}/${future}`;
  if(distributions.has(key))return distributions.get(key);
  const advisor=createAdvisor(Number.isFinite(target)?[target]:[],future),memo=new Map();
  function distribution(n,score){
    const key=n*31+score;
    if(memo.has(key))return memo.get(key);
    const result=new Float64Array(31);
    if(!n){result[score]=1;return result;}
    for(const roll of rolls[n]){
      let best=null,value=null;
      for(const hold of roll.options){const next=advisor.state(n-hold.count,score+hold.sum);if(!best||advisor.compare(next,value)<0){best=hold;value=next;}}
      const d=distribution(n-best.count,score+best.sum);
      for(let s=0;s<31;s++)result[s]+=roll.prob*d[s];
    }
    memo.set(key,result);return result;
  }
  const result=distribution(5,0);distributions.set(key,result);return result;
}
const members=(mask,n)=>Array.from({length:n},(_,i)=>i).filter(i=>mask&(1<<i));
function add(map,key,p){map.set(key,(map.get(key)??0)+p);}

export function roundTransitions(n){
  let states=new Map();
  policyDistribution(Infinity,n-1).forEach((p,s)=>{if(p)states.set(s*32+1,p);});
  for(let seat=1;seat<n;seat++){
    const next=new Map();
    for(const [key,p] of states){
      const low=Math.floor(key/32),mask=key%32,d=policyDistribution(low,n-seat-1);
      for(let s=0;s<31;s++)if(d[s])add(next,s<low?s*32+(1<<seat):low*32+(s===low?mask|(1<<seat):mask),p*d[s]);
    }
    states=next;
  }
  const result=new Map();for(const [key,p] of states)add(result,key%32,p);return result;
}

// V(P) = winProbability * P + ante * adjustment, with current antes sunk.
// Full-field ties reverse every seat and return to the same game size, so
// solve each pair analytically. Smaller tied subsets have already been solved.
export function playoffModel(n){
  if(!Number.isInteger(n)||n<2||n>5)throw new Error('Playoffs require 2–5 players.');
  if(models.has(n))return models.get(n);
  const transitions=roundTransitions(n),full=(1<<n)-1,t=transitions.get(full)??0;
  const solve=constants=>constants.map((x,i)=>(x+t*constants[n-1-i])/(1-t*t));
  const winBase=Array(n).fill(0);
  for(const [mask,p] of transitions){
    if(mask===full)continue;
    const tied=members(mask,n);
    if(tied.length===1){winBase[tied[0]]+=p;continue;}
    const sub=playoffModel(tied.length);
    tied.forEach((seat,rank)=>winBase[seat]+=p*sub.win[tied.length-1-rank]);
  }
  const win=solve(winBase),adjustBase=Array(n).fill(0),antesBase=Array(n).fill(0);
  for(const [mask,p] of transitions){
    const tied=members(mask,n),m=tied.length;if(m===1)continue;
    tied.forEach((seat,rank)=>{
      const next=m-1-rank;
      if(mask===full){adjustBase[seat]+=p*(n*win[next]-1);antesBase[seat]+=p;}
      else{const sub=playoffModel(m);adjustBase[seat]+=p*(m*sub.win[next]+sub.adjustment[next]-1);antesBase[seat]+=p*(1+sub.extraAntes[next]);}
    });
  }
  const model={n,win,adjustment:solve(adjustBase),extraAntes:solve(antesBase),fullTie:t,transitions};
  models.set(n,model);return model;
}

// Conditional values once hero posts a score. Only branches where hero is
// still tied for the low score need expansion; a lower score is a final loss.
export function playoffScoreValues({order,hero,scores={},pot,ante,paid=0}){
  if(!order.includes(hero)||order.length<2||order.length>5||ante<=0)throw new Error('Invalid playoff scenario.');
  const earlier=order.filter(i=>i!==hero&&Object.hasOwn(scores,i)),unknown=order.filter(i=>i!==hero&&!Object.hasOwn(scores,i));
  const target=Math.min(...earlier.map(i=>scores[i]));
  return Array.from({length:31},(_,score)=>{
    const result={mean:score,win:0,tie:0,survive:0,eventual:0,viaPlayoff:0,extraCost:0,ev:-paid};
    if(score>target)return result;
    const initial=order.reduce((mask,id,i)=>id===hero||(earlier.includes(id)&&scores[id]===score)?mask|(1<<i):mask,0);
    let branches=new Map([[initial,1]]);
    for(let at=0;at<unknown.length;at++){
      const id=unknown[at],seat=order.indexOf(id),d=policyDistribution(score,unknown.length-at-1),equal=d[score],above=d.slice(score+1).reduce((a,b)=>a+b,0),next=new Map();
      for(const [mask,p] of branches){if(above)add(next,mask,p*above);if(equal)add(next,mask|(1<<seat),p*equal);}
      branches=next;
    }
    for(const [mask,p] of branches){
      const tied=members(mask,order.length),m=tied.length;
      if(m===1){result.win+=p;result.eventual+=p;result.ev+=p*pot;continue;}
      const position=m-1-tied.indexOf(order.indexOf(hero)),model=playoffModel(m),w=model.win[position];
      result.tie+=p;result.eventual+=p*w;result.viaPlayoff+=p*w;
      result.extraCost+=p*ante*(1+model.extraAntes[position]);
      result.ev+=p*(w*(pot+m*ante)+ante*model.adjustment[position]-ante);
    }
    result.survive=result.win+result.tie;return result;
  });
}

export function createEVAdvisor(context){
  const known=context.order.filter(i=>i!==context.hero&&Object.hasOwn(context.scores,i)).map(i=>context.scores[i]);
  const future=context.order.filter(i=>i!==context.hero&&!Object.hasOwn(context.scores,i)).length;
  return createAdvisor(known,future,playoffScoreValues(context));
}

// Forecast the current pass from posted scores, before remaining players roll.
// Unplayed turns use the same position-aware policy as the computer players.
export function liveRoundChances({order,hero,scores={},pot,ante,paid=0}){
  const result={win:0,tie:0,eventual:0,ev:-paid};
  if(!order.includes(hero))return {...result,lose:1};
  let low=Infinity,mask=0;
  order.forEach((id,i)=>{if(!Object.hasOwn(scores,id)||!Number.isFinite(scores[id]))return;if(scores[id]<low){low=scores[id];mask=1<<i;}else if(scores[id]===low)mask|=1<<i;});
  let states=new Map([[low*32+mask,1]]);
  const pending=order.filter(id=>!Object.hasOwn(scores,id));
  pending.forEach((id,at)=>{
    const next=new Map(),seat=order.indexOf(id);
    for(const [key,p] of states){
      const target=Number.isFinite(key)?Math.floor(key/32):Infinity,leaders=Number.isFinite(key)?key%32:0;
      const d=policyDistribution(target,pending.length-at-1);
      d.forEach((prob,score)=>{if(prob)add(next,score<target?score*32+(1<<seat):target*32+(score===target?leaders|(1<<seat):leaders),p*prob);});
    }
    states=next;
  });
  const heroSeat=order.indexOf(hero);
  for(const [key,p] of states){
    if(!Number.isFinite(key))continue;
    const tied=members(key%32,order.length);
    if(!tied.includes(heroSeat))continue;
    if(tied.length===1){result.win+=p;result.eventual+=p;result.ev+=p*pot;}
    else{
      const n=tied.length,position=n-1-tied.indexOf(heroSeat),model=playoffModel(n),w=model.win[position];
      result.tie+=p;result.eventual+=p*w;
      result.ev+=p*(w*(pot+n*ante)+ante*model.adjustment[position]-ante);
    }
  }
  return {...result,lose:Math.max(0,1-result.win-result.tie)};
}
