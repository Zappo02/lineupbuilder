import React,{useState,useRef,useEffect,useCallback,createContext,useContext} from"react";
import{PLAYERS,FORMATIONS,POSITION_COLORS,STAT_VIEWS,SERIE_A_TEAMS,NATION_FLAGS,TEAM_COLORS}from"./data/players.js";

const ThCtx=createContext("dark");
const TH={
  dark:{bg:"#0a0e1a",pn:"#111827",bd:"rgba(255,255,255,0.08)",tx:"#f9fafb",dm:"#6b7280",ft:"#374151",ib:"rgba(255,255,255,0.07)",hd:"rgba(0,0,0,0.65)",pD:"#1a4d2e",pL:"#1d5c35",ln:"rgba(255,255,255,0.28)",lb:"rgba(0,0,0,0.88)"},
  light:{bg:"#f0f4f8",pn:"#fff",bd:"rgba(0,0,0,0.1)",tx:"#111827",dm:"#4b5563",ft:"#9ca3af",ib:"rgba(0,0,0,0.05)",hd:"rgba(255,255,255,0.9)",pD:"#2d6a4f",pL:"#40916c",ln:"rgba(255,255,255,0.5)",lb:"rgba(0,0,0,0.75)"},
};
const ini=n=>n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const rcol=r=>r>=90?"#ffd700":r>=85?"#c8c8c8":r>=80?"#cd7f32":"#6b7280";
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const XLR={GK:"GK",ST:"ST",LS:"ST",RS:"ST",CF:"ST",LCB:"CB",RCB:"CB",CB:"CB",MCB:"CB",LB:"LB",LWB:"LB",RB:"RB",RWB:"RB",CDM:"DM",LCDM:"DM",RCDM:"DM",LCM:"CM",RCM:"CM",CM:"CM",CAM:"AM",LAM:"LW",RAM:"RW",LM:"LM",RM:"RM",LW:"LW",RW:"RW"};
const SK="lu_v9";
const enc=(o)=>{try{return btoa(unescape(encodeURIComponent(JSON.stringify(o))));}catch{return"";}};
const dec=s=>{try{return JSON.parse(decodeURIComponent(escape(atob(s))));}catch{return null;}};

function KitSVG({color="#16a34a",size=32,isGK=false}){
  const th=useContext(ThCtx);const c=isGK?"#d4a017":color;
  const r=parseInt(c.slice(1,3),16)||80,g=parseInt(c.slice(3,5),16)||80,b=parseInt(c.slice(5,7),16)||80;
  const lt="rgb("+Math.min(255,r+40)+","+Math.min(255,g+40)+","+Math.min(255,b+40)+")";
  const dk="rgb("+Math.max(0,r-30)+","+Math.max(0,g-30)+","+Math.max(0,b-30)+")";
  const sk=th==="dark"?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)";
  const uid="kg"+size+c.replace("#","");
  return(
    <svg width={size} height={Math.round(size*1.2)} viewBox="0 0 60 72" style={{display:"block",flexShrink:0}}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stopColor={lt}/><stop offset="100%" stopColor={dk}/></linearGradient></defs>
      <path d="M15,17 Q30,10 45,17 L48,70 L12,70 Z" fill={"url(#"+uid+")"}/>
      <rect x="12" y="30" width="2.5" height="40" rx="1" fill="rgba(255,255,255,0.12)"/>
      <rect x="45.5" y="30" width="2.5" height="40" rx="1" fill="rgba(255,255,255,0.12)"/>
      <path d="M22,22 Q30,18 38,22 L36,35 Q30,37 24,35 Z" fill="rgba(255,255,255,0.06)"/>
      <path d="M15,17 L3,26 L7,36 L15,30 Z" fill={dk}/><path d="M45,17 L57,26 L53,36 L45,30 Z" fill={dk}/>
      <path d="M24,17 L30,22 L36,17" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M15,17 Q30,10 45,17 L48,70 L12,70 Z" fill="none" stroke={sk} strokeWidth="0.5"/>
      <path d="M15,17 L3,26 L7,36 L15,30" fill="none" stroke={sk} strokeWidth="0.4"/>
      <path d="M45,17 L57,26 L53,36 L45,30" fill="none" stroke={sk} strokeWidth="0.4"/>
    </svg>);
}

function StatBadges({player,stats}){
  if(!player)return null;
  const items=STAT_VIEWS.filter(s=>stats.includes(s.id)&&s.id!=="rating"&&player[s.id]!==undefined);
  if(!items.length)return null;
  return(<div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",marginTop:2}}>
    {items.slice(0,2).map(sv=>{const exp=sv.id==="contract"&&player.contract<=2026;const c2=exp?"#ef4444":sv.color;
      const l=sv.id==="nation"?(NATION_FLAGS[player.nation]||player.nation):sv.id==="foot"?(player.foot==="L"?"Sin":"Dx"):(""+sv.icon+" "+sv.format(player[sv.id]));
      return <div key={sv.id} style={{background:c2+"22",border:"1px solid "+c2+"66",borderRadius:3,padding:"0 4px",fontSize:7,fontWeight:800,color:c2,whiteSpace:"nowrap",lineHeight:"13px"}}>{l}</div>;
    })}</div>);
}

