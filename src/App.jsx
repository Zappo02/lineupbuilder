import React,{useState,useRef,useEffect,useCallback,createContext,useContext} from"react";
import{PLAYERS,FORMATIONS,POSITION_COLORS,STAT_VIEWS,NATION_FLAGS,TEAM_COLORS,ALL_LEAGUES,LEAGUE_MAP}from"./data/players.js";

var ThCtx=createContext("dark");
var TH={
  dark:{bg:"#080c18",pn:"#0f1623",bd:"rgba(255,255,255,0.09)",tx:"#f1f5f9",dm:"#64748b",ft:"#334155",ib:"rgba(255,255,255,0.06)",hd:"rgba(8,12,24,0.85)",pD:"#14532d",pL:"#166534",ln:"rgba(255,255,255,0.25)",lb:"rgba(0,0,0,0.82)"},
  light:{bg:"#e8eef6",pn:"#fff",bd:"rgba(0,0,0,0.09)",tx:"#0f172a",dm:"#475569",ft:"#94a3b8",ib:"rgba(0,0,0,0.04)",hd:"rgba(255,255,255,0.92)",pD:"#15803d",pL:"#16a34a",ln:"rgba(255,255,255,0.45)",lb:"rgba(0,0,0,0.72)"},
};
var ini=function(n){return n.split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase();};
var rcol=function(r){return r>=90?"#ffd700":r>=85?"#c8c8c8":r>=80?"#cd7f32":"#6b7280";};
var norm=function(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();};
var XLR={GK:"GK",ST:"ST",LS:"ST",RS:"ST",CF:"ST",LCB:"CB",RCB:"CB",CB:"CB",MCB:"CB",LB:"LB",LWB:"LB",RB:"RB",RWB:"RB",CDM:"DM",LCDM:"DM",RCDM:"DM",LCM:"CM",RCM:"CM",CM:"CM",CAM:"AM",LAM:"LW",RAM:"RW",LM:"LM",RM:"RM",LW:"LW",RW:"RW"};
var SK="lu_v9";
var encD=function(o){try{return btoa(unescape(encodeURIComponent(JSON.stringify(o))));}catch(e){return"";}};
var decD=function(s){try{return JSON.parse(decodeURIComponent(escape(atob(s))));}catch(e){return null;}};

function KitSVG(props){
  var color=props.color||"#16a34a",size=props.size||32,isGK=props.isGK||false;
  var th=useContext(ThCtx);var c=isGK?"#d4a017":color;
  var r=parseInt(c.slice(1,3),16)||80,g=parseInt(c.slice(3,5),16)||80,b=parseInt(c.slice(5,7),16)||80;
  var lt="rgb("+Math.min(255,r+50)+","+Math.min(255,g+50)+","+Math.min(255,b+50)+")";
  var dk="rgb("+Math.max(0,r-35)+","+Math.max(0,g-35)+","+Math.max(0,b-35)+")";
  var uid="kg"+size+c.replace("#","")+(isGK?"g":"");
  return(
    <svg width={size} height={Math.round(size*1.15)} viewBox="0 0 60 69" style={{display:"block",flexShrink:0,filter:"drop-shadow(0 3px 6px rgba(0,0,0,0.5))"}}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="0.25" y2="1"><stop offset="0%" stopColor={lt}/><stop offset="100%" stopColor={dk}/></linearGradient></defs>
      <path d="M15,16 Q30,9 45,16 L47,68 L13,68 Z" fill={"url(#"+uid+")"}/>
      <path d="M15,16 L2,25 L6,35 L15,28 Z" fill={dk}/><path d="M45,16 L58,25 L54,35 L45,28 Z" fill={dk}/>
      <rect x="13" y="28" width="2" height="40" rx="1" fill="rgba(255,255,255,0.1)"/>
      <rect x="45" y="28" width="2" height="40" rx="1" fill="rgba(255,255,255,0.1)"/>
      <path d="M24,16 L30,21 L36,16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M22,20 Q30,16 38,20 L36,32 Q30,34 24,32 Z" fill="rgba(255,255,255,0.04)"/>
    </svg>);
}

function StatBadges(props){var player=props.player,stats=props.stats,color=props.color;
  if(!player)return null;
  var parts=[];
  if(stats.includes("value"))parts.push({t:"\u20AC"+player.value+"M",c:"#22c55e"});
  if(stats.includes("age"))parts.push({t:player.age+"a",c:"#60a5fa"});
  if(stats.includes("wage"))parts.push({t:"\u20AC"+(player.wage/1000).toFixed(1)+"M/a",c:"#f59e0b"});
  if(stats.includes("height"))parts.push({t:player.height+"cm",c:"#a78bfa"});
  if(stats.includes("foot"))parts.push({t:player.foot==="L"?"Sin":"Dx",c:player.foot==="L"?"#ec4899":"#9ca3af"});
  if(stats.includes("contract")){var exp=player.contract<=2026;parts.push({t:(exp?"!":"")+player.contract,c:exp?"#ef4444":"#9ca3af"});}
  if(!parts.length)return null;
  return(<div style={{background:"rgba(0,0,0,0.75)",borderRadius:4,padding:"1px 6px",fontSize:7,fontWeight:700,whiteSpace:"nowrap",lineHeight:"13px",marginTop:1,textAlign:"center",display:"flex",gap:4,justifyContent:"center"}}>
    {parts.map(function(p,i){return <span key={i} style={{color:p.c}}>{p.t}</span>;})}</div>);
}

var td={on:false,player:null,fromSlot:null,ghost:null,dropCb:null};

