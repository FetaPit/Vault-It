const fs=require('fs'); let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const html=fs.readFileSync('/home/user/Vault-It/index.html','utf8');
const code=html.split('// <<HB_MORTGAGE_ENGINE')[1].split('// HB_MORTGAGE_ENGINE>>')[0];
const E=new Function(code+';return{hbSimulate,hbPmt,hbEquityAt,hbCompare,hbAddMonths};')();
const near=(a,b,t)=>Math.abs(a-b)<=t;
const base={loan:200000,termMonths:300,start:'2026-11-01',products:[{months:null,type:'fixed',rate:5}],interestMode:'monthly'};
// 1 golden: £200k, 25y, 5% → £1,169.18/mo, interest £150,754
let s=E.hbSimulate(base);
ok(near(s.payment0,1169.18,0.02),'£200k/25y/5% payment £1,169.18 (got '+s.payment0.toFixed(2)+')');
ok(near(s.totalInterest,150753.9,2),'total interest ≈ £150,754 (got '+s.totalInterest.toFixed(0)+')');
ok(s.months===300&&s.schedule[299].close===0,'repaid exactly at the end of the term');
ok(near(s.schedule.reduce((a,r)=>a+r.principal,0),200000,0.5),'Σ principal = loan');
// 2 independent closed-form check: £5,000 lump at the start, payment kept → n = −ln(1 − B·r/P)/ln(1+r)
const hb={loan:180500,termMonths:300,start:'2026-11-01',products:[{months:null,type:'fixed',rate:5}],interestMode:'monthly'};
const h0=E.hbSimulate(hb),h1=E.hbSimulate({...hb,over:{lumps:[{month:1,amount:5000}]}});
const r=0.05/12,P=h0.payment0,Bn=175500,nCF=-Math.log(1-Bn*r/P)/Math.log(1+r);
ok(near(P,1055,2),'payment ≈ £1,055 (the Halifax worked example)');
ok(near(h1.months,Math.ceil(nCF),1),'term after the lump matches the closed-form annuity formula ('+h1.months+' vs '+nCF.toFixed(1)+' months)');
const cfInt=(P*(nCF-1)+Bn*(1+r)**0*0)+0; // total paid ≈ P*n ; interest = P*n − Bn
const cfSaved=(h0.totalPaid-h0.opts.loan)-(P*nCF-Bn);
ok(near(h0.totalInterest-h1.totalInterest,cfSaved,150),'interest saved matches the closed form (£'+(h0.totalInterest-h1.totalInterest).toFixed(0)+' vs £'+cfSaved.toFixed(0)+')');
// 3 properties
const ov=E.hbSimulate({...base,over:{monthly:200}});
ok(ov.months<s.months&&ov.totalInterest<s.totalInterest,'monthly overpayment cuts term and interest');
ok(ov.schedule.every(r=>r.close>=0),'balance never negative');
ok(near(ov.schedule.reduce((a,r)=>a+r.principal+r.overpay,0),200000,0.5),'principal + overpayments = loan');
const oa=E.hbSimulate({...base,over:{monthly:100}}),ob=E.hbSimulate({...base,over:{monthly:300}});
ok(ob.months<oa.months&&oa.months<s.months,'more overpayment → shorter term (monotone)');
// payment reduction keeps the term
const pr=E.hbSimulate({...base,outcome:'payment',over:{lumps:[{month:1,amount:20000}]}});
ok(pr.months>=299&&pr.payment0<s.payment0,'"reduce payment" keeps the term but lowers the payment ('+pr.payment0.toFixed(0)+' vs '+s.payment0.toFixed(0)+')');
// interest modes
const dly=E.hbSimulate({...base,interestMode:'daily'}),ann=E.hbSimulate({...base,interestMode:'annual',over:{monthly:200}}),dly2=E.hbSimulate({...base,interestMode:'daily',over:{monthly:200}});
ok(near(dly.totalInterest,s.totalInterest,s.totalInterest*0.02),'daily vs monthly interest within 2% ('+dly.totalInterest.toFixed(0)+' vs '+s.totalInterest.toFixed(0)+')');
ok(ann.totalInterest>dly2.totalInterest,'annual rest gives less benefit from overpayments than daily ('+ann.totalInterest.toFixed(0)+' > '+dly2.totalInterest.toFixed(0)+')');
// offset
const lump=E.hbSimulate({...base,interestMode:'daily',over:{lumps:[{month:1,amount:20000}]}});
const off=E.hbSimulate({...base,interestMode:'daily',offset:{enabled:true,balance:20000}});
ok(near(lump.totalInterest,off.totalInterest,lump.totalInterest*0.01),'offset of £20k saves about the same interest as overpaying £20k ('+off.totalInterest.toFixed(0)+' vs '+lump.totalInterest.toFixed(0)+')');
ok(off.months<s.months,'offset shortens the term when payments are kept');
// products: 2y fix then reversion
const fx=E.hbSimulate({...base,products:[{months:24,type:'fixed',rate:4},{months:null,type:'variable',rate:7}]});
ok(near(fx.schedule[0].rate,4,1e-9)&&near(fx.schedule[23].rate,4,1e-9)&&near(fx.schedule[24].rate,7,1e-9),'fixed 4% for 24 months then reverts to 7%');
ok(fx.totalInterest>E.hbSimulate({...base,products:[{months:null,type:'fixed',rate:4}]}).totalInterest,'reversion rate raises total interest');
const tr=E.hbSimulate({...base,products:[{months:null,type:'tracker',base:4,margin:0.75}]});
ok(near(tr.schedule[0].rate,4.75,0.001),'tracker = base + margin');
// stress
ok(E.hbSimulate({...base,stress:2}).totalInterest>s.totalInterest*1.2,'+2% stress raises interest materially');
// interest-only & part-and-part
const io=E.hbSimulate({...base,repayment:'interest-only',termMonths:120});
ok(near(io.balloon,200000,0.5)&&io.warnings.some(w=>/Interest-only/.test(w)),'interest-only leaves the full balance at the end (flagged)');
ok(near(io.schedule[0].pay,200000*0.05/12,1),'interest-only payment = interest (£'+io.schedule[0].pay.toFixed(0)+')');
const pp=E.hbSimulate({...base,repayment:'part',ioAmount:100000});
ok(pp.balloon>99000&&pp.balloon<100100,'part-and-part: repayment half cleared, ~£100k interest-only half remains');
// ERC + allowance
const erc=E.hbSimulate({...base,products:[{months:24,type:'fixed',rate:5},{months:null,type:'variable',rate:6}],erc:[5,4],allowance:{pct:10,basis:'anniversary',enforce:true},over:{lumps:[{month:3,amount:40000}]}});
ok(erc.ercTotal>0&&near(erc.ercTotal,(40000-20000)*0.05,60),'40k lump vs 10% allowance (~£20k) → ERC ≈ 5% of excess = £1,000 (got '+erc.ercTotal.toFixed(0)+')');
const capd=E.hbSimulate({...base,products:[{months:24,type:'fixed',rate:5},{months:null,type:'variable',rate:6}],erc:[5,4],allowance:{pct:10,basis:'anniversary',enforce:true,cap:true},over:{lumps:[{month:3,amount:40000}]}});
ok(capd.ercTotal===0&&capd.schedule[2].overpay<=20001,'capping at the allowance avoids ERC');
const after=E.hbSimulate({...base,products:[{months:24,type:'fixed',rate:5},{months:null,type:'variable',rate:6}],erc:[5,4],allowance:{pct:10,basis:'anniversary',enforce:true},over:{lumps:[{month:30,amount:40000}]}});
ok(after.ercTotal===0,'no ERC once the fixed period has ended');
// fees
const fee=E.hbSimulate({...base,fees:{arrangement:999,addToLoan:true}}),fee2=E.hbSimulate({...base,fees:{arrangement:999,addToLoan:false}});
ok(fee.totalInterest>s.totalInterest&&fee2.upfront===999,'fee added to loan costs interest; upfront fee is counted separately');
// step-up & round-up
ok(E.hbSimulate({...base,over:{monthly:100,stepUpPct:10}}).months<E.hbSimulate({...base,over:{monthly:100}}).months,'annual step-up shortens the term further');
ok(E.hbSimulate({...base,over:{roundUp:true}}).months<=s.months,'round-up does not lengthen the term');
// equity
const eq=E.hbEquityAt(E.hbSimulate({...base,valuation:250000,growthPct:3}),60);
ok(eq.equity>50000+0&&eq.value>250000,'equity = growing value − balance (£'+Math.round(eq.equity).toLocaleString()+' at 5 years)');
// leap year handling (daily)
const lp=E.hbSimulate({...base,interestMode:'daily',start:'2027-12-01',termMonths:24});
ok(lp.schedule.length===24&&lp.schedule.every(r=>isFinite(r.interest)),'leap-year dates handled');
// compare
const cmp=E.hbCompare(s,ov); ok(cmp.interestSaved>0&&cmp.monthsSaved>0,'compare: interest saved £'+Math.round(cmp.interestSaved)+', '+cmp.monthsSaved+' months sooner');
console.log(fails?'FAILURES '+fails:'ALL PASSED');