function PitchSlot({slot,pos,player,alt,onDrop,onClick,tColor,stats,kits,cap,numbers}){
  const[over,setOver]=useState(false);const th=useContext(ThCtx);const T=TH[th];
  const c=POSITION_COLORS[pos.role]||"#6b7280";const b=tColor||c;const cnt=useRef(0);
  const ds=e=>{if(!player)return;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",JSON.stringify({id:player.id,slot:slot}));};
  const de=e=>{e.preventDefault();cnt.current++;setOver(true);};
  const dv=e=>{e.preventDefault();};
  const dl=()=>{cnt.current--;if(cnt.current<=0){cnt.current=0;setOver(false);}};
  const dd=e=>{e.preventDefault();cnt.current=0;setOver(false);try{onDrop(slot,JSON.parse(e.dataTransfer.getData("text/plain")));}catch(ex){}};
  const S={position:"absolute",left:pos.x+"%",top:pos.y+"%",transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:2,zIndex:over?20:10};
  if(!player)return(
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div onClick={()=>onClick(slot)} style={{width:44,height:44,borderRadius:"50%",border:"2px dashed "+c,backgroundColor:over?c+"33":c+"11",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:c+"bb",cursor:"pointer",transform:over?"scale(1.15)":"scale(1)",transition:"all .12s"}}>+</div>
      <div style={{background:T.lb,borderRadius:4,padding:"1px 6px",fontSize:9,color:c,fontWeight:700}}>{pos.role}{pos.y<35&&pos.role!=="ST"&&pos.role!=="RW"&&pos.role!=="LW"?" ATT":""}{pos.y>65&&pos.role!=="GK"&&pos.role!=="CB"&&pos.role!=="RB"&&pos.role!=="LB"?" DIF":""}</div>
    </div>);
  var num=(numbers||{})[slot]||"";
  return(
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div draggable onDragStart={ds} onClick={()=>onClick(slot)} style={{position:"relative",cursor:"grab",transform:over?"scale(1.15)":"scale(1)",transition:"transform .12s",userSelect:"none",WebkitUserSelect:"none"}}>
        {kits?<KitSVG color={tColor||c} size={40} isGK={pos.role==="GK"}/>
          :<div style={{width:44,height:44,borderRadius:"50%",backgroundColor:c+"22",border:"3px solid "+b,boxShadow:"0 0 10px "+b+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:c,fontFamily:"'Barlow Condensed',sans-serif"}}>{ini(player.name)}</div>}
        {stats.includes("rating")&&<div style={{position:"absolute",top:-4,right:-4,background:rcol(player.rating),color:"#000",fontSize:8,fontWeight:800,borderRadius:3,padding:"0 2px",lineHeight:"13px",minWidth:13,textAlign:"center"}}>{player.rating}</div>}
        {stats.includes("age")&&<div style={{position:"absolute",top:-4,left:-4,background:"#3b82f6",color:"#fff",fontSize:7,fontWeight:800,borderRadius:3,padding:"0 2px",lineHeight:"13px"}}>{player.age}</div>}
        {stats.includes("foot")&&<div style={{position:"absolute",bottom:-2,left:-2,background:player.foot==="L"?"#ec4899":"#6b7280",color:"#fff",fontSize:6,fontWeight:800,borderRadius:2,padding:"0 2px",lineHeight:"11px"}}>{player.foot==="L"?"L":"R"}</div>}
        {num&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.7)",textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>{num}</div>}
      </div>
      <div style={{background:T.lb,borderRadius:5,padding:"1px 5px",maxWidth:82,textAlign:"center"}} onClick={()=>onClick(slot)}>
        <div style={{fontSize:8,color:"#9ca3af",fontWeight:700}}>{pos.role}{pos.y<35&&pos.role!=="ST"&&pos.role!=="RW"&&pos.role!=="LW"?" ATT":""}{pos.y>65&&pos.role!=="GK"&&pos.role!=="CB"&&pos.role!=="RB"&&pos.role!=="LB"?" DIF":""}</div>
        <div style={{fontSize:10,color:"#fff",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cap===player.id&&<span style={{color:"#ffd700",marginRight:2}}>C</span>}{player.shortName}</div>
        {alt&&<div style={{fontSize:8,color:"#16a34a",fontWeight:600,borderTop:"1px solid rgba(22,163,74,0.3)",marginTop:1,paddingTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{alt.shortName}</div>}
      </div>
      <StatBadges player={player} stats={stats}/>
    </div>);
}

function PitchView({lineup,alts,form,onDrop,onClick,name,color,stats,kits,cap,customPos,onPitchDrop,coach,numbers}){
  const th=useContext(ThCtx);const T=TH[th];
  const base=FORMATIONS[form]?.positions||[];
  const positions=base.map(function(p){return (customPos||{})[p.slot]?Object.assign({},p,{x:(customPos||{})[p.slot].x,y:(customPos||{})[p.slot].y}):p;});
  return(
    <div data-pitch="1" style={{position:"relative",width:"100%",paddingBottom:"150%",userSelect:"none",WebkitUserSelect:"none"}}
      onDragOver={function(e){e.preventDefault();}}
      onDrop={function(e){e.preventDefault();var tgt=e.target.closest("[data-slot]");if(tgt)return;
        try{var d=JSON.parse(e.dataTransfer.getData("text/plain"));if(d.slot===undefined)return;
          var r2=e.currentTarget.getBoundingClientRect();
          var xP=Math.max(5,Math.min(95,((e.clientX-r2.left)/r2.width)*100));
          var yP=Math.max(5,Math.min(95,((e.clientY-r2.top)/r2.height)*100));
          if(onPitchDrop)onPitchDrop(d.slot,xP,yP);
        }catch(ex){}}}>
      <svg viewBox="0 0 300 450" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
        <defs><linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={T.pD}/><stop offset="100%" stopColor={T.pL}/></linearGradient></defs>
        <rect width="300" height="450" fill="url(#gf)" rx="8"/>
        {[0,1,2,3,4,5,6,7].map(function(i){return <rect key={i} x="0" y={i*57} width="300" height="28" fill={i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.02)"}/>;
        })}
        <g fill="none" stroke={T.ln} strokeWidth="1.3">
          <rect x="10" y="10" width="280" height="430" rx="2"/><line x1="10" y1="225" x2="290" y2="225"/>
          <circle cx="150" cy="225" r="36"/><rect x="56" y="350" width="188" height="80"/><rect x="100" y="390" width="100" height="40"/>
          <rect x="56" y="20" width="188" height="80"/><rect x="100" y="20" width="100" height="40"/>
          <path d="M 100 122 A 36 36 0 0 0 200 122"/><path d="M 100 328 A 36 36 0 0 1 200 328"/>
        </g>
        {name&&<text x="150" y="226" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.04)" fontSize="19" fontWeight="900" letterSpacing="3">{name.toUpperCase()}</text>}
      </svg>
      {coach&&<div style={{position:"absolute",top:6,right:8,background:"rgba(0,0,0,0.5)",borderRadius:6,padding:"3px 8px",fontSize:10,color:"#fff",fontWeight:700}}>{coach}</div>}
      {positions.map(function(p){return(
        <PitchSlot key={p.slot} slot={p.slot} pos={p} player={lineup[p.slot]||null}
          alt={alts[p.slot]?PLAYERS.find(function(x){return x.id===alts[p.slot];})||null:null}
          onDrop={onDrop} onClick={onClick} tColor={color} stats={stats} kits={kits} cap={cap} numbers={numbers||{}}/>
      );})}
    </div>);
}

function ExportCanvas({lineup,form,name,color,coach,customPos,numbers,onDone}){
  var ref=useRef();
  useEffect(function(){
    var c=ref.current,ctx=c.getContext("2d");var W=800,H=1100;c.width=W;c.height=H;
    var bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#0a0e1a");bg.addColorStop(1,"#111827");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    var hg=ctx.createLinearGradient(0,0,W,0);hg.addColorStop(0,color||"#16a34a");hg.addColorStop(1,(color||"#16a34a")+"cc");ctx.fillStyle=hg;ctx.fillRect(0,0,W,80);
    ctx.fillStyle="#fff";ctx.font="900 38px sans-serif";ctx.textAlign="center";ctx.fillText(name.toUpperCase(),W/2,42);
    ctx.font="400 16px sans-serif";ctx.fillStyle="rgba(255,255,255,0.75)";ctx.fillText(coach?coach+" - "+form:form,W/2,66);
    var FY=95,FH=780;var fg=ctx.createLinearGradient(40,FY,40,FY+FH);fg.addColorStop(0,"#1a5c35");fg.addColorStop(1,"#1a4d2e");ctx.fillStyle=fg;ctx.beginPath();ctx.roundRect(40,FY,W-80,FH,10);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.25)";ctx.lineWidth=1.5;ctx.strokeRect(60,FY+10,W-120,FH-20);ctx.beginPath();ctx.moveTo(60,FY+FH/2);ctx.lineTo(W-60,FY+FH/2);ctx.stroke();ctx.beginPath();ctx.arc(W/2,FY+FH/2,50,0,Math.PI*2);ctx.stroke();
    var base=FORMATIONS[form]?.positions||[];
    var positions=base.map(function(p){return(customPos||{})[p.slot]?Object.assign({},p,{x:(customPos||{})[p.slot].x,y:(customPos||{})[p.slot].y}):p;});
    positions.forEach(function(pos){var pl=lineup[pos.slot];if(!pl)return;
      var px=60+(pos.x/100)*(W-120),py=FY+10+(pos.y/100)*(FH-20);
      var col=POSITION_COLORS[pos.role]||"#6b7280";
      var kc=color||col;var kr2=parseInt(kc.slice(1,3),16)||80,kg2=parseInt(kc.slice(3,5),16)||80,kb2=parseInt(kc.slice(5,7),16)||80;
      var klt="rgb("+Math.min(255,kr2+35)+","+Math.min(255,kg2+35)+","+Math.min(255,kb2+35)+")";
      var kdk="rgb("+Math.max(0,kr2-25)+","+Math.max(0,kg2-25)+","+Math.max(0,kb2-25)+")";
      var isGK=pos.role==="GK";var sc=isGK?"#d4a017":kc;var slt=isGK?"#e6b422":klt;var sdk=isGK?"#b8860b":kdk;
      var kg3=ctx.createLinearGradient(px-18,py-22,px+18,py+20);kg3.addColorStop(0,slt);kg3.addColorStop(1,sdk);ctx.fillStyle=kg3;
      ctx.beginPath();ctx.moveTo(px-14,py-18);ctx.quadraticCurveTo(px,py-24,px+14,py-18);ctx.lineTo(px+16,py+20);ctx.lineTo(px-16,py+20);ctx.closePath();ctx.fill();
      ctx.fillStyle=sdk;ctx.beginPath();ctx.moveTo(px-14,py-18);ctx.lineTo(px-24,py-10);ctx.lineTo(px-20,py-2);ctx.lineTo(px-14,py-8);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(px+14,py-18);ctx.lineTo(px+24,py-10);ctx.lineTo(px+20,py-2);ctx.lineTo(px+14,py-8);ctx.closePath();ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px-6,py-18);ctx.lineTo(px,py-14);ctx.lineTo(px+6,py-18);ctx.stroke();
      var num2=(numbers||{})[pos.slot]||"";
      if(num2){ctx.fillStyle="rgba(255,255,255,0.6)";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText(num2,px,py+6);}
      else{ctx.fillStyle="rgba(255,255,255,0.7)";ctx.font="800 14px sans-serif";ctx.textAlign="center";ctx.fillText(ini(pl.name),px,py+4);}
      ctx.fillStyle=rcol(pl.rating);ctx.beginPath();ctx.roundRect(px+16,py-36,26,18,4);ctx.fill();ctx.fillStyle="#000";ctx.font="bold 12px sans-serif";ctx.fillText(""+pl.rating,px+29,py-23);
      ctx.fillStyle="rgba(0,0,0,0.8)";ctx.beginPath();ctx.roundRect(px-40,py+22,80,24,5);ctx.fill();ctx.fillStyle="#aaa";ctx.font="bold 8px sans-serif";ctx.fillText(pos.role,px,py+32);
      ctx.fillStyle="#fff";ctx.font="bold 11px sans-serif";ctx.fillText(pl.shortName.length>10?pl.shortName.slice(0,9)+"..":pl.shortName,px,py+43);
    });
    var filled=lineup.filter(Boolean);
    if(filled.length){var SY=FY+FH+15;ctx.fillStyle="rgba(255,255,255,0.03)";ctx.beginPath();ctx.roundRect(40,SY,W-80,90,10);ctx.fill();
      var avgR=(filled.reduce(function(a,p){return a+p.rating;},0)/filled.length).toFixed(1);
      var avgA=(filled.reduce(function(a,p){return a+(p.age||0);},0)/filled.length).toFixed(1);
      var totV=filled.reduce(function(a,p){return a+(p.value||0);},0);
      var totW=(filled.reduce(function(a,p){return a+(p.wage||0);},0)/1000).toFixed(1);
      [{l:"OVR",v:avgR,c:rcol(parseFloat(avgR))},{l:"Valore",v:"E"+totV+"M",c:"#16a34a"},{l:"Stip/a",v:"E"+totW+"M",c:"#f59e0b"},{l:"Eta",v:avgA+"a",c:"#3b82f6"},{l:"N",v:filled.length+"/11",c:"#9ca3af"}].forEach(function(m,i){
        var x=40+(W-80)/5*i+(W-80)/10;ctx.fillStyle=m.c;ctx.font="bold 24px sans-serif";ctx.textAlign="center";ctx.fillText(m.v,x,SY+38);
        ctx.fillStyle="rgba(255,255,255,0.35)";ctx.font="11px sans-serif";ctx.fillText(m.l,x,SY+58);
      });}
    ctx.fillStyle="rgba(255,255,255,0.12)";ctx.font="bold 11px sans-serif";ctx.textAlign="right";ctx.fillText("universosportivo.com",W-20,H-10);
    var a=document.createElement("a");a.download=(name||"lineup").replace(/\s/g,"-")+"-lineup.png";a.href=c.toDataURL("image/png");a.click();onDone();
  },[]);
  return <canvas ref={ref} style={{display:"none"}}/>;
}

function TeamPicker({onSelect,onClose}){var th=useContext(ThCtx);var T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:T.pn,borderRadius:16,width:"100%",maxWidth:500,border:"1px solid "+T.bd,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.pn,zIndex:1}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,color:T.tx}}>Carica squadra Serie A</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.dm,cursor:"pointer",fontSize:20}}>X</button>
      </div>
      <div style={{padding:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {SERIE_A_TEAMS.map(function(team){return(
          <button key={team.name} onClick={function(){onSelect(team);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",background:T.ib,border:"1px solid "+team.color+"44",borderRadius:10,cursor:"pointer"}}>
            <KitSVG color={team.color} size={36}/>
            <div style={{fontSize:11,fontWeight:700,color:T.tx,textAlign:"center"}}>{team.name}</div>
            <div style={{fontSize:9,color:T.dm}}>{team.formation+" OVR "+team.rating}</div>
          </button>);})}
      </div>
    </div>
  </div>);}

function PlayerSearch({onSelect,onClose,role,lineup,isAlt,teamName}){var th=useContext(ThCtx);var T=TH[th];
  var roleToF=function(r){if(!r)return"ALL";if(r==="GK")return"GK";if(["CB","RB","LB"].indexOf(r)>=0)return"DEF";if(["DM","CM","AM","RM","LM"].indexOf(r)>=0)return"MID";if(["ST","RW","LW"].indexOf(r)>=0)return"ATT";return"ALL";};
  var[q,setQ]=useState("");var[pf,setPf]=useState(function(){return roleToF(role);});var[cf,setCf]=useState("ALL");
  var[minR,setMinR]=useState(60);var[minA,setMinA]=useState(16);var[maxA,setMaxA]=useState(40);
  var[minW,setMinW]=useState(0);var[maxW,setMaxW]=useState(15);var[minV,setMinV]=useState(0);var[maxV,setMaxV]=useState(200);
  var[footF,setFootF]=useState("ALL");var[conF,setConF]=useState("ALL");var[adv,setAdv]=useState(false);
  var ref2=useRef();useEffect(function(){var t=setTimeout(function(){if(ref2.current)ref2.current.focus();},400);return function(){clearTimeout(t);};},[]);
  var PM={DEF:["CB","RB","LB"],MID:["DM","CM","AM","RM","LM"],ATT:["ST","RW","LW"]};
  var clubs=["ALL"].concat(Array.from(new Set(PLAYERS.map(function(p){return p.club;}))));
  var used=new Set(lineup.filter(Boolean).map(function(p){return p.id;}));
  var list=PLAYERS.filter(function(p){
    if(!isAlt&&used.has(p.id))return false;if(q&&!norm(p.name).includes(norm(q))&&!norm(p.club).includes(norm(q)))return false;
    if(pf!=="ALL"&&!(pf==="GK"&&p.position==="GK")&&!(PM[pf]&&PM[pf].indexOf(p.position)>=0))return false;
    if(cf!=="ALL"&&p.club!==cf)return false;if(p.rating<minR)return false;if(minA>16&&p.age<minA)return false;if(maxA<40&&p.age>maxA)return false;
    var wM=p.wage/1000;if(minW>0&&wM<minW)return false;if(maxW<15&&wM>maxW)return false;
    if(minV>0&&p.value<minV)return false;if(maxV<200&&p.value>maxV)return false;
    if(footF!=="ALL"&&p.foot!==footF)return false;if(conF==="exp"&&p.contract>2026)return false;if(conF==="safe"&&p.contract<=2026)return false;return true;
  }).sort(function(a,b){return b.rating-a.rating;});
  var pill=function(active,fn,label,col){col=col||"#16a34a";return <button onClick={fn} style={{padding:"3px 9px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:active?col:"transparent",borderColor:active?col:"rgba(128,128,128,0.3)",color:active?"#fff":T.dm}}>{label}</button>;};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:T.pn,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"92vh",display:"flex",flexDirection:"column",border:"1px solid "+T.bd}}>
        <div style={{padding:"12px 14px",borderBottom:"1px solid "+T.bd,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,color:T.tx}}>{isAlt?"Scegli riserva":"Scegli giocatore"} {role&&<span style={{marginLeft:7,fontSize:11,color:POSITION_COLORS[role]||"#6b7280",background:(POSITION_COLORS[role]||"#6b7280")+"22",padding:"2px 6px",borderRadius:4,fontWeight:600}}>{role}</span>}</div>
            <button onClick={onClose} style={{background:"none",border:"none",color:T.dm,cursor:"pointer",fontSize:20}}>X</button>
          </div>
          <input ref={ref2} value={q} onChange={function(e){setQ(e.target.value);}} placeholder="Cerca per nome o club..." style={{width:"100%",background:T.ib,border:"1px solid "+T.bd,borderRadius:7,padding:"7px 11px",color:T.tx,fontSize:16,outline:"none",boxSizing:"border-box",marginBottom:7}}/>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            {["ALL","GK","DEF","MID","ATT"].map(function(g){return pill(pf===g,function(){setPf(g);},g);})}
            {teamName&&teamName!=="La mia Squadra"&&pill(cf===teamName,function(){setCf(cf===teamName?"ALL":teamName);},teamName,"#d97706")}
            <button onClick={function(){setAdv(!adv);}} style={{marginLeft:"auto",padding:"3px 9px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:adv?"rgba(99,102,241,0.2)":"transparent",borderColor:adv?"#6366f1":"rgba(128,128,128,0.3)",color:adv?"#6366f1":T.dm}}>Filtri {adv?"^":"v"}</button>
          </div>
          {adv&&<div style={{background:T.ib,borderRadius:8,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80}}>Squadra</span>
              <select value={cf} onChange={function(e){setCf(e.target.value);}} style={{flex:1,background:T.ib,border:"1px solid "+T.bd,borderRadius:5,padding:"4px 8px",color:T.dm,fontSize:11,outline:"none"}}>{clubs.map(function(c2){return <option key={c2} value={c2}>{c2==="ALL"?"Tutte":c2}</option>;})}</select></div>
            {[{l:"Rating min",v:minR,s:setMinR,mn:60,mx:90,st:1,cl:"#ffd700",f:function(v){return v;}},
              {l:"Eta min",v:minA,s:setMinA,mn:16,mx:40,st:1,cl:"#3b82f6",f:function(v){return v<=16?"--":v+"a";}},
              {l:"Eta max",v:maxA,s:setMaxA,mn:16,mx:40,st:1,cl:"#3b82f6",f:function(v){return v>=40?"--":v+"a";}},
              {l:"Stip min M/a",v:minW,s:setMinW,mn:0,mx:15,st:0.5,cl:"#f59e0b",f:function(v){return v<=0?"--":"E"+v+"M";}},
              {l:"Stip max M/a",v:maxW,s:setMaxW,mn:0,mx:15,st:0.5,cl:"#f59e0b",f:function(v){return v>=15?"--":"E"+v+"M";}},
              {l:"Valore min",v:minV,s:setMinV,mn:0,mx:200,st:5,cl:"#16a34a",f:function(v){return v<=0?"--":"E"+v+"M";}},
              {l:"Valore max",v:maxV,s:setMaxV,mn:0,mx:200,st:5,cl:"#16a34a",f:function(v){return v>=200?"--":"E"+v+"M";}},
            ].map(function(x){return <div key={x.l} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80,flexShrink:0}}>{x.l}</span>
              <input type="range" min={x.mn} max={x.mx} step={x.st} value={x.v} onChange={function(e){x.s(+e.target.value);}} style={{flex:1,accentColor:x.cl}}/>
              <span style={{fontSize:11,fontWeight:800,color:x.cl,width:40,textAlign:"right"}}>{x.f(x.v)}</span></div>;})}
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80}}>Piede</span>{[["ALL","Tutti"],["R","Destro"],["L","Mancino"]].map(function(v){return pill(footF===v[0],function(){setFootF(v[0]);},v[1],"#ec4899");})}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80}}>Contratto</span>{[["ALL","Tutti"],["exp","In scad."],["safe","Sicuri"]].map(function(v){return pill(conF===v[0],function(){setConF(v[0]);},v[1],"#f97316");})}</div>
          </div>}
          <div style={{fontSize:10,color:T.dm,textAlign:"right",marginTop:4}}>{list.length} giocatori</div>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {list.length===0?<div style={{padding:28,textAlign:"center",color:T.dm}}>Nessun giocatore</div>
          :list.map(function(p){var exp=p.contract<=2026;return(
            <div key={p.id} onClick={function(){onSelect(p);}} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 14px",cursor:"pointer",borderBottom:"1px solid "+T.bd}}>
              <KitSVG color={TEAM_COLORS[p.club]||"#555"} size={26} isGK={p.position==="GK"}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:T.tx}}>{p.name} {NATION_FLAGS[p.nation]||""}{p.foot==="L"&&<span style={{fontSize:9,color:"#ec4899",marginLeft:4}}>L</span>}</div>
                <div style={{fontSize:10,color:T.dm}}>{p.club} {p.age}a E{p.value}M E{(p.wage/1000).toFixed(1)}M/a{exp&&<span style={{color:"#ef4444",marginLeft:5}}>!{p.contract}</span>}</div>
              </div>
              <div style={{fontSize:9,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",padding:"1px 5px",borderRadius:3,fontWeight:700}}>{p.position}</div>
              <div style={{fontSize:13,fontWeight:800,color:rcol(p.rating),width:24,textAlign:"right"}}>{p.rating}</div>
            </div>);})}
        </div>
      </div>
    </div>);
}