function PitchSlot(props){
  var slot=props.slot,pos=props.pos,player=props.player,alt=props.alt,onDrop=props.onDrop,onClick=props.onClick,tColor=props.tColor,stats=props.stats,kits=props.kits,cap=props.cap,numbers=props.numbers||{},small=props.small;
  var _=useState(false),over=_[0],setOver=_[1];
  var th=useContext(ThCtx);var T=TH[th];
  var c=POSITION_COLORS[pos.role]||"#6b7280";var b=tColor||c;var cnt=useRef(0);var timerRef=useRef(null);
  var ks=small?32:44;var fs=small?9:11;var fsr=small?7:7;
  var ds=function(e){if(!player)return;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",JSON.stringify({id:player.id,slot:slot}));};
  var de=function(e){e.preventDefault();cnt.current++;setOver(true);};
  var dv=function(e){e.preventDefault();};
  var dl=function(){cnt.current--;if(cnt.current<=0){cnt.current=0;setOver(false);}};
  var dd=function(e){e.preventDefault();cnt.current=0;setOver(false);try{onDrop(slot,JSON.parse(e.dataTransfer.getData("text/plain")));}catch(ex){}};
  var tStart=function(e){if(!player)return;var t=e.touches[0];timerRef.current=setTimeout(function(){td.on=true;td.player=player;td.fromSlot=slot;td.dropCb=onDrop;var g=document.createElement("div");g.id="tg";g.style.cssText="position:fixed;pointer-events:none;z-index:9999;width:50px;height:50px;border-radius:50%;background:"+b+"55;border:3px solid "+b+";display:flex;align-items:center;justify-content:center;font:800 14px sans-serif;color:#fff;transform:translate(-50%,-65%);box-shadow:0 4px 20px "+b+"99;left:"+t.clientX+"px;top:"+t.clientY+"px;";g.textContent=ini(player.name);document.body.appendChild(g);td.ghost=g;if(navigator.vibrate)navigator.vibrate(30);},250);};
  var tMove=function(e){if(!td.on){clearTimeout(timerRef.current);return;}e.preventDefault();var t=e.touches[0];if(td.ghost){td.ghost.style.left=t.clientX+"px";td.ghost.style.top=t.clientY+"px";}};
  var tEnd=function(e){clearTimeout(timerRef.current);if(!td.on)return;if(td.ghost){td.ghost.remove();td.ghost=null;}var t=e.changedTouches[0];var el=document.elementFromPoint(t.clientX,t.clientY);var slotEl=el?el.closest("[data-slot]"):null;if(slotEl){td.dropCb(parseInt(slotEl.dataset.slot),{id:td.player.id,slot:td.fromSlot});}else{var pitch=el?el.closest("[data-pitch]"):null;if(pitch){var r2=pitch.getBoundingClientRect();var xP=Math.max(5,Math.min(95,((t.clientX-r2.left)/r2.width)*100));var yP=Math.max(5,Math.min(95,((t.clientY-r2.top)/r2.height)*100));pitch.dispatchEvent(new CustomEvent("touchdrop",{detail:{slot:td.fromSlot,x:xP,y:yP}}));}}td.on=false;td.player=null;td.fromSlot=null;};
  var tCancel=function(){clearTimeout(timerRef.current);if(td.ghost){td.ghost.remove();td.ghost=null;}td.on=false;};
  var num=numbers[slot]||"";
  var zoneLabel="";if(pos.y<35&&["GK","CB","RB","LB"].indexOf(pos.role)<0)zoneLabel=" ATT";if(pos.y>65&&["GK","CB","RB","LB","ST","RW","LW"].indexOf(pos.role)<0)zoneLabel=" DIF";
  var S={position:"absolute",left:pos.x+"%",top:pos.y+"%",transform:"translate(-50%,-50%) rotateX(-12deg)",display:"flex",flexDirection:"column",alignItems:"center",gap:1,zIndex:over?20:10,transformStyle:"preserve-3d"};
  if(!player)return(
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div onClick={function(){onClick(slot);}} style={{width:44,height:44,borderRadius:"50%",border:"2px dashed "+c+"88",backgroundColor:over?c+"33":"rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:c+"aa",cursor:"pointer",transform:over?"scale(1.15)":"scale(1)",transition:"all .2s",boxShadow:over?"0 0 20px "+c+"55":"none"}}>+</div>
      <div style={{background:"rgba(0,0,0,0.75)",borderRadius:4,padding:"1px 7px",fontSize:8,color:c,fontWeight:700}}>{pos.role}</div>
    </div>);
  var accent=tColor||c;
  return(
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div draggable onDragStart={ds} onTouchStart={tStart} onTouchMove={tMove} onTouchEnd={tEnd} onTouchCancel={tCancel}
        onClick={function(){onClick(slot);}} style={{position:"relative",cursor:"grab",transform:over?"scale(1.12)":"scale(1)",transition:"transform .15s",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",touchAction:"none"}}>
        {kits?<KitSVG color={accent} size={ks} isGK={pos.role==="GK"}/>
          :<div style={{width:ks+2,height:ks+2,borderRadius:"50%",background:"linear-gradient(135deg,"+accent+"cc,"+accent+"88)",border:"2px solid rgba(255,255,255,0.25)",boxShadow:"0 0 18px "+accent+"55,0 4px 12px rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:small?11:14,fontWeight:800,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>{ini(player.name)}</div>}
        {stats.includes("rating")&&<div style={{position:"absolute",top:-6,right:-8,background:rcol(player.rating),color:"#000",fontSize:small?7:9,fontWeight:900,borderRadius:small?3:5,padding:"0 3px",lineHeight:small?"13px":"16px",minWidth:small?14:18,textAlign:"center",boxShadow:"0 2px 6px rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.2)"}}>{player.rating}</div>}
        {num&&<div style={{position:"absolute",bottom:4,left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:900,color:"rgba(255,255,255,0.85)",textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>{num}</div>}
      </div>
      <div style={{background:"rgba(4,6,14,0.94)",borderRadius:small?5:7,padding:small?"2px 6px":"3px 9px",maxWidth:small?72:92,textAlign:"center",boxShadow:"0 3px 12px rgba(0,0,0,0.8)",borderLeft:"3px solid "+accent,borderTop:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.03)",borderRight:"none"}} onClick={function(){onClick(slot);}}>
        <div style={{fontSize:fsr,color:c,fontWeight:800,letterSpacing:"0.8px",textTransform:"uppercase"}}>{pos.role+zoneLabel}</div>
        <div style={{fontSize:fs,color:"#fff",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"15px"}}>{cap===player.id?"\u00A9 ":""}{player.shortName}</div>
        {alt&&<div style={{fontSize:8,color:"#34d399",fontWeight:600,borderTop:"1px solid rgba(52,211,153,0.2)",marginTop:1,paddingTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{alt.shortName}</div>}
      </div>
      {!small&&<StatBadges player={player} stats={stats} color={accent}/>}
    </div>);
}

function PitchView(props){
  var lineup=props.lineup,alts=props.alts,form=props.form,onDrop=props.onDrop,onClick=props.onClick,name=props.name,color=props.color,stats=props.stats,kits=props.kits,cap=props.cap,customPos=props.customPos||{},onPitchDrop=props.onPitchDrop,coach=props.coach,numbers=props.numbers||{},small=props.small;
  var th=useContext(ThCtx);var T=TH[th];
  var base=FORMATIONS[form]?FORMATIONS[form].positions:[];
  var positions=base.map(function(p){return customPos[p.slot]?Object.assign({},p,{x:customPos[p.slot].x,y:customPos[p.slot].y}):p;});
  var pitchRef=useRef();
  useEffect(function(){var el=pitchRef.current;if(!el)return;var handler=function(e){if(onPitchDrop)onPitchDrop(e.detail.slot,e.detail.x,e.detail.y);};el.addEventListener("touchdrop",handler);return function(){el.removeEventListener("touchdrop",handler);};},[onPitchDrop]);
  var ac=color||"#16a34a";
  // 3D perspective wrapper
  return(
    <div style={{perspective:"900px",perspectiveOrigin:"50% 25%",width:"100%",overflow:"hidden",paddingBottom:12}}>
      {coach&&<div style={{textAlign:"center",padding:"10px 0 8px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:T.tx,letterSpacing:"1px"}}>{coach}</div>}
      <div ref={pitchRef} data-pitch="1" style={{position:"relative",width:"100%",paddingBottom:"140%",userSelect:"none",WebkitUserSelect:"none",borderRadius:10,overflow:"visible",transform:"rotateX(12deg)",transformOrigin:"50% 30%",boxShadow:"0 30px 60px rgba(0,0,0,0.5),0 0 0 2px "+ac+"33"}}
        onDragOver={function(e){e.preventDefault();}}
        onDrop={function(e){e.preventDefault();var tgt=e.target.closest("[data-slot]");if(tgt)return;try{var d=JSON.parse(e.dataTransfer.getData("text/plain"));if(d.slot===undefined)return;var r2=e.currentTarget.getBoundingClientRect();var xP=Math.max(5,Math.min(95,((e.clientX-r2.left)/r2.width)*100));var yP=Math.max(5,Math.min(95,((e.clientY-r2.top)/r2.height)*100));if(onPitchDrop)onPitchDrop(d.slot,xP,yP);}catch(ex){}}}>
        <svg viewBox="0 0 340 480" preserveAspectRatio="xMidYMid slice" style={{position:"absolute",inset:0,width:"100%",height:"100%",borderRadius:10}}>
          <defs>
            <linearGradient id="pitch3d" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a6b2a"/><stop offset="40%" stopColor="#1e8035"/><stop offset="100%" stopColor="#145523"/></linearGradient>
            <linearGradient id="sideL" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#0d3a14"/><stop offset="100%" stopColor="#1a6b2a"/></linearGradient>
            <linearGradient id="sideB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#145523"/><stop offset="100%" stopColor="#0a2e10"/></linearGradient>
          </defs>
          <rect width="340" height="480" fill="#0a2e10" rx="10"/>
          <rect x="10" y="8" width="320" height="454" fill="url(#pitch3d)" rx="4"/>
          {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(function(i){return <rect key={i} x="10" y={8+i*35} width="320" height="17.5" fill={i%2===0?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)"} rx="0"/>;
          })}
          <rect x="0" y="462" width="340" height="18" fill="url(#sideB)" rx="0 0 10 10"/>
          <rect x="0" y="0" width="10" height="480" fill="url(#sideL)" rx="10 0 0 10"/>
          <rect x="330" y="0" width="10" height="480" fill="url(#sideL)" rx="0 10 10 0" transform="scale(-1,1) translate(-340,0)"/>
          <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinejoin="round">
            <rect x="20" y="16" width="300" height="440" rx="1"/>
            <line x1="20" y1="236" x2="320" y2="236"/>
            <circle cx="170" cy="236" r="42"/>
            <circle cx="170" cy="236" r="2.5" fill="rgba(255,255,255,0.5)"/>
            <rect x="70" y="16" width="200" height="82"/>
            <rect x="115" y="16" width="110" height="38"/>
            <path d="M 115 122 A 42 42 0 0 0 225 122"/>
            <circle cx="170" cy="102" r="2" fill="rgba(255,255,255,0.4)"/>
            <rect x="70" y="374" width="200" height="82"/>
            <rect x="115" y="418" width="110" height="38"/>
            <path d="M 115 350 A 42 42 0 0 1 225 350"/>
            <circle cx="170" cy="370" r="2" fill="rgba(255,255,255,0.4)"/>
            <path d="M20,20 A 4 4 0 0 1 24,16" /><path d="M316,16 A 4 4 0 0 1 320,20"/>
            <path d="M20,452 A 4 4 0 0 0 24,456"/><path d="M316,456 A 4 4 0 0 0 320,452"/>
          </g>
          <g fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5">
            <line x1="130" y1="8" x2="130" y2="0"/><line x1="210" y1="8" x2="210" y2="0"/>
            <line x1="130" y1="0" x2="210" y2="0"/>
            <rect x="128" y="-4" width="84" height="12" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
          </g>
          <g fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
            <line x1="130" y1="462" x2="130" y2="474"/><line x1="210" y1="462" x2="210" y2="474"/>
            <line x1="130" y1="474" x2="210" y2="474"/>
            <rect x="128" y="462" width="84" height="16" rx="2" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
          </g>
          {name&&<text x="170" y="238" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.03)" fontSize="24" fontWeight="900" letterSpacing="6">{name.toUpperCase()}</text>}
        </svg>
        <div style={{position:"absolute",top:4,left:6,zIndex:15}}>
          <div style={{background:"rgba(0,0,0,0.6)",borderRadius:4,padding:"2px 8px",border:"1px solid rgba(255,255,255,0.12)",marginBottom:2}}>
            <span style={{fontSize:8,fontWeight:800,color:"rgba(255,255,255,0.75)",letterSpacing:"1px"}}>LINEUP BUILDER</span></div>
          <div style={{background:"rgba(0,0,0,0.5)",borderRadius:4,padding:"1px 8px",display:"inline-block"}}>
            <span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>{form}</span></div></div>
        <div style={{position:"absolute",top:4,right:6,background:"rgba(0,0,0,0.6)",borderRadius:4,padding:"2px 7px",border:"1px solid rgba(255,255,255,0.12)",zIndex:15,display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:11,height:11,background:ac,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,fontWeight:900,color:"#fff"}}>U</div>
          <span style={{fontSize:7,fontWeight:800,color:"rgba(255,255,255,0.75)",letterSpacing:"0.5px"}}>UNIVERSO SPORTIVO</span></div>
        {positions.map(function(p){return(
          <PitchSlot key={p.slot} slot={p.slot} pos={p} player={lineup[p.slot]||null}
            alt={alts[p.slot]?PLAYERS.find(function(x){return x.id===alts[p.slot];})||null:null}
            onDrop={onDrop} onClick={onClick} tColor={color} stats={stats} kits={kits} cap={cap} numbers={numbers} small={small}/>);})}
      </div>
      <div style={{marginTop:8}}>
        {(function(){var f=lineup.filter(Boolean);if(!f.length)return null;
          var avgR=(f.reduce(function(a,p){return a+p.rating;},0)/f.length).toFixed(1);
          var avgA=(f.reduce(function(a,p){return a+p.age;},0)/f.length).toFixed(1);
          var totV=Math.round(f.reduce(function(a,p){return a+p.value;},0)*10)/10;
          var totW=Math.round(f.reduce(function(a,p){return a+p.wage;},0)/100)/10;
          var items=[
            {l:"OVR",v:avgR,c:"#22d3ee"},{l:"Valore",v:"\u20AC"+totV+"M",c:"#22c55e"},
            {l:"Stipendi/a",v:"\u20AC"+totW+"M",c:"#f59e0b"},{l:"Eta",v:avgA+"a",c:"#a78bfa"},
            {l:"XI",v:f.length+"/11",c:"#f472b6"}];
          return <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
            {items.map(function(m){return <div key={m.l} style={{textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:900,color:m.c,textShadow:"0 0 12px "+m.c+"66"}}>{m.v}</div>
              <div style={{fontSize:7,fontWeight:700,color:T.ft,letterSpacing:"0.5px"}}>{m.l}</div></div>;})}</div>;})()}
      </div>
      {!isCompare&&<div style={{display:"flex",gap:6,justifyContent:"center",marginTop:8,flexWrap:"wrap"}}>
        <button onClick={function(){setLU(Array(11).fill(null));setAlts({});setBench([]);setCustomPos({});setNumbers({});}} style={{padding:"6px 14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.22)",color:"#f87171",borderRadius:7,cursor:"pointer",fontSize:10,fontWeight:700}}>Svuota</button>
        <button onClick={function(){setAddingPlayer(true);}} style={{padding:"6px 14px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.22)",color:"#818cf8",borderRadius:7,cursor:"pointer",fontSize:10,fontWeight:700}}>+ Giocatore</button>
        <button onClick={function(){setMode("compare");}} style={{padding:"6px 14px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.22)",color:"#f59e0b",borderRadius:7,cursor:"pointer",fontSize:10,fontWeight:700}}>VS Confronta</button>
      </div>}
    </div>);
}

function drawKitCanvas(ctx,px,py,kc,isGK,scale){
  scale=scale||1;
  var s=scale;
  var r=parseInt(kc.slice(1,3),16)||80,g=parseInt(kc.slice(3,5),16)||80,b=parseInt(kc.slice(5,7),16)||80;
  var lt="rgb("+Math.min(255,r+50)+","+Math.min(255,g+50)+","+Math.min(255,b+50)+")";
  var dk="rgb("+Math.max(0,r-40)+","+Math.max(0,g-40)+","+Math.max(0,b-40)+")";
  var c=isGK?"#d4a017":kc;
  var clt=isGK?"#e8c040":lt;
  var cdk=isGK?"#a06010":dk;
  // Body gradient (matches SVG viewBox 0 0 60 72 scaled)
  var bw=30*s,bh=36*s;
  var grd=ctx.createLinearGradient(px-bw*0.15,py-bh*0.28,px+bw*0.15,py+bh*0.72);
  grd.addColorStop(0,clt);grd.addColorStop(1,cdk);
  // Body trapezoid: M15,17 Q30,10 45,17 L48,70 L12,70 Z -> scale to canvas
  var sc=function(vx,vy){return{x:px+(vx-30)*s,y:py+(vy-36)*s};};
  ctx.beginPath();
  var p0=sc(15,17),p1=sc(30,10),p2=sc(45,17),p3=sc(48,70),p4=sc(12,70);
  ctx.moveTo(p0.x,p0.y);ctx.quadraticCurveTo(p1.x,p1.y,p2.x,p2.y);
  ctx.lineTo(p3.x,p3.y);ctx.lineTo(p4.x,p4.y);ctx.closePath();
  ctx.fillStyle=grd;ctx.fill();
  // Left sleeve
  var ls=[sc(15,17),sc(3,26),sc(7,36),sc(15,30)];
  ctx.beginPath();ctx.moveTo(ls[0].x,ls[0].y);ls.forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.fillStyle=cdk;ctx.fill();
  // Right sleeve
  var rs=[sc(45,17),sc(57,26),sc(53,36),sc(45,30)];
  ctx.beginPath();ctx.moveTo(rs[0].x,rs[0].y);rs.forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.fillStyle=cdk;ctx.fill();
  // Collar V
  var cp1=sc(24,17),cpM=sc(30,22),cp2=sc(36,17);
  ctx.beginPath();ctx.moveTo(cp1.x,cp1.y);ctx.lineTo(cpM.x,cpM.y);ctx.lineTo(cp2.x,cp2.y);
  ctx.strokeStyle="rgba(255,255,255,0.45)";ctx.lineWidth=1.6*s;ctx.lineCap="round";ctx.stroke();
  // Side stripe highlights
  var sl1a=sc(12,30),sl1b=sc(12,70);
  ctx.beginPath();ctx.moveTo(sl1a.x,sl1a.y);ctx.lineTo(sl1b.x,sl1b.y);
  ctx.strokeStyle="rgba(255,255,255,0.13)";ctx.lineWidth=2*s;ctx.stroke();
  var sl2a=sc(48,30),sl2b=sc(48,70);
  ctx.beginPath();ctx.moveTo(sl2a.x,sl2a.y);ctx.lineTo(sl2b.x,sl2b.y);ctx.stroke();
  // Outline shadow
  ctx.beginPath();
  ctx.moveTo(p0.x,p0.y);ctx.quadraticCurveTo(p1.x,p1.y,p2.x,p2.y);
  ctx.lineTo(p3.x,p3.y);ctx.lineTo(p4.x,p4.y);ctx.closePath();
  ctx.strokeStyle="rgba(0,0,0,0.22)";ctx.lineWidth=0.8*s;ctx.stroke();
}

function ExportCanvas(props){
  var lineup=props.lineup,form=props.form,name=props.name,color=props.color,coach=props.coach,customPos=props.customPos||{},numbers=props.numbers||{},stats=props.stats||[],onDone=props.onDone;
  var ref=useRef();
  useEffect(function(){
    var c=ref.current,ctx=c.getContext("2d");
    var W=900,H=1320;c.width=W;c.height=H;

    // --- BACKGROUND ---
    var bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#060a14");bg.addColorStop(0.5,"#0b1220");bg.addColorStop(1,"#060a14");
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

    // Subtle noise texture via diagonal lines
    ctx.strokeStyle="rgba(255,255,255,0.015)";ctx.lineWidth=1;
    for(var xi=0;xi<W+H;xi+=18){ctx.beginPath();ctx.moveTo(xi,0);ctx.lineTo(xi-H,H);ctx.stroke();}

    // --- HEADER BAND ---
    var kc0=color||"#16a34a";
    var kr0=parseInt(kc0.slice(1,3),16)||80,kg0=parseInt(kc0.slice(3,5),16)||80,kb0=parseInt(kc0.slice(5,7),16)||80;
    var hg=ctx.createLinearGradient(0,0,W,0);
    hg.addColorStop(0,"rgb("+Math.max(0,kr0-20)+","+Math.max(0,kg0-20)+","+Math.max(0,kb0-20)+")");
    hg.addColorStop(0.5,kc0);
    hg.addColorStop(1,"rgb("+Math.max(0,kr0-30)+","+Math.max(0,kg0-30)+","+Math.max(0,kb0-30)+")");
    ctx.fillStyle=hg;ctx.fillRect(0,0,W,90);

    // Header bottom glow line
    var gl=ctx.createLinearGradient(0,0,W,0);
    gl.addColorStop(0,"transparent");gl.addColorStop(0.2,kc0);gl.addColorStop(0.8,kc0);gl.addColorStop(1,"transparent");
    ctx.fillStyle=gl;ctx.fillRect(0,88,W,3);

    // Team name in header
    ctx.textAlign="center";
    ctx.fillStyle="rgba(0,0,0,0.3)";ctx.font="900 48px 'Arial Black',sans-serif";ctx.fillText(name.toUpperCase(),W/2+2,58);
    ctx.fillStyle="#ffffff";ctx.font="900 48px 'Arial Black',sans-serif";ctx.fillText(name.toUpperCase(),W/2,56);

    // Formation + coach subline
    var sub=coach?coach+" \u2022 "+form:form;
    ctx.fillStyle="rgba(255,255,255,0.72)";ctx.font="500 17px sans-serif";ctx.fillText(sub,W/2,80);

    // universosportivo.com - LEFT side of header, pill style
    var brand="universosportivo.com";
    ctx.font="bold 13px sans-serif";
    var bw2=ctx.measureText(brand).width+22;
    ctx.fillStyle="rgba(0,0,0,0.28)";
    ctx.beginPath();ctx.roundRect(14,12,bw2,26,13);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.2)";ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(14,12,bw2,26,13);ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.9)";ctx.textAlign="left";
    ctx.fillText(brand,14+11,30);

    // --- PITCH ---
    var FX=32,FY=104,FW=W-64,FH=920;
    var fg=ctx.createLinearGradient(FX,FY,FX,FY+FH);
    fg.addColorStop(0,"#14532d");fg.addColorStop(0.5,"#166534");fg.addColorStop(1,"#14532d");
    ctx.fillStyle=fg;ctx.beginPath();ctx.roundRect(FX,FY,FW,FH,12);ctx.fill();

    // Pitch stripes
    for(var si=0;si<8;si++){
      ctx.fillStyle=si%2===0?"rgba(0,0,0,0.055)":"rgba(255,255,255,0.025)";
      var sy=FY+si*(FH/8),sh=FH/8;
      ctx.beginPath();if(si===0)ctx.roundRect(FX,sy,FW,sh,{tl:12,tr:12,br:0,bl:0});
      else if(si===7)ctx.roundRect(FX,sy,FW,sh,{tl:0,tr:0,br:12,bl:12});
      else ctx.rect(FX,sy,FW,sh);
      ctx.fill();
    }

    // Pitch lines
    ctx.strokeStyle="rgba(255,255,255,0.28)";ctx.lineWidth=1.8;ctx.lineJoin="round";ctx.lineCap="round";
    var PX1=FX+16,PY1=FY+12,PX2=FX+FW-16,PY2=FY+FH-12;
    var PW=PX2-PX1,PH=PY2-PY1;
    ctx.strokeRect(PX1,PY1,PW,PH);
    // Halfway line
    ctx.beginPath();ctx.moveTo(PX1,PY1+PH/2);ctx.lineTo(PX2,PY1+PH/2);ctx.stroke();
    // Centre circle
    ctx.beginPath();ctx.arc(FX+FW/2,PY1+PH/2,56,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.3)";ctx.beginPath();ctx.arc(FX+FW/2,PY1+PH/2,4,0,Math.PI*2);ctx.fill();
    // Penalty areas
    var paW=PW*0.54,paH=PH*0.16;
    ctx.strokeRect(PX1+(PW-paW)/2,PY1,paW,paH);
    ctx.strokeRect(PX1+(PW-paW)/2,PY2-paH,paW,paH);
    var gaW=PW*0.28,gaH=PH*0.08;
    ctx.strokeRect(PX1+(PW-gaW)/2,PY1,gaW,gaH);
    ctx.strokeRect(PX1+(PW-gaW)/2,PY2-gaH,gaW,gaH);
    // Penalty arcs
    ctx.beginPath();ctx.arc(FX+FW/2,PY1+paH+32,36,0,Math.PI,false);ctx.stroke();
    ctx.beginPath();ctx.arc(FX+FW/2,PY2-paH-32,36,Math.PI,0,false);ctx.stroke();
    // Penalty spots
    ctx.fillStyle="rgba(255,255,255,0.4)";
    ctx.beginPath();ctx.arc(FX+FW/2,PY1+PH*0.115,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(FX+FW/2,PY2-PH*0.115,4,0,Math.PI*2);ctx.fill();

    // --- PLAYERS ---
    var base=FORMATIONS[form]?FORMATIONS[form].positions:[];
    var positions=base.map(function(p){return customPos[p.slot]?Object.assign({},p,{x:customPos[p.slot].x,y:customPos[p.slot].y}):p;});
    var KS=1.45; // kit scale factor
    var KH=72*KS*0.5; // approx half kit height
    positions.forEach(function(pos){
      var pl=lineup[pos.slot];if(!pl)return;
      var px=PX1+(pos.x/100)*PW;
      var py=PY1+(pos.y/100)*PH;
      var col=POSITION_COLORS[pos.role]||"#6b7280";
      var kc=color||col;
      var isGK=pos.role==="GK";

      // Shadow under kit
      ctx.fillStyle="rgba(0,0,0,0.22)";
      ctx.beginPath();ctx.ellipse(px,py+KH*0.7,22*KS,7,0,0,Math.PI*2);ctx.fill();

      // Kit (same path logic as SVG, scaled)
      drawKitCanvas(ctx,px,py,kc,isGK,KS);

      // Number or initials on kit body
      var num2=numbers[pos.slot]||"";
      var textY=py+8*KS;
      if(num2){
        ctx.fillStyle="rgba(255,255,255,0.8)";ctx.font="900 "+(16*KS)+"px 'Arial Black',sans-serif";
        ctx.textAlign="center";ctx.fillText(num2,px,textY);
      }else{
        ctx.fillStyle="rgba(255,255,255,0.75)";ctx.font="900 "+(13*KS)+"px 'Arial Black',sans-serif";
        ctx.textAlign="center";ctx.fillText(ini(pl.name),px,textY);
      }

      // Rating badge (top-right of kit)
      var rBx=px+20*KS,rBy=py-38*KS,rBw=28,rBh=18;
      ctx.fillStyle=rcol(pl.rating);
      ctx.beginPath();ctx.roundRect(rBx,rBy,rBw,rBh,5);ctx.fill();
      // Shadow
      ctx.fillStyle="rgba(0,0,0,0.4)";ctx.font="900 13px sans-serif";
      ctx.textAlign="center";ctx.fillText(""+pl.rating,rBx+rBw/2+1,rBy+13);
      ctx.fillStyle="#111";ctx.fillText(""+pl.rating,rBx+rBw/2,rBy+13);

      // Name tag below kit
      var tagW=100,tagH=42,tagX=px-tagW/2,tagY=py+KH*0.82;
      // tag bg with kit color tint
      ctx.fillStyle="rgba(6,10,20,0.88)";
      ctx.beginPath();ctx.roundRect(tagX,tagY,tagW,tagH,7);ctx.fill();
      // left accent bar
      ctx.fillStyle=isGK?"#d4a017":kc;
      ctx.beginPath();ctx.roundRect(tagX,tagY,4,tagH,{tl:7,tr:0,br:0,bl:7});ctx.fill();
      // role label
      ctx.fillStyle=POSITION_COLORS[pos.role]||col;
      ctx.font="800 9px sans-serif";ctx.textAlign="center";
      ctx.fillText(pos.role,px+2,tagY+13);
      // player name
      ctx.fillStyle="#ffffff";ctx.font="700 13px sans-serif";
      var sname=pl.shortName.length>12?pl.shortName.slice(0,11)+".":pl.shortName;
      ctx.fillText(sname,px+2,tagY+27);
      // stat line
      ctx.fillStyle=isGK?"#e8b84b":"#22c55e";
      ctx.font="600 9px sans-serif";
      ctx.fillText("E"+pl.value+"M  "+pl.age+"a",px+2,tagY+39);
    });

    // --- STATS BAR ---
    var filled=lineup.filter(Boolean);
    var SY=FY+FH+14;
    var sbH=110;

    // Stats bar bg
    ctx.fillStyle="rgba(15,22,35,0.95)";
    ctx.beginPath();ctx.roundRect(FX,SY,FW,sbH,12);ctx.fill();
    // Stats bar border with gradient
    var sbg=ctx.createLinearGradient(FX,0,FX+FW,0);
    sbg.addColorStop(0,"transparent");sbg.addColorStop(0.2,kc0+"88");sbg.addColorStop(0.8,kc0+"88");sbg.addColorStop(1,"transparent");
    ctx.strokeStyle=sbg;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(FX,SY,FW,sbH,12);ctx.stroke();

    // universosportivo.com inside stats bar as watermark
    ctx.textAlign="center";ctx.font="bold 11px sans-serif";

    if(filled.length){
      var avgR=(filled.reduce(function(a,p){return a+p.rating;},0)/filled.length).toFixed(1);
      var avgA=(filled.reduce(function(a,p){return a+(p.age||0);},0)/filled.length).toFixed(1);
      var totV=Math.round(filled.reduce(function(a,p){return a+(p.value||0);},0)*10)/10;
      var totW=Math.round(filled.reduce(function(a,p){return a+(p.wage||0);},0)/100)/10;
      var metrics=[
        {l:"RATING",v:avgR,c:rcol(parseFloat(avgR)),sub:"medio"},
        {l:"VALORE",v:"\u20AC"+totV+"M",c:"#22c55e",sub:"rosa"},
        {l:"STIPENDI",v:"\u20AC"+totW+"M",c:"#f59e0b",sub:"per anno"},
        {l:"ETA",v:avgA+"a",c:"#60a5fa",sub:"media"},
        {l:"TITOLARI",v:filled.length+"/11",c:"#a78bfa",sub:"in campo"},
      ];
      metrics.forEach(function(m,i2){
        var mx=FX+(FW/5)*i2+(FW/10);
        if(i2>0){ctx.strokeStyle="rgba(255,255,255,0.08)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(FX+(FW/5)*i2,SY+15);ctx.lineTo(FX+(FW/5)*i2,SY+sbH-15);ctx.stroke();}
        ctx.fillStyle=m.c;ctx.font="900 24px sans-serif";ctx.textAlign="center";
        ctx.fillText(m.v,mx,SY+48);
        ctx.fillStyle="rgba(255,255,255,0.55)";ctx.font="700 10px sans-serif";
        ctx.fillText(m.l,mx,SY+66);
        ctx.fillStyle="rgba(255,255,255,0.3)";ctx.font="400 9px sans-serif";
        ctx.fillText(m.sub,mx,SY+80);
      });
    }

    // --- TARGHETTE on pitch ---
    // Left bottom: LINEUP BUILDER
    var tY=FY+FH-36;
    ctx.fillStyle="rgba(0,0,0,0.55)";ctx.beginPath();ctx.roundRect(FX+14,tY,130,26,6);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.12)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(FX+14,tY,130,26,6);ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.75)";ctx.font="800 11px sans-serif";ctx.textAlign="center";
    ctx.fillText("LINEUP BUILDER",FX+14+65,tY+17);
    // Right bottom: UNIVERSO SPORTIVO
    ctx.fillStyle="rgba(0,0,0,0.55)";ctx.beginPath();ctx.roundRect(FX+FW-160,tY,146,26,6);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.12)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(FX+FW-160,tY,146,26,6);ctx.stroke();
    ctx.fillStyle=kc0;ctx.beginPath();ctx.roundRect(FX+FW-154,tY+4,16,16,3);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="900 9px sans-serif";ctx.textAlign="center";ctx.fillText("U",FX+FW-146,tY+15);
    ctx.fillStyle="rgba(255,255,255,0.85)";ctx.font="700 10px sans-serif";ctx.textAlign="center";
    ctx.fillText("UNIVERSO SPORTIVO",FX+FW-160+82,tY+16);

    // --- FOOTER ---
    var footY=Math.min(SY+sbH+14, H-24);
    ctx.fillStyle="rgba(255,255,255,0.15)";ctx.font="bold 11px sans-serif";ctx.textAlign="center";
    ctx.fillText("universosportivo.com",W/2,footY+10);

    var a=document.createElement("a");a.download=(name||"lineup").replace(/\s/g,"-")+"-lineup.png";a.href=c.toDataURL("image/png");a.click();onDone();
  },[]);
  return <canvas ref={ref} style={{display:"none"}}/>;
}

function TeamPicker(props){var onSelect=props.onSelect,onClose=props.onClose;var th=useContext(ThCtx);var T=TH[th];
  var _lg=useState("serie_a"),lg=_lg[0],setLg=_lg[1];
  var cur=ALL_LEAGUES.find(function(l){return l.id===lg;})||ALL_LEAGUES[0];
  return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}}>
    <div style={{background:T.pn,borderRadius:20,width:"100%",maxWidth:560,border:"1px solid "+T.bd,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,borderRadius:"20px 20px 0 0"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:T.tx}}>Carica squadra</div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+T.bd,color:T.dm,cursor:"pointer",fontSize:16,width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:"1px solid "+T.bd,overflowX:"auto",flexShrink:0}}>
        {ALL_LEAGUES.map(function(l){var a=lg===l.id;return(
          <button key={l.id} onClick={function(){setLg(l.id);}} style={{padding:"8px 12px",border:"none",borderBottom:a?"2px solid #16a34a":"2px solid transparent",background:"transparent",color:a?"#16a34a":T.dm,fontSize:11,fontWeight:a?800:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .12s"}}>{l.name+" ("+l.teams.length+")"}</button>);})}
      </div>
      <div style={{overflowY:"auto",flex:1,padding:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        {cur.teams.map(function(team){return(
          <button key={team.name} onClick={function(){onSelect(team);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 8px",background:team.color+"12",border:"1px solid "+team.color+"44",borderRadius:12,cursor:"pointer",transition:"all .15s"}}>
            <KitSVG color={team.color} size={38}/>
            <div style={{fontSize:11,fontWeight:800,color:T.tx,textAlign:"center"}}>{team.name}</div>
            <div style={{fontSize:9,color:T.dm}}>{team.formation+" OVR "+team.rating}</div>
          </button>);})}
        </div>
      </div>
    </div></div>);}

function PlayerSearch(props){var onSelect=props.onSelect,onClose=props.onClose,role=props.role,lineup=props.lineup,isAlt=props.isAlt,teamName=props.teamName,customPlayers=props.customPlayers||[];var th=useContext(ThCtx);var T=TH[th];
  var allP=PLAYERS.concat(customPlayers);
  var roleToF=function(r){if(!r)return"ALL";if(r==="GK")return"GK";if(["CB","RB","LB"].indexOf(r)>=0)return"DEF";if(["DM","CM","AM","RM","LM"].indexOf(r)>=0)return"MID";if(["ST","RW","LW"].indexOf(r)>=0)return"ATT";return"ALL";};
  var _q=useState(""),q=_q[0],setQ=_q[1];var _p=useState(function(){return roleToF(role);}),pf=_p[0],setPf=_p[1];var _c=useState("ALL"),cf=_c[0],setCf=_c[1];
  var _lf=useState("ALL"),leagueF=_lf[0],setLeagueF=_lf[1];
  var _r=useState(60),minR=_r[0],setMinR=_r[1];var _a1=useState(16),minA=_a1[0],setMinA=_a1[1];var _a2=useState(40),maxA=_a2[0],setMaxA=_a2[1];
  var _w1=useState(0),minW=_w1[0],setMinW=_w1[1];var _w2=useState(15),maxW=_w2[0],setMaxW=_w2[1];var _v1=useState(0),minV=_v1[0],setMinV=_v1[1];var _v2=useState(200),maxV=_v2[0],setMaxV=_v2[1];
  var _f=useState("ALL"),footF=_f[0],setFootF=_f[1];var _cMin=useState(2025),conMin=_cMin[0],setConMin=_cMin[1];var _cMax=useState(2035),conMax=_cMax[0],setConMax=_cMax[1];var _ad=useState(false),adv=_ad[0],setAdv=_ad[1];
  var ref2=useRef();useEffect(function(){var t=setTimeout(function(){if(ref2.current)ref2.current.focus();},400);return function(){clearTimeout(t);};},[]);
  var PM={DEF:["CB","RB","LB"],MID:["DM","CM","AM","RM","LM"],ATT:["ST","RW","LW"]};
  var leagueNames=["ALL"].concat(ALL_LEAGUES.map(function(l){return l.name;}));
  var clubs=["ALL"].concat(Array.from(new Set(allP.filter(function(p){return leagueF==="ALL"||(LEAGUE_MAP[p.club]||"")=== leagueF;}).map(function(p){return p.club;}))).sort());
  var used=new Set(lineup.filter(Boolean).map(function(p){return p.id;}));
  var list=allP.filter(function(p){
    if(!isAlt&&used.has(p.id))return false;if(q&&!norm(p.name).includes(norm(q))&&!norm(p.club).includes(norm(q)))return false;
    if(leagueF!=="ALL"&&(LEAGUE_MAP[p.club]||"")!==leagueF)return false;
    if(pf!=="ALL"&&!(pf==="GK"&&p.position==="GK")&&!(PM[pf]&&PM[pf].indexOf(p.position)>=0))return false;
    if(cf!=="ALL"&&p.club!==cf)return false;if(p.rating<minR)return false;if(minA>16&&p.age<minA)return false;if(maxA<40&&p.age>maxA)return false;
    var wM=p.wage/1000;if(minW>0&&wM<minW)return false;if(maxW<15&&wM>maxW)return false;if(minV>0&&p.value<minV)return false;if(maxV<200&&p.value>maxV)return false;
    if(footF!=="ALL"&&p.foot!==footF)return false;if(conMin>2025&&p.contract<conMin)return false;if(conMax<2035&&p.contract>conMax)return false;return true;
  }).sort(function(a,b){return b.rating-a.rating;});
  var pill=function(active,fn,label,col){col=col||"#16a34a";return <button onClick={fn} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:active?col:"transparent",borderColor:active?col:"rgba(128,128,128,0.25)",color:active?"#fff":T.dm,transition:"all .12s"}}>{label}</button>;};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:12,backdropFilter:"blur(8px)"}}>
      <div style={{background:T.pn,borderRadius:20,width:"100%",maxWidth:520,maxHeight:"92vh",display:"flex",flexDirection:"column",border:"1px solid "+T.bd,boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid "+T.bd,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:800,color:T.tx}}>{isAlt?"Scegli riserva":"Scegli giocatore"} {role&&<span style={{marginLeft:7,fontSize:11,color:POSITION_COLORS[role]||"#6b7280",background:(POSITION_COLORS[role]||"#6b7280")+"22",padding:"2px 7px",borderRadius:5,fontWeight:700}}>{role}</span>}</div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+T.bd,color:T.dm,cursor:"pointer",fontSize:14,width:30,height:30,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
          <input ref={ref2} value={q} onChange={function(e){setQ(e.target.value);}} placeholder="Cerca per nome o club..." style={{width:"100%",background:T.ib,border:"1px solid "+T.bd,borderRadius:8,padding:"8px 12px",color:T.tx,fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
            {["ALL","GK","DEF","MID","ATT"].map(function(g){return pill(pf===g,function(){setPf(g);},g);})}
            {teamName&&teamName!=="La mia Squadra"&&pill(cf===teamName,function(){setCf(cf===teamName?"ALL":teamName);},teamName,"#d97706")}
            <button onClick={function(){setAdv(!adv);}} style={{marginLeft:"auto",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:adv?"rgba(99,102,241,0.2)":"transparent",borderColor:adv?"#6366f1":"rgba(128,128,128,0.25)",color:adv?"#6366f1":T.dm}}>{"Filtri "+(adv?"^":"v")}</button></div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6,overflowX:"auto"}}>
            {leagueNames.map(function(ln){var a=leagueF===ln;var lb=ln==="ALL"?"Tutti":ln;return pill(a,function(){setLeagueF(ln);if(ln!=="ALL")setCf("ALL");},lb,"#8b5cf6");})}</div>
          {adv&&<div style={{background:T.ib,borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8,border:"1px solid "+T.bd}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80}}>Squadra</span>
              <select value={cf} onChange={function(e){setCf(e.target.value);}} style={{flex:1,background:T.ib,border:"1px solid "+T.bd,borderRadius:6,padding:"4px 8px",color:T.dm,fontSize:11,outline:"none"}}>{clubs.map(function(c2){return <option key={c2} value={c2}>{c2==="ALL"?"Tutte":c2}</option>;})}</select></div>
            {[{l:"Rating min",v:minR,s:setMinR,mn:60,mx:90,st:1,cl:"#ffd700",f:function(v){return v;}},{l:"Eta min",v:minA,s:setMinA,mn:16,mx:40,st:1,cl:"#3b82f6",f:function(v){return v<=16?"--":v+"a";}},{l:"Eta max",v:maxA,s:setMaxA,mn:16,mx:40,st:1,cl:"#3b82f6",f:function(v){return v>=40?"--":v+"a";}},
              {l:"Stip min M/a",v:minW,s:setMinW,mn:0,mx:15,st:0.5,cl:"#f59e0b",f:function(v){return v<=0?"--":"E"+v+"M";}},{l:"Stip max M/a",v:maxW,s:setMaxW,mn:0,mx:15,st:0.5,cl:"#f59e0b",f:function(v){return v>=15?"--":"E"+v+"M";}},
              {l:"Valore min",v:minV,s:setMinV,mn:0,mx:200,st:5,cl:"#16a34a",f:function(v){return v<=0?"--":"E"+v+"M";}},{l:"Valore max",v:maxV,s:setMaxV,mn:0,mx:200,st:5,cl:"#16a34a",f:function(v){return v>=200?"--":"E"+v+"M";}},
            ].map(function(x){return <div key={x.l} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80,flexShrink:0}}>{x.l}</span>
              <input type="range" min={x.mn} max={x.mx} step={x.st} value={x.v} onChange={function(e){x.s(+e.target.value);}} style={{flex:1,accentColor:x.cl}}/><span style={{fontSize:11,fontWeight:800,color:x.cl,width:40,textAlign:"right"}}>{x.f(x.v)}</span></div>;})}
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80}}>Piede</span>{[["ALL","Tutti"],["R","Destro"],["L","Mancino"]].map(function(v){return pill(footF===v[0],function(){setFootF(v[0]);},v[1],"#ec4899");})}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80}}>Contratto da</span>
              <input type="range" min={2025} max={2035} step={1} value={conMin} onChange={function(e){setConMin(+e.target.value);}} style={{flex:1,accentColor:"#f97316"}}/><span style={{fontSize:11,fontWeight:800,color:"#f97316",width:36,textAlign:"right"}}>{conMin<=2025?"--":conMin}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80}}>Contratto a</span>
              <input type="range" min={2025} max={2035} step={1} value={conMax} onChange={function(e){setConMax(+e.target.value);}} style={{flex:1,accentColor:"#f97316"}}/><span style={{fontSize:11,fontWeight:800,color:"#f97316",width:36,textAlign:"right"}}>{conMax>=2035?"--":conMax}</span></div>
          </div>}
          <div style={{fontSize:10,color:T.dm,textAlign:"right",marginTop:5}}>{list.length+" giocatori"}</div></div>
        <div style={{overflowY:"auto",flex:1}}>
          {list.length===0?<div style={{padding:28,textAlign:"center",color:T.dm}}>Nessun giocatore</div>
          :list.map(function(p){var exp=p.contract<=2026;return(
            <div key={p.id} onClick={function(){onSelect(p);}} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",cursor:"pointer",borderBottom:"1px solid "+T.bd,transition:"background .1s"}}>
              <KitSVG color={TEAM_COLORS[p.club]||"#555"} size={26} isGK={p.position==="GK"}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:T.tx}}>{p.name+" "+(NATION_FLAGS[p.nation]||"")+(p.foot==="L"?" L":"")}</div>
                <div style={{fontSize:10,color:T.dm}}>{p.club+" "+p.age+"a E"+p.value+"M E"+(p.wage/1000).toFixed(1)+"M/a"+(exp?" !"+p.contract:"")}</div></div>
              <div style={{fontSize:9,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",padding:"2px 6px",borderRadius:4,fontWeight:700}}>{p.position}</div>
              <div style={{fontSize:13,fontWeight:800,color:rcol(p.rating),width:24,textAlign:"right"}}>{p.rating}</div>
            </div>);})}
        </div></div></div>);
}

function Settings(props){var name=props.name,setName=props.setName,color=props.color,setColor=props.setColor,form=props.form,setForm=props.setForm,kits=props.kits,setKits=props.setKits,onPick=props.onPick;
  var th=useContext(ThCtx);var T=TH[th];
  var _oc=useState(""),openCat=_oc[0],setOpenCat=_oc[1];
  var colors=["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000","#8B2500","#8B0000","#003399"];
  var cats=Array.from(new Set(Object.values(FORMATIONS).map(function(f){return f.category;})));
  return(<div style={{background:T.pn,borderRadius:14,border:"1px solid "+T.bd,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
    <button onClick={onPick} style={{width:"100%",padding:"10px 12px",background:"linear-gradient(135deg,rgba(22,163,74,0.18),rgba(22,163,74,0.08))",border:"none",borderBottom:"1px solid "+T.bd,color:"#16a34a",fontSize:12,fontWeight:800,cursor:"pointer"}}>Carica squadra</button>
    <div style={{padding:"8px 12px",borderBottom:"1px solid "+T.bd,display:"flex",gap:8,alignItems:"center"}}>
      <input value={name} onChange={function(e){setName(e.target.value);}} maxLength={24} placeholder="Nome squadra" style={{flex:1,background:T.ib,border:"1px solid "+T.bd,borderRadius:6,padding:"5px 8px",color:T.tx,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:3}}>{colors.slice(0,6).map(function(c2){return <div key={c2} onClick={function(){setColor(c2);}} style={{width:16,height:16,borderRadius:"50%",backgroundColor:c2,cursor:"pointer",border:color===c2?"2px solid #fff":"1px solid rgba(128,128,128,0.3)",flexShrink:0}}/>;})}</div>
    </div>
    <div style={{borderBottom:"1px solid "+T.bd}}>
      {cats.map(function(cat){var isOpen=openCat===cat;return <div key={cat}>
        <div onClick={function(){setOpenCat(isOpen?"":cat);}} style={{padding:"6px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:isOpen?"1px solid "+T.bd:"none"}}>
          <span style={{fontSize:9,color:T.dm,fontWeight:700,letterSpacing:"0.5px"}}>{cat}</span>
          <span style={{fontSize:10,color:T.ft}}>{isOpen?"^":"v"}</span></div>
        {isOpen&&<div style={{padding:"4px 10px 8px",display:"flex",gap:3,flexWrap:"wrap"}}>{Object.entries(FORMATIONS).filter(function(e){return e[1].category===cat;}).map(function(e){return(
          <button key={e[0]} onClick={function(){setForm(e[0]);}} style={{padding:"3px 7px",borderRadius:5,fontSize:9,fontWeight:700,cursor:"pointer",border:"1px solid",background:form===e[0]?color:"transparent",borderColor:form===e[0]?color:"rgba(128,128,128,0.25)",color:form===e[0]?(color==="#e5e7eb"?"#000":"#fff"):T.dm}}>{e[0]}</button>);})}</div>}
      </div>;})}</div>
    <div style={{padding:"6px 10px",display:"flex",gap:4}}>
      <button onClick={function(){setKits(!kits);}} style={{flex:1,padding:"5px",borderRadius:5,border:"1px solid "+(kits?"#16a34a":"rgba(128,128,128,0.25)"),background:kits?"rgba(22,163,74,0.12)":"transparent",color:kits?"#16a34a":T.dm,fontSize:9,fontWeight:700,cursor:"pointer"}}>{kits?"Kit ON":"Kit OFF"}</button>
    </div></div>);
}

function StatSel(props){var stats=props.stats,setStats=props.setStats;var th=useContext(ThCtx);var T=TH[th];
  var _exp=useState(false),expanded=_exp[0],setExpanded=_exp[1];
  var toggle=function(id){setStats(function(p){return p.includes(id)?p.filter(function(s){return s!==id;}):p.concat([id]);});};
  var primary=[{id:"value",icon:"\uD83D\uDCB0",label:"Valore",color:"#22c55e"},{id:"wage",icon:"\uD83D\uDCB5",label:"Stipendio",color:"#f59e0b"}];
  var secondary=STAT_VIEWS.filter(function(sv){return sv.id!=="value"&&sv.id!=="wage";});
  return(<div style={{background:T.pn,borderRadius:14,border:"1px solid "+T.bd,padding:"8px 10px",boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
    <div style={{display:"flex",gap:4,marginBottom:expanded?6:0}}>
      {primary.map(function(sv){var a=stats.includes(sv.id);return(
        <button key={sv.id} onClick={function(){toggle(sv.id);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"4px 6px",borderRadius:6,border:"1px solid "+(a?sv.color:T.bd),background:a?sv.color+"18":"transparent",cursor:"pointer"}}>
          <span style={{fontSize:9}}>{sv.icon}</span><span style={{fontSize:9,fontWeight:700,color:a?sv.color:T.dm}}>{sv.label}</span></button>);})}
      <button onClick={function(){setExpanded(!expanded);}} style={{padding:"4px 8px",borderRadius:6,border:"1px solid "+T.bd,background:"transparent",cursor:"pointer",fontSize:9,color:T.dm,fontWeight:700}}>{expanded?"^":"+"}</button>
    </div>
    {expanded&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
      {secondary.map(function(sv){var a=stats.includes(sv.id);return(
        <button key={sv.id} onClick={function(){toggle(sv.id);}} style={{padding:"3px 7px",borderRadius:5,border:"1px solid "+(a?sv.color:T.bd),background:a?sv.color+"18":"transparent",cursor:"pointer",fontSize:8,fontWeight:700,color:a?sv.color:T.dm}}>
          {sv.icon+" "+sv.label}</button>);})}</div>}
  </div>);
}

function LineupList(props){var lineup=props.lineup,alts=props.alts,form=props.form,onRemove=props.onRemove,onRemoveAlt=props.onRemoveAlt,onSlot=props.onSlot,stats=props.stats,cap=props.cap,setCap=props.setCap,numbers=props.numbers||{},setNumbers=props.setNumbers,onEdit=props.onEdit;
  var th=useContext(ThCtx);var T=TH[th];var positions=FORMATIONS[form]?FORMATIONS[form].positions:[];
  return(<div style={{background:T.pn,borderRadius:14,border:"1px solid "+T.bd,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
    <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.bd,background:"linear-gradient(135deg,"+T.pn+","+T.ib+")"}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,color:T.tx}}>{"XI ("+lineup.filter(Boolean).length+"/11)"}</span></div>
    <div style={{maxHeight:480,overflowY:"auto"}}>{positions.map(function(pos){var p=lineup[pos.slot];var alt2=alts[pos.slot]?PLAYERS.find(function(x){return x.id===alts[pos.slot];}):null;var rc2=POSITION_COLORS[pos.role]||"#6b7280";
      return(<div key={pos.slot} style={{borderBottom:"1px solid "+T.bd}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",cursor:"pointer",minHeight:34}} onClick={function(){onSlot(pos.slot);}}>
          <div style={{width:26,fontSize:8,fontWeight:800,color:rc2,background:rc2+"22",borderRadius:4,textAlign:"center",padding:"2px",flexShrink:0}}>{pos.role}</div>
          {p?<React.Fragment><KitSVG color={TEAM_COLORS[p.club]||"#555"} size={22} isGK={p.position==="GK"}/><div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(cap===p.id?"C ":"")+p.shortName}</div></div>
            {stats.includes("rating")&&<div style={{fontSize:10,fontWeight:800,color:rcol(p.rating),flexShrink:0}}>{p.rating}</div>}
            <input value={numbers[pos.slot]||""} onClick={function(e){e.stopPropagation();}} onChange={function(e){e.stopPropagation();setNumbers(function(prev){var n=Object.assign({},prev);n[pos.slot]=e.target.value.slice(0,2);return n;});}} placeholder="#" maxLength={2}
              style={{width:24,background:T.ib,border:"1px solid "+T.bd,borderRadius:4,padding:"1px 3px",color:T.tx,fontSize:9,textAlign:"center",outline:"none",flexShrink:0}}/>
            <button onClick={function(e){e.stopPropagation();setCap(p.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:cap===p.id?"#ffd700":T.ft,padding:2,flexShrink:0}}>C</button>
            {onEdit&&<button onClick={function(e){e.stopPropagation();onEdit(p);}} style={{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontSize:9,padding:2,flexShrink:0}}>{"\u270E"}</button>}
            <button onClick={function(e){e.stopPropagation();onRemove(pos.slot);}} style={{background:"none",border:"none",color:T.ft,cursor:"pointer",fontSize:11,padding:2,flexShrink:0}}>x</button>
          </React.Fragment>:<div style={{fontSize:10,color:T.ft,fontStyle:"italic"}}>{"+ "+pos.role}</div>}
        </div>
        {alt2&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px 4px 36px",background:"rgba(22,163,74,0.07)"}}>
          <KitSVG color={TEAM_COLORS[alt2.club]||"#555"} size={18}/>
          <div style={{flex:1,fontSize:10,color:"#16a34a",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{alt2.shortName}</div>
          <button onClick={function(){onRemoveAlt(pos.slot);}} style={{background:"none",border:"none",color:T.ft,cursor:"pointer",fontSize:10}}>x</button></div>}
      </div>);})}</div></div>);
}

function BenchPanel(props){var bench=props.bench,lineup=props.lineup,alts=props.alts,onSetAlt=props.onSetAlt,stats=props.stats,cap=props.cap,setCap=props.setCap;
  var th=useContext(ThCtx);var T=TH[th];var _s=useState("rating"),sort=_s[0],setSort=_s[1];
  var ids=new Set(lineup.filter(Boolean).map(function(p){return p.id;}));
  var list=bench.filter(function(p){return!ids.has(p.id);}).sort(function(a,b){return sort==="rating"?b.rating-a.rating:sort==="age"?a.age-b.age:sort==="value"?b.value-a.value:b.wage-a.wage;});
  return(<div style={{background:T.pn,borderRadius:14,border:"1px solid "+T.bd,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
    <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,"+T.pn+","+T.ib+")"}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:800,color:T.tx}}>{"Rosa ("+list.length+")"}</div>
      <select value={sort} onChange={function(e){setSort(e.target.value);}} style={{background:T.ib,border:"1px solid "+T.bd,borderRadius:6,padding:"3px 7px",color:T.dm,fontSize:10,outline:"none"}}><option value="rating">Rating</option><option value="age">Eta</option><option value="value">Valore</option><option value="wage">Stipendio</option></select></div>
    <div style={{overflowY:"auto",maxHeight:500}}>{list.length===0&&<div style={{padding:20,color:T.ft,fontSize:12,textAlign:"center"}}>Carica una squadra</div>}
      {list.map(function(p){return(
        <div key={p.id} onClick={function(){onSetAlt(p);}} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderBottom:"1px solid "+T.bd,cursor:"pointer"}}>
          <div style={{width:24,fontSize:8,fontWeight:700,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",borderRadius:4,textAlign:"center",padding:"2px",flexShrink:0}}>{p.position}</div>
          <KitSVG color={TEAM_COLORS[p.club]||"#555"} size={22} isGK={p.position==="GK"}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:700,color:T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.shortName}</div></div>
          <div style={{fontSize:10,fontWeight:800,color:rcol(p.rating),flexShrink:0}}>{p.rating}</div></div>);})}
    </div></div>);
}

function SquadStats(props){var lineup=props.lineup;var th=useContext(ThCtx);var T=TH[th];var f=lineup.filter(Boolean);if(!f.length)return null;
  var avg=function(k){var v=f.map(function(p){return p[k];}).filter(function(x){return x!==undefined;});return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:0;};
  var sum=function(k){return f.reduce(function(a,p){return a+(p[k]||0);},0);};
  return(<div style={{background:T.pn,borderRadius:14,border:"1px solid "+T.bd,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
    <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.bd,background:"linear-gradient(135deg,"+T.pn+","+T.ib+")"}}><div style={{fontSize:9,fontWeight:700,color:T.dm,letterSpacing:"0.8px"}}>STATISTICHE</div></div>
    <div style={{padding:"2px 0"}}>{[
      {l:"Rating medio",v:avg("rating").toFixed(1),c:rcol(avg("rating"))},{l:"Eta media",v:avg("age").toFixed(1)+"a"},
      {l:"Valore totale",v:"E"+sum("value")+"M",c:"#16a34a"},{l:"Stipendi/anno",v:"E"+(sum("wage")/1000).toFixed(1)+"M",c:"#f59e0b"},
      {l:"Mancini",v:f.filter(function(p){return p.foot==="L";}).length+"/"+f.length,c:"#ec4899"},
    ].map(function(s){return <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 12px",borderBottom:"1px solid "+T.bd}}>
      <span style={{fontSize:10,color:T.dm}}>{s.l}</span><span style={{fontSize:11,fontWeight:700,color:s.c||T.tx}}>{s.v}</span></div>;})}</div></div>);
}

function ConfirmModal(props){var team=props.team,onOk=props.onOk,onNo=props.onNo;var th=useContext(ThCtx);var T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
    <div style={{background:T.pn,borderRadius:18,width:"100%",maxWidth:360,border:"1px solid "+T.bd,padding:28,textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
      <div style={{fontSize:22,fontWeight:800,color:T.tx,marginBottom:8}}>Sovrascrivere?</div>
      <div style={{fontSize:13,color:T.dm,marginBottom:22}}>{"Caricare "+team.name+" sostituira i titolari."}</div>
      <div style={{display:"flex",gap:12}}><button onClick={onNo} style={{flex:1,padding:11,borderRadius:9,border:"1px solid "+T.bd,background:"transparent",color:T.dm,cursor:"pointer",fontSize:13}}>Annulla</button>
        <button onClick={onOk} style={{flex:1,padding:11,borderRadius:9,border:"none",background:"linear-gradient(135deg,#16a34a,#059669)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Carica</button></div>
    </div></div>);}

function AltPicker(props){var player=props.player,lineup=props.lineup,positions=props.positions,onSelect=props.onSelect,onClose=props.onClose;var th=useContext(ThCtx);var T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}}>
    <div style={{background:T.pn,borderRadius:18,width:"100%",maxWidth:340,border:"1px solid "+T.bd,boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
      <div style={{padding:"13px 16px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:15,fontWeight:800,color:T.tx}}>Alternativa per?</div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+T.bd,color:T.dm,cursor:"pointer",fontSize:14,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
      <div style={{maxHeight:340,overflowY:"auto"}}>{positions.map(function(pos){var s=lineup[pos.slot];if(!s)return null;return(
        <div key={pos.slot} onClick={function(){onSelect(pos.slot);}} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 16px",cursor:"pointer",borderBottom:"1px solid "+T.bd}}>
          <KitSVG color={TEAM_COLORS[s.club]||"#555"} size={24} isGK={s.position==="GK"}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:T.tx}}>{s.name}</div></div></div>);})}</div>
    </div></div>);}

function AddPlayerModal(props){
  var onAdd=props.onAdd,onClose=props.onClose;var th=useContext(ThCtx);var T=TH[th];
  var _n=useState(""),nm=_n[0],setNm=_n[1];var _sn=useState(""),sn=_sn[0],setSn=_sn[1];
  var _pos=useState("ST"),pos=_pos[0],setPos=_pos[1];var _cl=useState("Free Agent"),cl=_cl[0],setCl=_cl[1];
  var _rt=useState(75),rt=_rt[0],setRt=_rt[1];var _ag=useState(25),ag=_ag[0],setAg=_ag[1];
  var _vl=useState(10),vl=_vl[0],setVl=_vl[1];var _wg=useState(2000),wg=_wg[0],setWg=_wg[1];
  var _ft=useState("R"),ft=_ft[0],setFt=_ft[1];var _ht=useState(180),ht=_ht[0],setHt=_ht[1];
  var _ct=useState(2028),ct=_ct[0],setCt=_ct[1];var _na=useState("---"),na=_na[0],setNa=_na[1];
  var positions=["GK","CB","RB","LB","DM","CM","AM","RM","LM","RW","LW","ST"];
  var doAdd=function(){if(!nm.trim())return;
    onAdd({id:Date.now(),name:nm.trim(),shortName:sn.trim()||nm.trim().split(" ").pop(),position:pos,club:cl,nation:na,rating:rt,age:ag,value:vl,wage:wg,height:ht,foot:ft,contract:ct});};
  var field=function(label,val,setter,type,extra){return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:10,color:T.dm,width:70,flexShrink:0}}>{label}</span>
      {type==="range"?<React.Fragment><input type="range" min={extra.mn} max={extra.mx} step={extra.st||1} value={val} onChange={function(e){setter(+e.target.value);}} style={{flex:1,accentColor:extra.cl||"#16a34a"}}/>
        <span style={{fontSize:11,fontWeight:800,color:extra.cl||"#16a34a",width:36,textAlign:"right"}}>{extra.fmt?extra.fmt(val):val}</span></React.Fragment>
      :<input value={val} onChange={function(e){setter(type==="number"?+e.target.value:e.target.value);}} type={type||"text"} style={{flex:1,background:T.ib,border:"1px solid "+T.bd,borderRadius:6,padding:"5px 8px",color:T.tx,fontSize:12,outline:"none"}}/>}
    </div>);};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}}>
      <div style={{background:T.pn,borderRadius:18,width:"100%",maxWidth:420,border:"1px solid "+T.bd,boxShadow:"0 24px 64px rgba(0,0,0,0.7)",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:800,color:T.tx}}>Nuovo giocatore</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+T.bd,color:T.dm,cursor:"pointer",fontSize:14,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
        <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:10}}>
          {field("Nome completo",nm,setNm)}
          {field("Nome breve",sn,setSn)}
          {field("Club",cl,setCl)}
          {field("Nazionalita",na,setNa)}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:T.dm,width:70}}>Posizione</span>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",flex:1}}>{positions.map(function(p){return(
              <button key={p} onClick={function(){setPos(p);}} style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,cursor:"pointer",border:"1px solid",background:pos===p?(POSITION_COLORS[p]||"#16a34a"):"transparent",borderColor:pos===p?(POSITION_COLORS[p]||"#16a34a"):"rgba(128,128,128,0.25)",color:pos===p?"#fff":T.dm}}>{p}</button>);})}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:T.dm,width:70}}>Piede</span>
            {[["R","Destro"],["L","Mancino"]].map(function(v){return(
              <button key={v[0]} onClick={function(){setFt(v[0]);}} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:ft===v[0]?"#ec4899":"transparent",borderColor:ft===v[0]?"#ec4899":"rgba(128,128,128,0.25)",color:ft===v[0]?"#fff":T.dm}}>{v[1]}</button>);})}</div>
          {field("Rating",rt,setRt,"range",{mn:40,mx:99,cl:"#ffd700"})}
          {field("Eta",ag,setAg,"range",{mn:15,mx:45,cl:"#3b82f6"})}
          {field("Valore (M)",vl,setVl,"range",{mn:0,mx:200,st:1,cl:"#16a34a",fmt:function(v){return v+"M";}})}
          {field("Stipendio (K/a)",wg,setWg,"range",{mn:0,mx:15000,st:100,cl:"#f59e0b",fmt:function(v){return(v/1000).toFixed(1)+"M";}})}
          {field("Altezza (cm)",ht,setHt,"range",{mn:155,mx:210,cl:"#8b5cf6"})}
          {field("Contratto",ct,setCt,"range",{mn:2025,mx:2032,cl:"#f97316"})}
        </div>
        <div style={{padding:"12px 18px"}}>
          <button onClick={doAdd} style={{width:"100%",padding:"11px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#16a34a,#059669)",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,opacity:nm.trim()?"1":"0.4"}}>Aggiungi al database</button></div>
      </div></div>);
}

