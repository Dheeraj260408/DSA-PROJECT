const $=id=>document.getElementById(id),rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const PRE=["Smoky","Spicy","Creamy","Crispy","Royal","Street-style","Tandoori","Coastal","Home-style","Garlic","Butter","Chilli"];
const DISH=["Paneer","Chicken","Dal","Biryani","Dosa","Noodles","Kebab","Curry","Momos","Thali","Wrap","Tikka"];
const COMBOS=PRE.flatMap(p=>DISH.map(d=>p+" "+d));
let mode="sorted",size=15,G,T=null,best=0;
function pick(sel,attr,cb){document.querySelectorAll(sel+" button").forEach(b=>b.onclick=()=>{document.querySelectorAll(sel+" button").forEach(x=>x.setAttribute("aria-pressed",x===b));cb(b.dataset[attr])})}
pick("#sizes","n",v=>size=+v);pick("#modes","m",v=>mode=v);
$("go").onclick=start;$("again").onclick=()=>{$("end").hidden=true;$("start").hidden=false};
$("tip").onclick=tip;$("fin").onclick=()=>finish("You closed the tab.");
$("budget").onkeydown=e=>{if(e.key==="Enter")start()};
const left=()=>G.budget-G.spent;

function start(){
  const B=parseInt($("budget").value,10);
  if(!B||B<100||B>3000){$("err").textContent="Enter a budget between ₹100 and ₹3000.";return}
  $("err").textContent="";
  const prices=new Set();while(prices.size<size)prices.add(rnd(6,99)*10);
  const names=shuffle([...COMBOS]).slice(0,size);
  const sorted=[...prices].sort((a,b)=>a-b).map((p,i)=>({price:p,name:names[i]}));
  const items=mode==="sorted"?sorted:shuffle([...sorted]);
  const dp=new Array(B+1).fill(false);dp[0]=true;
  for(let v=1;v<=B;v++)for(const it of sorted)if(it.price<=v&&dp[v-it.price]){dp[v]=true;break}
  let mx=B;while(!dp[mx])mx--;
  G={budget:B,items,seen:{},checks:0,spent:0,order:[],tips:5,time:90,sel:null,hint:null,locked:false,max:mx};
  $("start").hidden=true;$("game").hidden=false;
  $("menu").innerHTML="";$("menu").scrollTop=0;
  items.forEach((it,i)=>{const b=document.createElement("button");b.className="row";b.innerHTML=`<span class="n">${i+1}</span><span class="nm">${it.name}</span><span class="pr">₹ ???</span>`;b.onclick=()=>inspect(i);$("menu").appendChild(b)});
  $("panel").textContent="Tap a dish to check its price.";
  clearInterval(T);T=setInterval(tick,1000);paint();
}
function range(){let lo=0,hi=G.items.length-1;
  G.items.forEach((it,i)=>{if(!G.seen[i])return;if(it.price<=left())lo=Math.max(lo,i);else hi=Math.min(hi,i-1)});return[lo,hi]}