function Settings({name,setName,color,setColor,form,setForm,kits,setKits,onPick,alt,setAlt,coach,setCoach}){var th=useContext(ThCtx);var T=TH[th];
  var colors=["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000","#8B2500","#8B0000","#003399"];
  var cats=Array.from(new Set(Object.values(FORMATIONS).map(function(f){return f.category;})));
  return(<div style={{background:T.pn,borderRadius:12,border:"1px solid "+T.bd,overflow:"hidden"}}>
    <button onClick={onPick} style={{width:"100%",padding:"10px 12px",background:"rgba(22,163,74,0.12)",border:"none",borderBottom:"1px solid "+T.bd,color:"#16a34a",fontSize:12,fontWeight:700,cursor:"pointer"}}>Carica squadra Serie A</button>
    <div style={{padding:"9px 12px",borderBottom:"1px solid "+T.bd}}><div style={{fontSize:9,fontWeight:700,color:T.dm,marginBottom:4}}>NOME SQUADRA</div>
      <input value={name} onChange={function(e){setName(e.target.value);}} maxLength={24} style={{width:"100%",background:T.ib,border:"1px solid "+T.bd,borderRadius:7,padding:"6px 9px",color:T.tx,fontSize:16,outline:"none",boxSizing:"border-box"}}/></div>
    <div style={{padding:"9px 12px",borderBottom:"1px solid "+T.bd}}><div style={{fontSize:9,fontWeight:700,color:T.dm,marginBottom:4}}>ALLENATORE</div>
      <input value={coach} onChange={function(e){setCoach(e.target.value);}} maxLength={24} placeholder="Nome..." style={{width:"100%",background:T.ib,border:"1px solid "+T.bd,borderRadius:7,padding:"6px 9px",color:T.tx,fontSize:16,outline:"none",boxSizing:"border-box"}}/></div>
    <div style={{padding:"9px 12px",borderBottom:"1px solid "+T.bd}}><div style={{fontSize:9,fontWeight:700,color:T.dm,marginBottom:4}}>COLORE KIT</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{colors.map(function(c2){return <div key={c2} onClick={function(){setColor(c2);}} style={{width:18,height:18,borderRadius:"50%",backgroundColor:c2,cursor:"pointer",border:color===c2?"2.5px solid "+(th==="dark"?"#fff":"#333"):"2px solid rgba(128,128,128,0.3)"}}/>; })}</div></div>
    <div style={{padding:"9px 12px",borderBottom:"1px solid "+T.bd}}><div style={{fontSize:9,fontWeight:700,color:T.dm,marginBottom:4}}>MODULO</div>
      {cats.map(function(cat){return <div key={cat} style={{marginBottom:6}}><div style={{fontSize:8,color:T.ft,fontWeight:700,marginBottom:3}}>{cat}</div>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{Object.entries(FORMATIONS).filter(function(e){return e[1].category===cat;}).map(function(e){return(
          <button key={e[0]} onClick={function(){setForm(e[0]);}} style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,cursor:"pointer",border:"1px solid",background:form===e[0]?color:"transparent",borderColor:form===e[0]?color:"rgba(128,128,128,0.3)",color:form===e[0]?(color==="#e5e7eb"?"#000":"#fff"):T.dm}}>{e[0]}</button>);})}</div></div>;})}</div>
    <div style={{padding:"8px 12px"}}>
      <button onClick={function(){setKits(!kits);}} style={{width:"100%",padding:"6px",borderRadius:6,border:"1px solid "+(kits?"#16a34a":"rgba(128,128,128,0.3)"),background:kits?"rgba(22,163,74,0.1)":"transparent",color:kits?"#16a34a":T.dm,fontSize:11,fontWeight:600,cursor:"pointer"}}>{kits?"Kit ON":"Kit OFF"}</button>
      <button onClick={function(){setAlt(!alt);}} style={{width:"100%",padding:"6px",borderRadius:6,border:"1px solid "+(alt?"#16a34a":"rgba(128,128,128,0.3)"),background:alt?"rgba(22,163,74,0.1)":"transparent",color:alt?"#16a34a":T.dm,fontSize:11,fontWeight:600,cursor:"pointer",marginTop:4}}>{alt?"Riserve ON":"Riserve"}</button>
    </div>
  </div>);
}

