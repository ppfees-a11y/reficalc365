"use strict";
(()=>{
  document.querySelectorAll('.year').forEach(el=>el.textContent=String(new Date().getFullYear()));
  const $=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n), number=id=>Number($(id).value), pct=n=>`${n.toFixed(2)}%`;
  const valid=(...ns)=>ns.every(n=>Number.isFinite(n));
  const months=y=>Math.max(1,Math.round(y*12));
  function payment(p,rate,n){let r=rate/1200;return r===0?p/n:p*r/(1-Math.pow(1+r,-n));}
  function payoff(p,rate,n,extra=0){let r=rate/1200,base=payment(p,rate,n),balance=p,interest=0,rows=[],count=0;while(balance>0.00001&&count<n){let charge=balance*r,paid=Math.min(balance+charge,base+extra);balance=Math.max(0,balance-(paid-charge));interest+=charge;count++;if(count<=12)rows.push([count,paid,charge,paid-charge,balance]);}return {base,interest,months:count,rows};}
  function show(id,s){$(id).innerHTML=s;}
  function listen(form,fn){const el=$(form);if(!el)return;el.addEventListener('submit',e=>{e.preventDefault();try{fn();}catch(err){const out=el.parentElement.querySelector('.result');if(out)out.textContent='Please check your entries and try again.';}});}
  const positive=(...nums)=>valid(...nums)&&nums.every(n=>n>0);
  function core(){const p=number('balance'),old=number('oldRate'),ny=number('oldYears'),rate=number('newRate'),years=number('newYears'),cost=number('costs');if(!positive(p,ny,years)||!valid(old,rate,cost)||old<0||rate<0||old>50||rate>50||cost<0||ny>50||years>50)throw Error('Invalid mortgage inputs');let a=payoff(p,old,months(ny)),b=payoff(p,rate,months(years));return {p,old,ny,rate,years,cost,a,b};}
  listen('comparison',()=>{let {p,cost,a,b}=core();let savings=a.base-b.base,delta=a.interest-(b.interest+cost);show('comparisonResult',`<strong>Current monthly P&I:</strong> ${fmt(a.base)}<br><strong>New monthly P&I:</strong> ${fmt(b.base)}<br><strong>Monthly difference:</strong> ${fmt(savings)} ${savings>=0?'less':'more'} on the proposed loan<br><strong>Remaining interest, current:</strong> ${fmt(a.interest)}<br><strong>New interest plus upfront fees:</strong> ${fmt(b.interest+cost)}<br><strong>Estimated remaining cost difference:</strong> ${fmt(Math.abs(delta))} ${delta>=0?'less with refinance':'more with refinance'}.<br><small>Principal-and-interest only; different loan terms and principal balances over time matter.</small>`);let max=Math.max(a.base,b.base,1);$('comparisonBars').innerHTML=[['Current',a.base],['Refinance',b.base]].map(([label,v])=>`<div class="barrow"><span>${label}</span><div style="width:${(v/max*65).toFixed(1)}%"></div><b>${fmt(v)}</b></div>`).join('');$('schedule').innerHTML=b.rows.map(row=>`<tr>${row.map((v,i)=>`<td>${i?fmt(v):v}</td>`).join('')}</tr>`).join('');});
  listen('breakEven',()=>{let c=number('beCosts'),s=number('beSavings');if(!valid(c,s)||c<0)throw Error();show('beResult',s>0?`Simple break-even: <strong>${(c/s).toFixed(1)} months</strong> (${(c/s/12).toFixed(2)} years). This ignores principal-balance differences and other costs.`:'No positive simple break-even: monthly savings must be greater than zero.');});
  listen('cashOut',()=>{let v=number('homeValue'),b=number('cashBalance'),l=number('maxLtv'),fees=number('cashFees');if(!positive(v,l)||!valid(b,fees)||b<0||fees<0||l>100)throw Error();let limit=v*l/100,available=Math.max(0,limit-b-fees);show('cashResult',`Maximum loan at selected LTV: <strong>${fmt(limit)}</strong><br>Estimated cash after balance and costs: <strong>${fmt(available)}</strong><br>Actual program and underwriting limits may differ.`);});
  listen('points',()=>{let p=number('pointBalance'),r0=number('noPointRate'),r1=number('pointRate'),y=number('pointYears'),point=number('pointPct');if(!positive(p,y)||!valid(r0,r1,point)||r0<0||r1<0||r0>50||r1>50||point<0||point>20||y>50)throw Error();let a=payment(p,r0,months(y)),b=payment(p,r1,months(y)),saving=a-b,cost=p*point/100;show('pointResult',`Point charge: <strong>${fmt(cost)}</strong><br>Monthly P&I without points: ${fmt(a)}<br>With points: ${fmt(b)}<br>${saving>0?`Simple recovery period: <strong>${(cost/saving).toFixed(1)} months</strong>.`:'No positive monthly savings from this rate comparison.'}`);});
  listen('extra',()=>{let {p,rate,years}=core(),extra=number('extraAmount');if(!valid(extra)||extra<0)throw Error();let a=payoff(p,rate,months(years)),b=payoff(p,rate,months(years),extra);show('extraResult',`Regular payoff: <strong>${a.months} months</strong><br>With extra principal: <strong>${b.months} months</strong><br>Time saved: <strong>${a.months-b.months} months</strong><br>Estimated interest saved: <strong>${fmt(a.interest-b.interest)}</strong>.`);});
  listen('ltv',()=>{let p=number('ltvLoan'),v=number('ltvValue');if(!positive(v)||!valid(p)||p<0)throw Error();show('ltvResult',`Estimated LTV: <strong>${pct(p/v*100)}</strong><br>Estimated equity: <strong>${fmt(v-p)}</strong>. Lender valuation may differ.`);});
  if($('comparison'))$('comparison').requestSubmit();
})();

