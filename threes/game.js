import {points,createAdvisor,rotateOrder,settle,rollDice,isBust} from './engine.js?v=9';
import {createEVAdvisor} from './playoffs.js?v=9';
const names=['You','Mara','Jules','Theo','Rae'];
export class Game {
  constructor(bank=10000,count=3,ante=500,random=Math.random){
    if(!Number.isInteger(bank)||!Number.isInteger(ante)||ante<1||bank<ante||![2,3,4,5].includes(count))throw new Error('Invalid table settings.');
    Object.assign(this,{players:names.slice(0,count).map(name=>({name,bank})),ante,random,leader:0,round:0,playoff:0,order:rotateOrder(count,0),cursor:0,scores:{},busts:{},pot:0,dice:[],locked:[],selection:new Set(),phase:'ready',advisor:null,options:[],history:[],previous:null,paid:[],bustReason:''});
  }
  active(){return this.order[this.cursor];}
  eligible(){return this.players.map((p,i)=>i).filter(i=>this.players[i].bank>=this.ante);}
  startRound(){
    if(!['ready','complete'].includes(this.phase))return;
    const seats=this.eligible();if(!seats.includes(0)||seats.length<2)return;
    this.order=rotateOrder(this.players.length,this.leader,seats);this.paid=this.players.map(()=>0);this.pot=0;this.round++;this.playoff=0;
    this.collectAnte(this.order);this.startPass();
  }
  collectAnte(seats){
    if(seats.some(i=>this.players[i].bank<this.ante))throw new Error('Not enough bankroll to ante.');
    seats.forEach(i=>{this.players[i].bank-=this.ante;this.paid[i]+=this.ante;this.pot+=this.ante;});
  }
  playoffShortfall(){return this.phase==='tie'?this.previous.playoffOrder.filter(i=>this.players[i].bank<this.ante):[];}
  startPlayoff(){
    if(this.phase!=='tie'||this.playoffShortfall().length)return;
    const next=[...this.previous.playoffOrder];this.collectAnte(next);this.order=next;this.playoff++;this.startPass();
  }
  startPass(){this.scores={};this.busts={};this.cursor=0;this.phase='turn';this.previous=null;this.beginTurn();}
  beginTurn(){
    this.locked=[];this.selection.clear();this.dice=[];this.options=[];this.bustReason='';
    this.advisor=this.active()===0?createEVAdvisor({order:this.order,hero:0,scores:this.scores,pot:this.pot,ante:this.ante,paid:this.paid[0]}):createAdvisor(this.order.slice(0,this.cursor).map(i=>this.scores[i]),this.order.length-this.cursor-1);
    if(this.active()===0)this.rollHuman();
  }
  bust(score,forced=false){
    this.scores[this.active()]=Infinity;this.busts[this.active()]=true;
    this.bustReason=forced?`Even the lowest die would take the score above ${this.advisor.target}.`:`Locked score ${score} is above ${this.advisor.target}.`;
    this.phase='bust';this.selection.clear();this.options=[];
  }
  rollHuman(){
    const score=this.locked.reduce((s,f)=>s+points(f),0);this.dice=rollDice(5-this.locked.length,this.random);
    if(isBust(score,this.advisor.target,this.dice)){this.bust(score,true);return;}
    this.options=this.advisor.analyze(this.dice,score);
  }
  computerTurn(){
    if(this.phase!=='turn'||this.active()===0)return;
    let left=5,total=0;
    while(left){
      const r=rollDice(left,this.random);this.dice=[...r];
      if(isBust(total,this.advisor.target,r)){this.bust(total,true);return;}
      const best=this.advisor.analyze(r,total)[0];total+=best.sum;left-=best.count;this.locked.push(...best.faces);
      if(isBust(total,this.advisor.target)){this.bust(total);return;}
    }
    this.scores[this.active()]=total;this.advance();
  }
  advance(){
    this.phase='turn';this.cursor++;
    if(this.cursor<this.order.length){this.beginTurn();return;}
    this.previous=settle(this.order,this.scores,this.pot);
    this.dice=[];this.selection.clear();this.options=[];
    if(this.previous.playoffOrder.length){this.phase='tie';return;}
    this.previous.awards.forEach(a=>this.players[a.id].bank+=a.cents);this.leader=this.previous.leader;
    const mine=this.previous.awards.find(a=>a.id===0)?.cents??0;
    this.history.unshift({round:this.round,playoffs:this.playoff,low:this.previous.low,winners:this.players[this.leader].name,net:mine-this.paid[0],payout:this.pot});
    this.phase='complete';
  }
  holdSelected(){
    if(this.phase!=='turn'||this.active()!==0||!this.selection.size)return;
    this.locked.push(...this.dice.filter((_,i)=>this.selection.has(i)));this.selection.clear();
    const score=this.locked.reduce((s,f)=>s+points(f),0);
    if(isBust(score,this.advisor.target)){this.bust(score);return;}
    if(this.locked.length===5){this.scores[0]=score;this.advance();}else this.rollHuman();
  }
  setSelection(indices){
    if(this.phase!=='turn'||this.active()!==0)throw new Error('Wait for your turn.');
    if(!Array.isArray(indices)||indices.some(i=>!Number.isInteger(i)||i<0||i>=this.dice.length)||new Set(indices).size!==indices.length)throw new Error('Use unique indices for dice in this roll.');
    this.selection=new Set(indices);
  }
  action(){if(this.phase==='ready'||this.phase==='complete')this.startRound();else if(this.phase==='tie')this.startPlayoff();else if(this.phase==='bust')this.advance();else if(this.active()===0)this.holdSelected();else this.computerTurn();}
  snapshot(){return {phase:this.phase,round:this.round,playoff:this.playoff,players:this.players.map(p=>({...p})),anteCents:this.ante,potCents:this.phase==='complete'?0:this.pot,turnOrder:this.order.map(i=>this.players[i].name),currentPlayer:['turn','bust'].includes(this.phase)?this.players[this.active()].name:null,scores:Object.fromEntries(Object.entries(this.scores).map(([i,s])=>[i,Number.isFinite(s)?s:'bust'])),dice:[...this.dice],locked:[...this.locked],selectedIndices:[...this.selection],nextLeader:this.players[this.leader].name,playoffOrder:this.previous?.playoffOrder.map(i=>this.players[i].name)??[]};}
}