function StatSel({stats,setStats}){var th=useContext(ThCtx);var T=TH[th];var toggle=function(id){setStats(function(p){return p.includes(id)?p.filter(function(s){return s!==id;}):p.concat([id]);});};var nr=stats.filter(function(s){return s!=="rating";}).length;
  return(<div style={{background:T.pn,borderRadius:12,border:"1px solid "+T.bd,padding:"9px 12px"}}>
    <div style={{fontSize:9,fontWeight:700,color:T.dm,marginBottom:6}}>INFO VISIBILI</div>
    {STAT_VIEWS.map(function(sv){var a=stats.includes(sv.id);var bl=!a&&sv.id!=="rating"&&nr>=2;return(
      <button key={sv.id} onClick={function(){if(!bl)toggle(sv.id);}} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 9px",borderRadius:6,border:"1px solid "+(a?sv.color:T.bd),background:a?sv.color+"18":"transparent",cursor:bl?"not-allowed":"pointer",width:"100%",marginBottom:3,opacity:bl?0.4:1}}>
        <span style={{fontSize:12}}>{sv.icon}</span><span style={{fontSize:10,fontWeight:600,color:a?sv.color:T.dm,flex:1}}>{sv.label}</span>
        <div style={{width:13,height:13,borderRadius:3,background:a?sv.color:"transparent",border:"1.5px solid "+(a?sv.color:T.ft),fontSize:8,color:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}>{a?"v":""}</div>
      </button>);})}
  </div>);
}

function LineupList({lineup,alts,form,onRemove,onRemoveAlt,onSlot,stats,cap,setCap,numbers,setNumbers}){var th=useContext(ThCtx);var T=TH[th];var positions=FORMATIONS[form]?.positions||[];
  return(<div style={{background:T.pn,borderRadius:12,border:"1px solid "+T.bd,overflow:"hidden"}}>
    <div style={{padding:"9px 12px",borderBottom:"1px solid "+T.bd}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:T.tx}}>XI ({lineup.filter(Boolean).length}/11)</span></div>
    <div style={{maxHeight:480,overflowY:"auto"}}>{positions.map(function(pos){var p=lineup[pos.slot];var alt2=alts[pos.slot]?PLAYERS.find(function(x){return x.id===alts[pos.slot];}):null;var rc2=POSITION_COLORS[pos.role]||"#6b7280";
      return(<div key={pos.slot} style={{borderBottom:"1px solid "+T.bd}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",cursor:"pointer",minHeight:34}} onClick={function(){onSlot(pos.slot);}}>
          <div style={{width:24,fontSize:8,fontWeight:700,color:rc2,background:rc2+"22",borderRadius:3,textAlign:"center",padding:"2px",flexShrink:0}}>{pos.role}</div>
          {p?<React.Fragment><KitSVG color={TEAM_COLORS[p.club]||"#555"} size={22} isGK={p.position==="GK"}/><div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cap===p.id&&<span style={{color:"#ffd700",marginRight:2}}>C</span>}{p.shortName}</div></div>
            {stats.includes("rating")&&<div style={{fontSize:10,fontWeight:800,color:rcol(p.rating),flexShrink:0}}>{p.rating}</div>}
            <input value={(numbers||{})[pos.slot]||""} onClick={function(e){e.stopPropagation();}} onChange={function(e){e.stopPropagation();setNumbers(function(prev){var n=Object.assign({},prev);n[pos.slot]=e.target.value.slice(0,2);return n;});}} placeholder="#" maxLength={2}
              style={{width:22,background:T.ib,border:"1px solid "+T.bd,borderRadius:3,padding:"1px 2px",color:T.tx,fontSize:9,textAlign:"center",outline:"none",flexShrink:0}}/>
            <button onClick={function(e){e.stopPropagation();setCap(p.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:cap===p.id?"#ffd700":T.ft,padding:2,flexShrink:0}}>C</button>
            <button onClick={function(e){e.stopPropagation();onRemove(pos.slot);}} style={{background:"none",border:"none",color:T.ft,cursor:"pointer",fontSize:11,padding:2,flexShrink:0}}>x</button>
          </React.Fragment>:<div style={{fontSize:10,color:T.ft,fontStyle:"italic"}}>+ Aggiungi {pos.role}</div>}
        </div>
        {alt2&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px 4px 36px",background:"rgba(22,163,74,0.06)"}}>
          <KitSVG color={TEAM_COLORS[alt2.club]||"#555"} size={18}/>
          <div style={{flex:1,fontSize:10,color:"#16a34a",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{alt2.shortName}</div>
          <button onClick={function(){onRemoveAlt(pos.slot);}} style={{background:"none",border:"none",color:T.ft,cursor:"pointer",fontSize:10}}>x</button>
        </div>}
      </div>);})}</div>
  </div>);
}

function BenchPanel({bench,lineup,alts,onSetAlt,stats,cap,setCap}){var th=useContext(ThCtx);var T=TH[th];var[sort,setSort]=useState("rating");
  var ids=new Set(lineup.filter(Boolean).map(function(p){return p.id;}));
  var list=bench.filter(function(p){return!ids.has(p.id);}).sort(function(a,b){return sort==="rating"?b.rating-a.rating:sort==="age"?a.age-b.age:sort==="value"?b.value-a.value:b.wage-a.wage;});
  return(<div style={{background:T.pn,borderRadius:12,border:"1px solid "+T.bd,overflow:"hidden"}}>
    <div style={{padding:"9px 12px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:T.tx}}>Rosa ({list.length})</div>
      <select value={sort} onChange={function(e){setSort(e.target.value);}} style={{background:T.ib,border:"1px solid "+T.bd,borderRadius:5,padding:"2px 6px",color:T.dm,fontSize:10,outline:"none"}}><option value="rating">Rating</option><option value="age">Eta</option><option value="value">Valore</option><option value="wage">Stipendio</option></select>
    </div>
    <div style={{overflowY:"auto",maxHeight:500}}>{list.length===0&&<div style={{padding:20,color:T.ft,fontSize:12,textAlign:"center"}}>Carica una squadra</div>}
      {list.map(function(p){return(
        <div key={p.id} onClick={function(){onSetAlt(p);}} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderBottom:"1px solid "+T.bd,cursor:"pointer"}}>
          <div style={{width:22,fontSize:8,fontWeight:700,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",borderRadius:3,textAlign:"center",padding:"2px",flexShrink:0}}>{p.position}</div>
          <KitSVG color={TEAM_COLORS[p.club]||"#555"} size={22} isGK={p.position==="GK"}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:700,color:T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.shortName}</div></div>
          <button onClick={function(e){e.stopPropagation();setCap(p.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:cap===p.id?"#ffd700":T.ft,padding:2,flexShrink:0}}>C</button>
          <div style={{fontSize:10,fontWeight:800,color:rcol(p.rating),flexShrink:0}}>{p.rating}</div>
        </div>);})}
    </div>
  </div>);
}

function SquadStats({lineup}){var th=useContext(ThCtx);var T=TH[th];var f=lineup.filter(Boolean);if(!f.length)return null;
  var avg=function(k){var v=f.map(function(p){return p[k];}).filter(function(x){return x!==undefined;});return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:0;};
  var sum=function(k){return f.reduce(function(a,p){return a+(p[k]||0);},0);};
  return(<div style={{background:T.pn,borderRadius:12,border:"1px solid "+T.bd,overflow:"hidden"}}>
    <div style={{padding:"9px 12px",borderBottom:"1px solid "+T.bd}}><div style={{fontSize:9,fontWeight:700,color:T.dm}}>STATISTICHE</div></div>
    <div style={{padding:"2px 0"}}>{[
      {l:"Rating medio",v:avg("rating").toFixed(1),c:rcol(avg("rating"))},{l:"Eta media",v:avg("age").toFixed(1)+"a"},
      {l:"Valore totale",v:"E"+sum("value")+"M",c:"#16a34a"},{l:"Stipendi/anno",v:"E"+(sum("wage")/1000).toFixed(1)+"M",c:"#f59e0b"},
      {l:"Mancini",v:f.filter(function(p){return p.foot==="L";}).length+"/"+f.length,c:"#ec4899"},
    ].map(function(s){return <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 12px",borderBottom:"1px solid "+T.bd}}>
      <span style={{fontSize:10,color:T.dm}}>{s.l}</span><span style={{fontSize:11,fontWeight:700,color:s.c||T.tx}}>{s.v}</span></div>;})}</div>
  </div>);
}

function ConfirmModal({team,onOk,onNo}){var th=useContext(ThCtx);var T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:T.pn,borderRadius:14,width:"100%",maxWidth:360,border:"1px solid "+T.bd,padding:24,textAlign:"center"}}>
      <div style={{fontSize:20,fontWeight:700,color:T.tx,marginBottom:8}}>Sovrascrivere?</div>
      <div style={{fontSize:13,color:T.dm,marginBottom:20}}>Caricare {team.name} sostituira i titolari.</div>
      <div style={{display:"flex",gap:10}}><button onClick={onNo} style={{flex:1,padding:10,borderRadius:8,border:"1px solid "+T.bd,background:"transparent",color:T.dm,cursor:"pointer",fontSize:13}}>Annulla</button>
        <button onClick={onOk} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#16a34a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Carica</button></div>
    </div>
  </div>);}

function AltPicker({player,lineup,positions,onSelect,onClose}){var th=useContext(ThCtx);var T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:T.pn,borderRadius:14,width:"100%",maxWidth:340,border:"1px solid "+T.bd}}>
      <div style={{padding:"11px 14px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:15,fontWeight:700,color:T.tx}}>Alternativa per?</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.dm,cursor:"pointer",fontSize:18}}>X</button></div>
      <div style={{maxHeight:340,overflowY:"auto"}}>{positions.map(function(pos){var s=lineup[pos.slot];if(!s)return null;return(
        <div key={pos.slot} onClick={function(){onSelect(pos.slot);}} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",cursor:"pointer",borderBottom:"1px solid "+T.bd}}>
          <KitSVG color={TEAM_COLORS[s.club]||"#555"} size={24} isGK={s.position==="GK"}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:T.tx}}>{s.name}</div></div>
        </div>);})}</div>
    </div>
  </div>);}