function EditPlayerModal(props){
  var player=props.player,onSave=props.onSave,onClose=props.onClose;var th=useContext(ThCtx);var T=TH[th];
  var _rt=useState(player.rating),rt=_rt[0],setRt=_rt[1];
  var _ag=useState(player.age),ag=_ag[0],setAg=_ag[1];
  var _vl=useState(player.value),vl=_vl[0],setVl=_vl[1];
  var _wg=useState(player.wage),wg=_wg[0],setWg=_wg[1];
  var _ht=useState(player.height),ht=_ht[0],setHt=_ht[1];
  var _ft=useState(player.foot),ft=_ft[0],setFt=_ft[1];
  var _ct=useState(player.contract),ct=_ct[0],setCt=_ct[1];
  var _pos=useState(player.position),pos=_pos[0],setPos=_pos[1];
  var positions=["GK","CB","RB","LB","DM","CM","AM","RM","LM","RW","LW","ST"];
  var sl=function(label,val,setter,mn,mx,st,cl,fmt){return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:10,color:T.dm,width:80,flexShrink:0}}>{label}</span>
      <input type="range" min={mn} max={mx} step={st||1} value={val} onChange={function(e){setter(+e.target.value);}} style={{flex:1,accentColor:cl||"#16a34a"}}/>
      <span style={{fontSize:11,fontWeight:800,color:cl||"#16a34a",width:44,textAlign:"right"}}>{fmt?fmt(val):val}</span></div>);};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:350,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}}>
      <div style={{background:T.pn,borderRadius:18,width:"100%",maxWidth:400,border:"1px solid "+T.bd,boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <KitSVG color={TEAM_COLORS[player.club]||"#555"} size={24} isGK={player.position==="GK"}/>
            <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:800,color:T.tx}}>{player.name}</div>
              <div style={{fontSize:10,color:T.dm}}>{player.club}</div></div></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+T.bd,color:T.dm,cursor:"pointer",fontSize:14,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
        <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:T.dm,width:80}}>Posizione</span>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",flex:1}}>{positions.map(function(p){return(
              <button key={p} onClick={function(){setPos(p);}} style={{padding:"2px 5px",borderRadius:4,fontSize:8,fontWeight:700,cursor:"pointer",border:"1px solid",background:pos===p?(POSITION_COLORS[p]||"#16a34a"):"transparent",borderColor:pos===p?(POSITION_COLORS[p]||"#16a34a"):"rgba(128,128,128,0.25)",color:pos===p?"#fff":T.dm}}>{p}</button>);})}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:T.dm,width:80}}>Piede</span>
            {[["R","Destro"],["L","Mancino"]].map(function(v){return(
              <button key={v[0]} onClick={function(){setFt(v[0]);}} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:ft===v[0]?"#ec4899":"transparent",borderColor:ft===v[0]?"#ec4899":"rgba(128,128,128,0.25)",color:ft===v[0]?"#fff":T.dm}}>{v[1]}</button>);})}</div>
          {sl("Rating",rt,setRt,40,99,1,"#ffd700")}
          {sl("Eta",ag,setAg,15,45,1,"#3b82f6")}
          {sl("Valore",vl,setVl,0,200,1,"#16a34a",function(v){return v+"M";})}
          {sl("Stipendio",wg,setWg,0,15000,100,"#f59e0b",function(v){return(v/1000).toFixed(1)+"M";})}
          {sl("Altezza",ht,setHt,155,210,1,"#8b5cf6",function(v){return v+"cm";})}
          {sl("Contratto",ct,setCt,2025,2032,1,"#f97316")}
        </div>
        <div style={{padding:"12px 18px"}}>
          <button onClick={function(){onSave({rating:rt,age:ag,value:vl,wage:wg,height:ht,foot:ft,contract:ct,position:pos});}} style={{width:"100%",padding:"11px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#16a34a,#059669)",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700}}>Salva modifiche</button></div>
      </div></div>);
}