/* Refinance offer comparison: independent, same-horizon amortization */
(()=>{
 const f=document.getElementById('offerForm');if(!f)return;
 const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
 let csv='';
 const loan=(principal,annual,term,horizon)=>{
  const r=annual/1200,n=term,scheduled=r===0?principal/n:principal*r/(1-Math.pow(1+r,-n));
  let bal=principal,totalInterest=0,totalPaid=0,rows=[];
  for(let m=1;m<=horizon;m++){
   const interest=bal*r,pay=bal>0?Math.min(scheduled,bal+interest):0,principalPaid=pay-interest;
   bal=Math.max(0,bal-principalPaid);totalInterest+=interest;totalPaid+=pay;
   rows.push({month:m,pay,interest,principal:principalPaid,balance:bal});
  }
  return {scheduled,totalInterest,totalPaid,balance:bal,rows};
 };
 const quote=(prefix,hasCosts)=>{
  const principal=Number($(prefix+'Balance').value),rate=Number($(prefix+'Rate').value),term=Number($(prefix+'Months').value),costs=hasCosts?Number($(prefix+'Costs').value):0;
  if(![principal,rate,term,costs].every(Number.isFinite)||principal<=0||rate<0||rate>50||!Number.isInteger(term)||term<1||term>600||costs<0)throw Error('Enter valid loan amounts, rates, months and costs.');
  return {principal,rate,term,costs};
 };
 const esc=v=>'"'+String(v).replaceAll('"','""')+'"';
 f.addEventListener('submit',e=>{
  e.preventDefault();try{
   const hold=Number($('ocHold').value);if(!Number.isInteger(hold)||hold<1||hold>600)throw Error('Holding period must be 1–600 whole months.');
   const inputs=[quote('oc',false),quote('oa',true),quote('ob',true)];
   const results=inputs.map(q=>({...q,...loan(q.principal,q.rate,q.term,hold)}));
   const row=(name,fn)=>'<tr><th scope="row">'+name+'</th>'+results.map(x=>'<td>'+fn(x)+'</td>').join('')+'</tr>';
   $('offerTable').innerHTML=row('Scheduled monthly P&I',x=>money(x.scheduled))+row('Interest paid in holding period',x=>money(x.totalInterest))+row('Upfront costs',x=>money(x.costs))+row('Interest + upfront costs',x=>money(x.totalInterest+x.costs))+row('Principal paid in period',x=>money(x.totalPaid-x.totalInterest))+row('Balance still owed',x=>money(x.balance));
   const cheapest=Math.min(...results.map(x=>x.totalInterest+x.costs));
   $('offerResult').textContent='Lowest interest-plus-upfront-cost estimate over '+hold+' months: '+['Keep current','Offer A','Offer B'][results.findIndex(x=>Math.abs(x.totalInterest+x.costs-cheapest)<0.000001)]+'. Review remaining balance and monthly affordability before deciding.';
   const header=['Month',...['Current','Offer A','Offer B'].flatMap(n=>[n+' payment',n+' interest',n+' principal',n+' remaining balance'])];
   const data=[header,...Array.from({length:hold},(_,i)=>[i+1,...results.flatMap(x=>{const v=x.rows[i];return [v.pay,v.interest,v.principal,v.balance].map(z=>z.toFixed(2));})])];
   csv=data.map(r=>r.map(esc).join(',')).join('\r\n');$('downloadOffer').disabled=false;
  }catch(err){$('offerResult').textContent=err.message;$('offerTable').textContent='';$('downloadOffer').disabled=true;csv='';}
 });
 $('downloadOffer').addEventListener('click',()=>{
  if(!csv)return;const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='reficalc365-offer-comparison.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 f.requestSubmit();
})();