function paint(){
  const rows=$("menu").children,s=mode==="sorted",[lo,hi]=range();
  G.items.forEach((it,i)=>{const r=rows[i],k=G.seen[i],ok=it.price<=left();
    r.className="row"+(s&&i>hi?" out":"")+(s&&i<lo?" below":"")+(k?(ok?" yes":" no"):"")+(G.sel===i?" sel":"")+(G.hint===i?" hint":"");
    r.querySelector(".pr").textContent=k?`₹${it.price} ${ok?"✓":"✗"}`:"₹ ???"});
  $("hBud").textContent="Budget ₹"+G.budget;$("hSpent").textContent="Spent ₹"+G.spent;$("hLeft").textContent="Left ₹"+left();$("hTime").textContent="⏱ "+G.time+"s";
  $("fill").style.width=(G.spent/G.budget*100)+"%";
  $("tm").style.width=(G.time/90*100)+"%";$("tm").className=G.time<=20?"low":"";
  $("rng").textContent=s?`Could still be the priciest: ${Math.max(0,hi-lo+1)} of ${G.items.length} dishes · checks: ${G.checks}`:`Checked ${G.checks} of ${G.items.length} dishes`;
  $("tip").textContent=s?`Midpoint tip (${G.tips})`:"No tips on a messy menu";$("tip").disabled=!s||G.tips<=0||G.locked;
  const cnt={};G.order.forEach(o=>cnt[o.name]=(cnt[o.name]||0)+1);
  $("tab").innerHTML="<b>Your order</b>"+(G.order.length?Object.keys(cnt).map(n=>`${cnt[n]} × ${n} · ₹${G.order.find(o=>o.name===n).price*cnt[n]}`).join("<br>"):"Nothing ordered yet.");
}
function inspect(i){
  if(G.locked)return;const s=mode==="sorted",[lo,hi]=range();
  if(s&&i>hi)return;
  const it=G.items[i];G.sel=i;G.hint=null;
  if(!G.seen[i]){G.seen[i]=true;G.checks++}
  const ok=it.price<=left(),p=$("panel");
  p.innerHTML=`<b>${it.name}</b>: ₹${it.price}. <span class="${ok?"good":"bad"}">${ok?"You can afford it.":"₹"+(it.price-left())+" over what’s left."}</span>`;
  if(ok){const b=document.createElement("button");b.className="btn";b.textContent="Order this dish";b.onclick=()=>order(i);p.append(document.createElement("br"),b)}
  paint();checkStuck();
}
function order(i){
  if(G.locked)return;const it=G.items[i];
  if(it.price>left())return;
  G.spent+=it.price;G.order.push(it);G.sel=null;G.hint=null;
  $("panel").innerHTML=`Ordered <b>${it.name}</b>. You have <b>₹${left()}</b> left. Find the next dish.`;
  toast("+ "+it.name);paint();checkStuck();
}
function checkStuck(){
  if(G.locked)return;
  if(left()===0)return finish("You spent every rupee!");
  if(mode==="sorted"){const[lo,hi]=range();if(hi<lo)finish("Nothing on the menu fits what’s left.")}
  else if(G.items.every((it,i)=>G.seen[i]&&it.price>left()))finish("You checked every dish: nothing fits what’s left.");
}
function tip(){
  if(G.locked||G.tips<=0||mode!=="sorted")return;
  const[lo,hi]=range();let m=Math.floor((lo+hi)/2);if(G.seen[m])m=Math.ceil((lo+hi)/2);
  if(G.seen[m]){$("panel").textContent="Nothing left to split. Order the priciest dish you know you can afford.";return}
  G.tips--;G.hint=m;
  $("panel").textContent=`Middle of dishes ${lo+1} to ${hi+1} is dish #${m+1}. Check it to cut the range in half.`;
  paint();$("menu").scrollTop=$("menu").children[m].offsetTop-$("menu").clientHeight/2;
}
function tick(){if(G.locked)return;G.time--;paint();if(G.time<=0)finish("Time’s up!")}
function finish(msg){
  if(G.locked)return;G.locked=true;clearInterval(T);
  const n=G.items.length,fill=G.max?G.spent/G.max:0;
  const eff=Math.round(300*Math.max(0,1-G.checks/n));
  const score=Math.round(fill*600)+eff+G.time*3;
  const newBest=score>best;best=Math.max(best,score);
  $("game").hidden=true;$("end").hidden=false;
  $("eScore").textContent="⭐ "+score;
  $("eStats").innerHTML=`<div><b>₹${G.spent} of ₹${G.budget}</b>spent</div><div><b>₹${G.max}</b>most you could have spent</div><div><b>${G.checks} of ${n}</b>dishes checked</div><div><b>${G.order.length}</b>dishes ordered</div>`;
  $("eMsg").textContent=msg+" "+(newBest?"New session high score! ":"")+(mode==="sorted"?`Sorted menus let you halve the search: about ${Math.ceil(Math.log2(n+1))} checks to find the priciest dish that fits, instead of up to ${n}.`:"On an unsorted menu you may need to check nearly every dish. Try the sorted menu to compare.");
  $("hi").textContent="High score this session: "+best;
}
function toast(m){const t=$("toast");t.textContent=m;t.className="";void t.offsetWidth;t.className="show"}