function PlayerDetailModal(props){
  var player=props.player,slot=props.slot,pos=props.pos,onClose=props.onClose,onRemove=props.onRemove,onReplace=props.onReplace,onEdit=props.onEdit,onAddAlt=props.onAddAlt,cap=props.cap,onSetCap=props.onSetCap;
  var th=useContext(ThCtx);var T=TH[th];
  var c=POSITION_COLORS[player.position]||"#6b7280";
  var tc=TEAM_COLORS[player.club]||"#555";
  var isCap=cap===player.id;
  var row=function(label,val,col){return(
    <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+T.bd}}>
      <span style={{fontSize:12,color:T.dm}}>{label}</span>
      <span style={{fontSize:13,fontWeight:700,color:col||T.tx}}>{val}</span></div>);};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(10px)"}}>
      <div style={{background:T.pn,borderRadius:20,width:"100%",maxWidth:380,border:"1px solid "+T.bd,boxShadow:"0 24px 64px rgba(0,0,0,0.7)",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,"+tc+"cc,"+tc+"88)",padding:"18px 20px",display:"flex",alignItems:"center",gap:14}}>
          <KitSVG color={tc} size={52} isGK={player.position==="GK"}/>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:800,color:"#fff",textShadow:"0 2px 4px rgba(0,0,0,0.4)"}}>{player.name}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:2}}>{player.club}</div>
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <span style={{background:c,color:"#fff",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:4}}>{player.position}</span>
              <span style={{background:rcol(player.rating),color:"#000",fontSize:11,fontWeight:900,padding:"2px 8px",borderRadius:4}}>{player.rating}</span>
              {isCap&&<span style={{background:"#ffd700",color:"#000",fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:4}}>C</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:16,width:32,height:32,borderRadius:8,cursor:"pointer",flexShrink:0}}>x</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          {row("Valore di mercato","\u20AC"+player.value+"M","#22c55e")}
          {row("Stipendio annuo","\u20AC"+(player.wage/1000).toFixed(1)+"M/a","#f59e0b")}
          {row("Eta",""+player.age+" anni","#60a5fa")}
          {row("Altezza",""+player.height+" cm","#a78bfa")}
          {row("Piede",player.foot==="L"?"Sinistro":"Destro",player.foot==="L"?"#ec4899":"#9ca3af")}
          {row("Contratto","fino al "+player.contract,player.contract<=2026?"#ef4444":"#9ca3af")}
        </div>
        <div style={{padding:"8px 20px 18px",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){onSetCap(player.id);onClose();}} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid "+(isCap?"#ffd700":T.bd),background:isCap?"rgba(255,215,0,0.12)":"transparent",color:isCap?"#ffd700":T.dm,cursor:"pointer",fontSize:11,fontWeight:700}}>{isCap?"Rimuovi C":"Capitano"}</button>
            <button onClick={function(){onEdit(player);onClose();}} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#818cf8",cursor:"pointer",fontSize:11,fontWeight:700}}>Modifica</button>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){onReplace(slot);onClose();}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#16a34a,#059669)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Sostituisci</button>
            <button onClick={function(){onAddAlt(slot);onClose();}} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #16a34a",background:"rgba(22,163,74,0.1)",color:"#16a34a",cursor:"pointer",fontSize:12,fontWeight:700}}>Riserva</button>
            <button onClick={function(){onRemove(slot);onClose();}} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#f87171",cursor:"pointer",fontSize:12,fontWeight:700}}>Rimuovi</button>
          </div>
        </div>
      </div></div>);
}