function Toast({msg,onDone}){useEffect(function(){var t=setTimeout(onDone,2500);return function(){clearTimeout(t);};},[onDone]);
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#16a34a",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:700,fontSize:14,zIndex:999,whiteSpace:"nowrap"}}>{msg}</div>;}

export default function App(){
  var[theme,setTheme]=useState("dark");var T=TH[theme];
  var[lineup,setLineup]=useState(Array(11).fill(null));
  var[form,setFormRaw]=useState("4-3-3");
  var[name,setName]=useState("La mia Squadra");var[color,setColor]=useState("#16a34a");
  var[alts,setAlts]=useState({});var[bench,setBench]=useState([]);var[cap,setCap]=useState(null);
  var[coach,setCoach]=useState("");var[customPos,setCustomPos]=useState({});var[numbers,setNumbers]=useState({});
  var[stats,setStats]=useState(["rating"]);var[kits,setKits]=useState(true);var[altMode,setAltMode]=useState(false);
  var[picking,setPicking]=useState(null);var[teamPicker,setTeamPicker]=useState(false);
  var[altPick,setAltPick]=useState(null);var[pending,setPending]=useState(null);
  var[exporting,setExporting]=useState(false);var[toast,setToast]=useState(null);
  var[saved,setSaved]=useState([]);var[showSaved,setShowSaved]=useState(false);
  var past=useRef([]);var future=useRef([]);
  var setLU=function(updater){setLineup(function(prev){past.current=past.current.concat([prev]).slice(-20);future.current=[];return typeof updater==="function"?updater(prev):updater;});};
  var undo=function(){if(!past.current.length)return;var prev=past.current[past.current.length-1];past.current=past.current.slice(0,-1);setLineup(function(cur){future.current=[cur].concat(future.current);return prev;});};
  var redo=function(){if(!future.current.length)return;var next=future.current[0];future.current=future.current.slice(1);setLineup(function(cur){past.current=past.current.concat([cur]);return next;});};

  useEffect(function(){setSaved(JSON.parse(localStorage.getItem(SK)||"[]"));},[]);
  var setForm=useCallback(function(f){setFormRaw(f);setCustomPos({});},[]);
  var autoFillFn=function(){var pool=bench.length>0?bench:PLAYERS;var positions=FORMATIONS[form]?.positions||[];
    setLU(function(prev){var next=prev.slice();var used=new Set(next.filter(Boolean).map(function(p){return p.id;}));var sorted=pool.slice().sort(function(a,b){return b.rating-a.rating;});
      positions.forEach(function(pos){if(next[pos.slot])return;var p=sorted.find(function(p2){return p2.position===pos.role&&!used.has(p2.id);});if(p){next[pos.slot]=p;used.add(p.id);}});
      positions.forEach(function(pos){if(next[pos.slot])return;var p=sorted.find(function(p2){return!used.has(p2.id);});if(p){next[pos.slot]=p;used.add(p.id);}});return next;});setToast("Auto-fill!");};
  var doLoad=useCallback(function(team){
    var tf=team.formation||"4-3-3";var positions=FORMATIONS[tf]?.positions||[];var newLU=Array(11).fill(null);var used=new Set();
    var starters=(team.starters||[]).map(function(s){return{xlRole:s.xlRole,p:s.playerId?PLAYERS.find(function(x){return x.id===s.playerId;}):null};}).filter(function(s){return s.p;});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var c=starters.find(function(s){return XLR[s.xlRole]===pos.role&&!used.has(s.p.id);})||starters.find(function(s){return s.p.position===pos.role&&!used.has(s.p.id);});if(c){newLU[pos.slot]=c.p;used.add(c.p.id);}});
    var roster=PLAYERS.filter(function(p){return p.club===team.name;}).sort(function(a,b){return b.rating-a.rating;});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var c=roster.find(function(p){return p.position===pos.role&&!used.has(p.id);});if(c){newLU[pos.slot]=c;used.add(c.id);}});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var c=roster.find(function(p){return!used.has(p.id);});if(c){newLU[pos.slot]=c;used.add(c.id);}});
    setLineup(newLU);setFormRaw(tf);setName(team.name);setColor(team.color);setAlts({});setBench(PLAYERS.filter(function(p){return p.club===team.name;}));setCustomPos({});setTeamPicker(false);setPending(null);setNumbers({});setToast(team.name+" caricata!");
  },[]);
  var loadTeam=function(team){if(lineup.some(Boolean)){setPending(team);setTeamPicker(false);}else doLoad(team);};
  var slotClick=function(slot){var pos=(FORMATIONS[form]?.positions||[]).find(function(p){return p.slot===slot;});if(altMode&&lineup[slot])setPicking({slot:slot,role:pos?pos.role:null,isAlt:true});else setPicking({slot:slot,role:pos?pos.role:null,isAlt:false});};
  var selectPlayer=function(player){if(!picking)return;if(picking.isAlt)setAlts(function(prev){var n=Object.assign({},prev);n[picking.slot]=player.id;return n;});else setLU(function(prev){var n=prev.slice();n[picking.slot]=player;return n;});setPicking(null);};
  var handleDrop=useCallback(function(targetSlot,data){setLU(function(prev){var next=prev.slice();if(data.slot!==undefined&&data.slot!==null&&data.slot!==targetSlot){var tmp=next[data.slot];next[data.slot]=next[targetSlot];next[targetSlot]=tmp;}else if(data.id){var p=PLAYERS.find(function(x){return x.id===data.id;});if(p)next[targetSlot]=p;}return next;});},[]);
  var handlePitchDrop=useCallback(function(slotIdx,xP,yP){setCustomPos(function(prev){var n=Object.assign({},prev);n[slotIdx]={x:xP,y:yP};return n;});},[]);
  var removePlayer=function(slot){setLU(function(prev){var n=prev.slice();n[slot]=null;return n;});};
  var removeAlt=function(slot){setAlts(function(prev){var n=Object.assign({},prev);delete n[slot];return n;});};
  var benchClick=function(player){setAltPick(player);};
  var altSlotSelect=function(slot){if(!altPick)return;setAlts(function(prev){var n=Object.assign({},prev);n[slot]=altPick.id;return n;});setAltPick(null);setToast(altPick.shortName+" riserva");};
  var share=function(){var code=enc({f:form,n:name,c:color,l:lineup.map(function(p){return p?p.id:null;}),a:alts,cp:customPos,co:coach,nm:numbers});var url=location.origin+location.pathname+"#"+code;navigator.clipboard.writeText(url).then(function(){setToast("Link copiato!");});};
  var save=function(){var s=JSON.parse(localStorage.getItem(SK)||"[]");var e={id:Date.now(),name:name,formation:form,color:color,lineup:lineup.map(function(p){return p?p.id:null;}),alts:alts,customPos:customPos,coach:coach,numbers:numbers,date:new Date().toLocaleDateString("it-IT")};var u=[e].concat(s).slice(0,10);localStorage.setItem(SK,JSON.stringify(u));setSaved(u);setToast("Salvata!");};
  var load=function(entry){setLineup(entry.lineup.map(function(id){return id?PLAYERS.find(function(p){return p.id===id;})||null:null;}));setFormRaw(entry.formation);setName(entry.name);setColor(entry.color);setAlts(entry.alts||{});setCustomPos(entry.customPos||{});setCoach(entry.coach||"");setNumbers(entry.numbers||{});setShowSaved(false);setToast("Caricata!");};
  var positions=FORMATIONS[form]?.positions||[];
  var[mobile,setMobile]=useState(window.innerWidth<900);
  useEffect(function(){var h=function(){setMobile(window.innerWidth<900);};window.addEventListener("resize",h);return function(){window.removeEventListener("resize",h);};},[]);

  return(
    <ThCtx.Provider value={theme}>
      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"'Inter',sans-serif"}}>
        <style>{"*{box-sizing:border-box;}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100vw;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:2px;}input[type=range]{accent-color:#ffd700;}"}</style>
        <header style={{background:T.hd,backdropFilter:"blur(12px)",borderBottom:"1px solid "+T.bd,padding:"0 14px",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 2px 20px rgba(0,0,0,0.3)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,background:"linear-gradient(135deg,#16a34a,#059669)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>G</div>
            <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,lineHeight:1,color:T.tx}}>LINEUP BUILDER</div><div style={{fontSize:8,color:T.dm,letterSpacing:"1.5px"}}>UNIVERSO SPORTIVO</div></div>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={function(){setTheme(theme==="dark"?"light":"dark");}} style={{background:T.ib,border:"1px solid "+T.bd,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:13}}>{theme==="dark"?"L":"D"}</button>
            <button onClick={undo} style={{background:T.ib,border:"1px solid "+T.bd,color:past.current.length?T.tx:T.ft,borderRadius:6,padding:"5px 8px",cursor:past.current.length?"pointer":"default",fontSize:12}}>{"<"}</button>
            <button onClick={redo} style={{background:T.ib,border:"1px solid "+T.bd,color:future.current.length?T.tx:T.ft,borderRadius:6,padding:"5px 8px",cursor:future.current.length?"pointer":"default",fontSize:12}}>{">"}</button>
            <button onClick={autoFillFn} style={{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.4)",color:"#818cf8",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>AI</button>
            <button onClick={function(){setExporting(true);}} style={{background:T.ib,border:"1px solid "+T.bd,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>IMG</button>
            <button onClick={save} style={{background:T.ib,border:"1px solid "+T.bd,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>SAVE</button>
            <button onClick={function(){setShowSaved(!showSaved);}} style={{background:showSaved?"#16a34a18":T.ib,border:"1px solid "+(showSaved?"#16a34a":T.bd),color:showSaved?"#16a34a":T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11}}>{"LOAD"+(saved.length>0?" ("+saved.length+")":"")}</button>
            <button onClick={share} style={{background:"#16a34a",border:"none",color:"#fff",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>LINK</button>
          </div>
        </header>
        {showSaved&&<div style={{background:T.pn,borderBottom:"1px solid "+T.bd,padding:"9px 14px"}}>
          {saved.length===0?<div style={{color:T.dm,fontSize:11}}>Nessuna</div>
          :<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{saved.map(function(e){return(
            <div key={e.id} onClick={function(){load(e);}} style={{background:T.ib,border:"1px solid "+e.color+"44",borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:e.color}}/>
              <div><div style={{fontSize:11,fontWeight:700,color:T.tx}}>{e.name}</div><div style={{fontSize:9,color:T.dm}}>{e.formation+" "+e.date}</div></div>
            </div>);})}</div>}
        </div>}
        <main style={{maxWidth:1160,margin:"0 auto",padding:"12px 10px",display:"grid",gridTemplateColumns:mobile?"1fr":"200px 1fr 200px 180px",gap:12,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Settings name={name} setName={setName} color={color} setColor={setColor} form={form} setForm={setForm} kits={kits} setKits={setKits} onPick={function(){setTeamPicker(true);}} alt={altMode} setAlt={setAltMode} coach={coach} setCoach={setCoach}/>
            <StatSel stats={stats} setStats={setStats}/>
            <div style={{background:T.pn,borderRadius:10,border:"1px solid "+T.bd,padding:"8px 12px"}}>
              <button onClick={function(){setLU(Array(11).fill(null));setAlts({});setBench([]);setCustomPos({});setNumbers({});}} style={{width:"100%",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",borderRadius:6,padding:"6px",cursor:"pointer",fontSize:11,fontWeight:600}}>Svuota</button></div>
          </div>
          <PitchView lineup={lineup} alts={alts} form={form} onDrop={handleDrop} onClick={slotClick} name={name} color={color} stats={stats} kits={kits} cap={cap} customPos={customPos} onPitchDrop={handlePitchDrop} coach={coach} numbers={numbers}/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <LineupList lineup={lineup} alts={alts} form={form} onRemove={removePlayer} onRemoveAlt={removeAlt} onSlot={slotClick} stats={stats} cap={cap} setCap={setCap} numbers={numbers} setNumbers={setNumbers}/>
            <BenchPanel bench={bench} lineup={lineup} alts={alts} onSetAlt={benchClick} stats={stats} cap={cap} setCap={setCap}/>
          </div>
          {!mobile&&<div style={{display:"flex",flexDirection:"column",gap:10}}><SquadStats lineup={lineup}/></div>}
        </main>
        {teamPicker&&<TeamPicker onSelect={loadTeam} onClose={function(){setTeamPicker(false);}}/>}
        {picking&&<PlayerSearch onSelect={selectPlayer} onClose={function(){setPicking(null);}} role={picking.role} lineup={lineup} isAlt={picking.isAlt||false} teamName={name}/>}
        {altPick&&<AltPicker player={altPick} lineup={lineup} positions={positions} onSelect={altSlotSelect} onClose={function(){setAltPick(null);}}/>}
        {pending&&<ConfirmModal team={pending} onOk={function(){doLoad(pending);}} onNo={function(){setPending(null);}}/>}
        {exporting&&<ExportCanvas lineup={lineup} form={form} name={name} color={color} coach={coach} customPos={customPos} numbers={numbers} onDone={function(){setExporting(false);setToast("PNG scaricato!");}}/>}
        {toast&&<Toast msg={toast} onDone={function(){setToast(null);}}/>}
      </div>
    </ThCtx.Provider>);
}