function Toast(props){var msg=props.msg,onDone=props.onDone;useEffect(function(){var t=setTimeout(onDone,2500);return function(){clearTimeout(t);};},[onDone]);
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#16a34a,#059669)",color:"#fff",padding:"11px 22px",borderRadius:12,fontWeight:700,fontSize:14,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 8px 24px rgba(22,163,74,0.4)"}}>{msg}</div>;}

function CompareHeader(props){var t1=props.t1,t2=props.t2,lu1=props.lu1,lu2=props.lu2;var th=useContext(ThCtx);var T=TH[th];
  var avg=function(lu,k){var f=lu.filter(Boolean);return f.length?f.reduce(function(a,p){return a+(p[k]||0);},0)/f.length:0;};
  var sum=function(lu,k){return lu.filter(Boolean).reduce(function(a,p){return a+(p[k]||0);},0);};
  var ms=[{l:"OVR",a:avg(lu1,"rating").toFixed(1),b:avg(lu2,"rating").toFixed(1),nA:avg(lu1,"rating"),nB:avg(lu2,"rating"),hi:true},
    {l:"Eta",a:avg(lu1,"age").toFixed(1)+"a",b:avg(lu2,"age").toFixed(1)+"a",nA:avg(lu1,"age"),nB:avg(lu2,"age"),hi:false},
    {l:"Valore",a:"E"+sum(lu1,"value")+"M",b:"E"+sum(lu2,"value")+"M",nA:sum(lu1,"value"),nB:sum(lu2,"value"),hi:true},
    {l:"Stip/a",a:"E"+(sum(lu1,"wage")/1000).toFixed(1)+"M",b:"E"+(sum(lu2,"wage")/1000).toFixed(1)+"M",nA:sum(lu1,"wage"),nB:sum(lu2,"wage"),hi:true}];
  return(<div style={{background:T.pn,borderRadius:14,border:"1px solid "+T.bd,padding:"14px 16px",marginBottom:10,boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"center",marginBottom:10}}>
      <div style={{textAlign:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:t1.color}}>{t1.name}</div><div style={{fontSize:9,color:T.dm}}>{lu1.filter(Boolean).length+"/11"}</div></div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:T.ft}}>VS</div>
      <div style={{textAlign:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:t2.color}}>{t2.name}</div><div style={{fontSize:9,color:T.dm}}>{lu2.filter(Boolean).length+"/11"}</div></div></div>
    {ms.map(function(m){var aW=m.hi?m.nA>m.nB:m.nA<m.nB;var bW=m.hi?m.nB>m.nA:m.nB<m.nA;
      return(<div key={m.l} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:4,alignItems:"center",marginBottom:5}}>
        <div style={{textAlign:"right",fontSize:11,fontWeight:700,color:aW?t1.color:T.dm}}>{m.a}</div>
        <div style={{fontSize:9,color:T.dm,textAlign:"center",minWidth:50}}>{m.l}</div>
        <div style={{textAlign:"left",fontSize:11,fontWeight:700,color:bW?t2.color:T.dm}}>{m.b}</div></div>);})}</div>);
}

// Btn helper
function HBtn(props){var onClick=props.onClick,label=props.label,active=props.active,accent=props.accent,T=props.T;
  var bg=active?(accent||"#16a34a"):T.ib;
  var bc=active?(accent||"#16a34a"):T.bd;
  var tc=active?"#fff":T.tx;
  return <button onClick={onClick} style={{background:bg,border:"1px solid "+bc,color:tc,borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:12,fontWeight:active?700:500,transition:"all .12s",whiteSpace:"nowrap"}}>{label}</button>;
}

export default function App(){
  var _th=useState("dark"),theme=_th[0],setTheme=_th[1];var T=TH[theme];
  var _m=useState("single"),mode=_m[0],setMode=_m[1];
  var _lu=useState(Array(11).fill(null)),lineup=_lu[0],setLineup=_lu[1];
  var _lu2=useState(Array(11).fill(null)),lineup2=_lu2[0],setLineup2=_lu2[1];
  var _f=useState("4-3-3"),form=_f[0],setFormRaw=_f[1];var _f2=useState("4-3-3"),form2=_f2[0],setForm2Raw=_f2[1];
  var _n=useState("La mia Squadra"),name=_n[0],setName=_n[1];var _c=useState("#16a34a"),color=_c[0],setColor=_c[1];
  var _n2=useState("Squadra B"),name2=_n2[0],setName2=_n2[1];var _c2=useState("#2563eb"),color2=_c2[0],setColor2=_c2[1];
  var _al=useState({}),alts=_al[0],setAlts=_al[1];var _bn=useState([]),bench=_bn[0],setBench=_bn[1];var _cp2=useState(null),cap=_cp2[0],setCap=_cp2[1];
  var _co=useState(""),coach=_co[0],setCoach=_co[1];var _co2=useState(""),coach2=_co2[0],setCoach2=_co2[1];
  var _cp=useState({}),customPos=_cp[0],setCustomPos=_cp[1];var _nm=useState({}),numbers=_nm[0],setNumbers=_nm[1];
  var _st=useState(["rating","value","wage"]),stats=_st[0],setStats=_st[1];var _ki=useState(true),kits=_ki[0],setKits=_ki[1];var _am=useState(false),altMode=_am[0],setAltMode=_am[1];
  var _pk=useState(null),picking=_pk[0],setPicking=_pk[1];var _tp=useState(false),teamPicker=_tp[0],setTeamPicker=_tp[1];
  var _pd2=useState(null),playerDetail=_pd2[0],setPlayerDetail=_pd2[1];
  var _ap=useState(null),altPick=_ap[0],setAltPick=_ap[1];var _pd=useState(null),pending=_pd[0],setPending=_pd[1];
  var _ex=useState(false),exporting=_ex[0],setExporting=_ex[1];var _to=useState(null),toast=_to[0],setToast=_to[1];
  var _sv=useState([]),saved=_sv[0],setSaved=_sv[1];var _ss=useState(false),showSaved=_ss[0],setShowSaved=_ss[1];
  var _ap2=useState(false),addingPlayer=_ap2[0],setAddingPlayer=_ap2[1];
  var _ep=useState(null),editingPlayer=_ep[0],setEditingPlayer=_ep[1];
  var _cp3=useState([]),customPlayers=_cp3[0],setCustomPlayers=_cp3[1];
  var _disc=useState(function(){return !localStorage.getItem("lb_disc_ok");}),showDisclaimer=_disc[0],setShowDisclaimer=_disc[1];
  var past=useRef([]);var future=useRef([]);
  var allPlayers=PLAYERS.concat(customPlayers);
  var setLU=function(updater){setLineup(function(prev){past.current=past.current.concat([prev]).slice(-20);future.current=[];return typeof updater==="function"?updater(prev):updater;});};
  var undo=function(){if(!past.current.length)return;var prev=past.current[past.current.length-1];past.current=past.current.slice(0,-1);setLineup(function(cur){future.current=[cur].concat(future.current);return prev;});};
  var redo=function(){if(!future.current.length)return;var next=future.current[0];future.current=future.current.slice(1);setLineup(function(cur){past.current=past.current.concat([cur]);return next;});};
  useEffect(function(){setSaved(JSON.parse(localStorage.getItem(SK)||"[]"));},[]);
  var setForm=useCallback(function(f){setFormRaw(f);setCustomPos({});},[]);
  var autoFillFn=function(){var pool=bench.length>0?bench:allPlayers;var positions=FORMATIONS[form]?FORMATIONS[form].positions:[];
    setLU(function(prev){var next=prev.slice();var used=new Set(next.filter(Boolean).map(function(p){return p.id;}));var sorted=pool.slice().sort(function(a,b){return b.rating-a.rating;});
      positions.forEach(function(pos){if(next[pos.slot])return;var p=sorted.find(function(p2){return p2.position===pos.role&&!used.has(p2.id);});if(p){next[pos.slot]=p;used.add(p.id);}});
      positions.forEach(function(pos){if(next[pos.slot])return;var p=sorted.find(function(p2){return!used.has(p2.id);});if(p){next[pos.slot]=p;used.add(p.id);}});return next;});setToast("Auto-fill!");};
  var doLoad=useCallback(function(team){
    var tf=team.formation||"4-3-3";var positions=FORMATIONS[tf]?FORMATIONS[tf].positions:[];var newLU=Array(11).fill(null);var used=new Set();
    var starters=(team.starters||[]).map(function(s){return{xlRole:s.xlRole,p:s.playerId?allPlayers.find(function(x){return x.id===s.playerId;}):null};}).filter(function(s){return s.p;});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var cc=starters.find(function(s){return XLR[s.xlRole]===pos.role&&!used.has(s.p.id);})||starters.find(function(s){return s.p.position===pos.role&&!used.has(s.p.id);});if(cc){newLU[pos.slot]=cc.p;used.add(cc.p.id);}});
    var roster=allPlayers.filter(function(p){return p.club===team.name;}).sort(function(a,b){return b.rating-a.rating;});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var cc=roster.find(function(p){return p.position===pos.role&&!used.has(p.id);});if(cc){newLU[pos.slot]=cc;used.add(cc.id);}});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var cc=roster.find(function(p){return!used.has(p.id);});if(cc){newLU[pos.slot]=cc;used.add(cc.id);}});
    setLineup(newLU);setFormRaw(tf);setName(team.name);setColor(team.color);setAlts({});setBench(allPlayers.filter(function(p){return p.club===team.name;}));setCustomPos({});setTeamPicker(false);setPending(null);setNumbers({});setToast(team.name+" caricata!");
  },[allPlayers]);
  var doLoad2=function(team){
    var tf=team.formation||"4-3-3";var positions=FORMATIONS[tf]?FORMATIONS[tf].positions:[];var newLU=Array(11).fill(null);var used=new Set();
    var starters=(team.starters||[]).map(function(s){return{xlRole:s.xlRole,p:s.playerId?allPlayers.find(function(x){return x.id===s.playerId;}):null};}).filter(function(s){return s.p;});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var cc=starters.find(function(s){return XLR[s.xlRole]===pos.role&&!used.has(s.p.id);})||starters.find(function(s){return s.p.position===pos.role&&!used.has(s.p.id);});if(cc){newLU[pos.slot]=cc.p;used.add(cc.p.id);}});
    var roster=allPlayers.filter(function(p){return p.club===team.name;}).sort(function(a,b){return b.rating-a.rating;});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var cc=roster.find(function(p){return p.position===pos.role&&!used.has(p.id);});if(cc){newLU[pos.slot]=cc;used.add(cc.id);}});
    positions.forEach(function(pos){if(newLU[pos.slot])return;var cc=roster.find(function(p){return!used.has(p.id);});if(cc){newLU[pos.slot]=cc;used.add(cc.id);}});
    setLineup2(newLU);setForm2Raw(tf);setName2(team.name);setColor2(team.color);setTeamPicker(false);setToast(team.name+" caricata (B)!");
  };
  var loadTeam=function(team){
    var forTeam=(teamPicker&&teamPicker.team===2)?2:1;
    if(forTeam===2){doLoad2(team);return;}
    if(lineup.some(Boolean)){setPending(team);setTeamPicker(false);}else doLoad(team);};
  var slotClick=function(slot){var pos=(FORMATIONS[form]?FORMATIONS[form].positions:[]).find(function(p){return p.slot===slot;});
    if(lineup[slot]){setPlayerDetail({player:lineup[slot],slot:slot,role:pos?pos.role:null});return;}
    if(altMode&&lineup[slot])setPicking({slot:slot,role:pos?pos.role:null,isAlt:true});else setPicking({slot:slot,role:pos?pos.role:null,isAlt:false});};
  var selectPlayer=function(player){if(!picking)return;if(picking.isAlt)setAlts(function(prev){var n=Object.assign({},prev);n[picking.slot]=player.id;return n;});else setLU(function(prev){var n=prev.slice();n[picking.slot]=player;return n;});setPicking(null);};
  var handleDrop=useCallback(function(targetSlot,data){setLU(function(prev){var next=prev.slice();if(data.slot!==undefined&&data.slot!==null&&data.slot!==targetSlot){var tmp=next[data.slot];next[data.slot]=next[targetSlot];next[targetSlot]=tmp;}else if(data.id){var p=PLAYERS.find(function(x){return x.id===data.id;});if(p)next[targetSlot]=p;}return next;});},[]);
  var handleDrop2=useCallback(function(targetSlot,data){setLineup2(function(prev){var next=prev.slice();if(data.slot!==undefined&&data.slot!==null&&data.slot!==targetSlot){var tmp=next[data.slot];next[data.slot]=next[targetSlot];next[targetSlot]=tmp;}else if(data.id){var p=PLAYERS.find(function(x){return x.id===data.id;});if(p)next[targetSlot]=p;}return next;});},[]);
  var handlePitchDrop=useCallback(function(slotIdx,xP,yP){setCustomPos(function(prev){var n=Object.assign({},prev);n[slotIdx]={x:xP,y:yP};return n;});},[]);
  var removePlayer=function(slot){setLU(function(prev){var n=prev.slice();n[slot]=null;return n;});};
  var removeAlt=function(slot){setAlts(function(prev){var n=Object.assign({},prev);delete n[slot];return n;});};
  var benchClick=function(player){setAltPick(player);};
  var altSlotSelect=function(slot){if(!altPick)return;setAlts(function(prev){var n=Object.assign({},prev);n[slot]=altPick.id;return n;});setAltPick(null);setToast(altPick.shortName+" riserva");};
  var share=function(){var code=encD({f:form,n:name,c:color,l:lineup.map(function(p){return p?p.id:null;}),a:alts,cp:customPos,co:coach,nm:numbers});var url=location.origin+location.pathname+"#"+code;navigator.clipboard.writeText(url).then(function(){setToast("Link copiato!");});};
  var save=function(){var s=JSON.parse(localStorage.getItem(SK)||"[]");var e={id:Date.now(),name:name,formation:form,color:color,lineup:lineup.map(function(p){return p?p.id:null;}),alts:alts,customPos:customPos,coach:coach,numbers:numbers,date:new Date().toLocaleDateString("it-IT")};var u=[e].concat(s).slice(0,10);localStorage.setItem(SK,JSON.stringify(u));setSaved(u);setToast("Salvata!");};
  var load=function(entry){setLineup(entry.lineup.map(function(id){return id?PLAYERS.find(function(p){return p.id===id;})||null:null;}));setFormRaw(entry.formation);setName(entry.name);setColor(entry.color);setAlts(entry.alts||{});setCustomPos(entry.customPos||{});setCoach(entry.coach||"");setNumbers(entry.numbers||{});setShowSaved(false);setToast("Caricata!");};
  var positions=FORMATIONS[form]?FORMATIONS[form].positions:[];
  var _mo=useState(window.innerWidth<900),mobile=_mo[0],setMobile=_mo[1];
  useEffect(function(){var h=function(){setMobile(window.innerWidth<900);};window.addEventListener("resize",h);return function(){window.removeEventListener("resize",h);};},[]);

  // Load from URL hash on mount
  useEffect(function(){var h=location.hash.slice(1);if(!h)return;var d=decD(h);if(!d)return;
    if(d.f)setFormRaw(d.f);if(d.n)setName(d.n);if(d.c)setColor(d.c);if(d.co)setCoach(d.co);if(d.nm)setNumbers(d.nm);
    if(d.l)setLineup(d.l.map(function(id){return id?PLAYERS.find(function(p){return p.id===id;})||null:null;}));
    if(d.a)setAlts(d.a);if(d.cp)setCustomPos(d.cp);},[]);

  var isCompare=mode==="compare";
  var col3=<div style={{display:"flex",flexDirection:"column",gap:10}}>
    <LineupList lineup={lineup} alts={alts} form={form} onRemove={removePlayer} onRemoveAlt={removeAlt} onSlot={slotClick} stats={stats} cap={cap} setCap={setCap} numbers={numbers} setNumbers={setNumbers} onEdit={function(p){setEditingPlayer(p);}}/>
    <BenchPanel bench={bench} lineup={lineup} alts={alts} onSetAlt={benchClick} stats={stats} cap={cap} setCap={setCap}/>
  </div>;
  var origSelectPlayer=selectPlayer;
  selectPlayer=function(player){
    if(picking&&picking.team===2){setLineup2(function(prev){var n=prev.slice();n[picking.slot]=player;return n;});setPicking(null);return;}
    origSelectPlayer(player);
  };

  var canUndo=past.current.length>0;
  var canRedo=future.current.length>0;

  return(
    <ThCtx.Provider value={theme}>
      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"'Inter',sans-serif"}}>
        <style>{"*{box-sizing:border-box;}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100vw;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:2px;}input[type=range]{accent-color:#ffd700;}button:active{opacity:0.8;transform:scale(0.97);}@media(max-width:900px){.mob-hide{display:none!important;}.mob-full{grid-column:1/-1!important;}}"}</style>
        <header style={{background:T.hd,backdropFilter:"blur(16px)",borderBottom:"1px solid "+T.bd,padding:"6px 10px",position:"sticky",top:0,zIndex:50,boxShadow:"0 2px 24px rgba(0,0,0,0.35)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <div style={{width:26,height:26,background:"linear-gradient(135deg,#16a34a,#059669)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:"0 0 10px rgba(22,163,74,0.5)"}}>
                <span role="img" aria-label="ball">&#x26BD;</span>
              </div>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:900,lineHeight:1,color:T.tx}}>LINEUP BUILDER</div>
                <div style={{fontSize:7,color:T.dm,letterSpacing:"1.5px"}}>UNIVERSOSPORTIVO.COM</div>
              </div>
            </div>
            <div style={{display:"flex",background:T.ib,borderRadius:7,border:"1px solid "+T.bd,overflow:"hidden",flexShrink:0}}>
              <button onClick={function(){setMode("single");}} style={{padding:"5px 10px",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:mode==="single"?"linear-gradient(135deg,#16a34a,#059669)":"transparent",color:mode==="single"?"#fff":T.dm}}>Builder</button>
              <button onClick={function(){setMode("compare");}} style={{padding:"5px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:800,background:isCompare?"linear-gradient(135deg,#f59e0b,#d97706)":"transparent",color:isCompare?"#fff":T.dm}}>VS Confronta</button>
            </div>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={function(){setTheme(theme==="dark"?"light":"dark");}} style={{background:T.ib,border:"1px solid "+T.bd,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>{theme==="dark"?"\u2600\uFE0F":"\uD83C\uDF19"}</button>
            <button onClick={undo} style={{background:T.ib,border:"1px solid "+T.bd,color:canUndo?T.tx:T.ft,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12,opacity:canUndo?1:0.4}}>{"\u21A9"}</button>
            <button onClick={redo} style={{background:T.ib,border:"1px solid "+T.bd,color:canRedo?T.tx:T.ft,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12,opacity:canRedo?1:0.4}}>{"\u21AA"}</button>
            <button onClick={autoFillFn} style={{background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.35)",color:"#818cf8",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>{"\uD83E\uDD16"}</button>
            <button onClick={function(){setExporting(true);}} style={{background:T.ib,border:"1px solid "+T.bd,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>{"\uD83D\uDCF8"}</button>
            <button onClick={save} style={{background:T.ib,border:"1px solid "+T.bd,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>{"\uD83D\uDCBE"}</button>
            <button onClick={function(){setShowSaved(!showSaved);}} style={{background:showSaved?"rgba(22,163,74,0.15)":T.ib,border:"1px solid "+(showSaved?"#16a34a":T.bd),color:showSaved?"#16a34a":T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>{"\uD83D\uDCC1"+(saved.length>0?" "+saved.length:"")}</button>
            <button onClick={share} style={{background:"linear-gradient(135deg,#16a34a,#059669)",border:"none",color:"#fff",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12,fontWeight:700}}>{"\uD83D\uDD17"}</button>
          </div>
        </header>
        {showSaved&&<div style={{background:T.pn,borderBottom:"1px solid "+T.bd,padding:"10px 14px"}}>
          {saved.length===0?<div style={{color:T.dm,fontSize:11}}>Nessuna</div>
          :<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{saved.map(function(e){return(
            <div key={e.id} onClick={function(){load(e);}} style={{background:T.ib,border:"1px solid "+e.color+"55",borderRadius:10,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:e.color,boxShadow:"0 0 6px "+e.color}}/><div><div style={{fontSize:11,fontWeight:700,color:T.tx}}>{e.name}</div><div style={{fontSize:9,color:T.dm}}>{e.formation+" "+e.date}</div></div></div>);})}</div>}</div>}
        <main style={{maxWidth:1280,margin:"0 auto",padding:"14px 10px",display:"grid",gridTemplateColumns:mobile?(isCompare?"1fr 1fr":"1fr"):(isCompare?"1fr 1fr":"210px 1fr 210px 190px"),gap:isCompare?8:12,alignItems:"start"}}>
          {!isCompare&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Settings name={name} setName={setName} color={color} setColor={setColor} form={form} setForm={setForm} kits={kits} setKits={setKits} onPick={function(){setTeamPicker(true);}}/>
            <StatSel stats={stats} setStats={setStats}/>
          </div>}
          {isCompare?<React.Fragment>
            <div>
              <div style={{background:T.pn,borderRadius:10,border:"1px solid "+color+"44",padding:"8px 10px",marginBottom:8}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <KitSVG color={color} size={20}/><input value={name} onChange={function(e){setName(e.target.value);}} style={{flex:1,background:T.ib,border:"1px solid "+T.bd,borderRadius:5,padding:"4px 7px",color:T.tx,fontSize:12,fontWeight:700,outline:"none"}}/></div>
                <button onClick={function(){setTeamPicker({team:1});}} style={{width:"100%",padding:"5px",borderRadius:5,border:"1px solid #16a34a44",background:"rgba(22,163,74,0.1)",color:"#16a34a",fontSize:9,fontWeight:700,cursor:"pointer"}}>Carica squadra A</button></div>
              <PitchView lineup={lineup} alts={alts} form={form} onDrop={handleDrop} onClick={slotClick} name={name} color={color} stats={stats} kits={kits} cap={cap} customPos={customPos} onPitchDrop={handlePitchDrop} coach={coach} numbers={numbers} small={true}/>
            </div>
            <div>
              <div style={{background:T.pn,borderRadius:10,border:"1px solid "+color2+"44",padding:"8px 10px",marginBottom:8}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <KitSVG color={color2} size={20}/><input value={name2} onChange={function(e){setName2(e.target.value);}} style={{flex:1,background:T.ib,border:"1px solid "+T.bd,borderRadius:5,padding:"4px 7px",color:T.tx,fontSize:12,fontWeight:700,outline:"none"}}/></div>
                <button onClick={function(){setTeamPicker({team:2});}} style={{width:"100%",padding:"5px",borderRadius:5,border:"1px solid #2563eb44",background:"rgba(37,99,235,0.1)",color:"#60a5fa",fontSize:9,fontWeight:700,cursor:"pointer"}}>Carica squadra B</button></div>
              <PitchView lineup={lineup2} alts={{}} form={form2} onDrop={handleDrop2} onClick={function(slot){var pos2=(FORMATIONS[form2]?FORMATIONS[form2].positions:[]).find(function(p){return p.slot===slot;});setPicking({slot:slot,role:pos2?pos2.role:null,isAlt:false,team:2});}} name={name2} color={color2} stats={stats} kits={kits} cap={null} customPos={{}} onPitchDrop={function(){}} coach={coach2} numbers={{}} small={true}/>
            </div>
          </React.Fragment>:<React.Fragment>
            <div><PitchView lineup={lineup} alts={alts} form={form} onDrop={handleDrop} onClick={slotClick} name={name} color={color} stats={stats} kits={kits} cap={cap} customPos={customPos} onPitchDrop={handlePitchDrop} coach={coach} numbers={numbers}/></div>
            {col3}
            {!mobile&&<div style={{display:"flex",flexDirection:"column",gap:10}}><SquadStats lineup={lineup}/></div>}
          </React.Fragment>}
        </main>
        {isCompare&&<div style={{maxWidth:1280,margin:"8px auto",padding:"0 10px"}}><CompareHeader t1={{name:name,color:color}} t2={{name:name2,color:color2}} lu1={lineup} lu2={lineup2}/></div>}
        {teamPicker&&<TeamPicker onSelect={loadTeam} onClose={function(){setTeamPicker(false);}}/>}
        {picking&&<PlayerSearch onSelect={selectPlayer} onClose={function(){setPicking(null);}} role={picking.role} lineup={picking.team===2?lineup2:lineup} isAlt={picking.isAlt||false} teamName={name} customPlayers={customPlayers}/>}
        {altPick&&<AltPicker player={altPick} lineup={lineup} positions={positions} onSelect={altSlotSelect} onClose={function(){setAltPick(null);}}/>}
        {pending&&<ConfirmModal team={pending} onOk={function(){doLoad(pending);}} onNo={function(){setPending(null);}}/>}
        {playerDetail&&<PlayerDetailModal player={playerDetail.player} slot={playerDetail.slot} pos={playerDetail.role}
          onClose={function(){setPlayerDetail(null);}}
          onRemove={function(s){removePlayer(s);setPlayerDetail(null);}}
          onReplace={function(s){var pos2=(FORMATIONS[form]?FORMATIONS[form].positions:[]).find(function(p){return p.slot===s;});setPicking({slot:s,role:pos2?pos2.role:null,isAlt:false});setPlayerDetail(null);}}
          onAddAlt={function(s){var pos2=(FORMATIONS[form]?FORMATIONS[form].positions:[]).find(function(p){return p.slot===s;});setPicking({slot:s,role:pos2?pos2.role:null,isAlt:true});setPlayerDetail(null);}}
          onEdit={function(p){setEditingPlayer(p);setPlayerDetail(null);}}
          cap={cap} onSetCap={setCap}/>}
        {addingPlayer&&<AddPlayerModal onClose={function(){setAddingPlayer(false);}} onAdd={function(p){setCustomPlayers(function(prev){return prev.concat([p]);});setAddingPlayer(false);setToast(p.shortName+" aggiunto!");}}/>}
        {editingPlayer&&<EditPlayerModal player={editingPlayer} onClose={function(){setEditingPlayer(null);}} onSave={function(changes){
          var id=editingPlayer.id;
          setLineup(function(prev){return prev.map(function(p){return p&&p.id===id?Object.assign({},p,changes):p;});});
          setLineup2(function(prev){return prev.map(function(p){return p&&p.id===id?Object.assign({},p,changes):p;});});
          setCustomPlayers(function(prev){return prev.map(function(p){return p.id===id?Object.assign({},p,changes):p;});});
          setEditingPlayer(null);setToast("Modifiche salvate!");}}/>}
        {exporting&&<ExportCanvas lineup={lineup} form={form} name={name} color={color} coach={coach} customPos={customPos} numbers={numbers} stats={stats} onDone={function(){setExporting(false);setToast("PNG scaricato!");}}/>}
        {toast&&<Toast msg={toast} onDone={function(){setToast(null);}}/>}
        {showDisclaimer&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(10px)"}}>
          <div style={{background:T.pn,borderRadius:20,width:"100%",maxWidth:440,border:"1px solid "+T.bd,padding:"28px 24px",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
            <div style={{width:48,height:48,background:"linear-gradient(135deg,#16a34a,#059669)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px",boxShadow:"0 0 20px rgba(22,163,74,0.5)"}}><span role="img" aria-label="ball">&#x26BD;</span></div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color:T.tx,marginBottom:4}}>LINEUP BUILDER</div>
            <div style={{fontSize:11,color:"#16a34a",fontWeight:700,letterSpacing:"1.5px",marginBottom:16}}>UNIVERSOSPORTIVO.COM</div>
            <div style={{fontSize:13,color:T.dm,lineHeight:1.7,marginBottom:8,textAlign:"left"}}>I valori, i rating e tutte le informazioni dei giocatori provengono da <span style={{color:T.tx,fontWeight:700}}>EA FC 26</span> (modalita Carriera) e potrebbero non essere aggiornati o contenere imprecisioni.</div>
            <div style={{fontSize:13,color:T.dm,lineHeight:1.7,marginBottom:8,textAlign:"left"}}>Puoi <span style={{color:"#818cf8",fontWeight:700}}>aggiungere giocatori</span> non presenti nel database e <span style={{color:"#818cf8",fontWeight:700}}>modificare</span> rating, valore, stipendio e tutti i parametri di ogni giocatore in campo.</div>
            <div style={{fontSize:10,color:T.ft,marginBottom:20,textAlign:"left"}}>All EA FC assets are property of EA Sports.</div>
            <button onClick={function(){localStorage.setItem("lb_disc_ok","1");setShowDisclaimer(false);}} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#16a34a,#059669)",color:"#fff",cursor:"pointer",fontSize:15,fontWeight:700,boxShadow:"0 4px 16px rgba(22,163,74,0.4)"}}>Ho capito</button>
          </div></div>}
        <footer style={{textAlign:"center",padding:"18px 14px 22px",borderTop:"1px solid "+T.bd,marginTop:20}}>
          <div style={{fontSize:10,color:T.ft,lineHeight:1.8}}>I valori, i rating e le informazioni dei giocatori provengono da EA FC 26 (modalita Carriera) e potrebbero non essere aggiornati.</div>
          <div style={{fontSize:9,color:T.ft,marginTop:4}}>All EA FC assets are property of EA Sports.</div>
          <div style={{fontSize:9,color:T.ft,marginTop:4}}>universosportivo.com</div>
        </footer>
      </div>
    </ThCtx.Provider>);
}

