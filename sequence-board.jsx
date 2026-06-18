import { useState } from "react";

// ── Board layout ────────────────────────────────────────────────────────────
// Read directly from the physical Jax Sequence board (photo verified).
// Outer ring: Diamonds top + left-upper (6D–AD top, 5D–2D left rows 1–4)
//             Spades bottom + left-lower (9S–2S bottom, AS–10S left rows 5–8)
//             Clubs right column (AC–6C top-to-bottom)
// Key: 2–9 face value, T=10, Q=Queen, K=King, A=Ace; S=♠ H=♥ D=♦ C=♣
const BOARD = [
  ["FREE","6D", "7D", "8D", "9D", "TD", "QD", "KD", "AD", "FREE"],
  ["5D",  "3H", "2S", "2C", "3S", "4S", "5S", "6S", "7S", "AC" ],
  ["4D",  "4H", "KD", "AD", "KC", "QC", "TC", "9C", "KS", "KC" ],
  ["3D",  "QH", "5H", "QD", "TH", "9H", "8H", "8C", "QS", "QC" ],
  ["2D",  "3H", "TD", "KH", "2H", "7H", "6H", "8S", "AS", "TC" ],
  ["AS",  "2D", "6H", "9D", "AH", "4H", "5H", "7C", "TS", "9C" ],
  ["KS",  "9H", "8D", "6D", "2H", "3C", "4C", "5C", "AC", "8C" ],
  ["QS",  "7H", "8H", "9S", "3D", "4D", "5D", "7D", "6C", "7C" ],
  ["TS",  "TH", "QH", "KH", "AH", "2C", "3C", "4C", "5C", "6C" ],
  ["FREE","9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S", "FREE"],
];

const SUIT_SYM = { S:"♠", H:"♥", D:"♦", C:"♣" };
const SUIT_RED = { H:true, D:true, S:false, C:false };

const TEAMS = {
  team1: { color:"#2563eb", glow:"#3b82f6", light:"#bfdbfe", name:"Blue"  },
  team2: { color:"#16a34a", glow:"#22c55e", light:"#bbf7d0", name:"Green" },
};

function parseCard(card) {
  if (card === "FREE") return null;
  return { val: card.slice(0,-1), suit: card.slice(-1) };
}
function disp(v) { return v === "T" ? "10" : v; }

function findSequences(chips) {
  const results = [];
  const DIRS = [[0,1],[1,0],[1,1],[1,-1]];
  for (const team of ["team1","team2"]) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        for (const [dr,dc] of DIRS) {
          const cells = [];
          for (let i = 0; i < 5; i++) {
            const nr = r+dr*i, nc = c+dc*i;
            if (nr<0||nr>9||nc<0||nc>9) { cells.length=0; break; }
            if (BOARD[nr][nc]==="FREE" || chips[nr][nc]===team) cells.push([nr,nc]);
            else { cells.length=0; break; }
          }
          if (cells.length===5) results.push({team,cells});
        }
      }
    }
  }
  const seen = new Set();
  return results.filter(s => {
    const k = s.team+":"+[...s.cells].sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(x=>x.join(",")).join("|");
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

export default function App() {
  const [screen,  setScreen]  = useState("setup");
  const [numP,    setNumP]    = useState(2);
  const [chips,   setChips]   = useState(() => Array.from({length:10},()=>Array(10).fill(null)));
  const [curP,    setCurP]    = useState(0);
  const [mode,    setMode]    = useState("normal");
  const [seqs,    setSeqs]    = useState([]);
  const [winner,  setWinner]  = useState(null);

  const pList = numP===2
    ? [{team:"team1",name:"Player 1"},{team:"team2",name:"Player 2"}]
    : [{team:"team1",name:"P1"},{team:"team2",name:"P2"},
       {team:"team1",name:"P3"},{team:"team2",name:"P4"}];

  const curTeam = pList[curP].team;
  const curName = pList[curP].name;
  const T       = TEAMS[curTeam];

  const lockedSet = new Set(seqs.flatMap(s=>s.cells.map(([r,c])=>`${r},${c}`)));
  const isLocked  = (r,c) => lockedSet.has(`${r},${c}`);

  const handleCell = (r,c) => {
    if (winner) return;
    if (BOARD[r][c]==="FREE") return;
    const chip=chips[r][c], locked=isLocked(r,c);
    let changed=false, advance=false;
    const next=chips.map(row=>[...row]);

    if (mode==="oneEye") {
      if (chip&&chip!==curTeam&&!locked){next[r][c]=null;changed=true;advance=true;}
    } else if (mode==="fix") {
      if (chip===curTeam&&!locked)      {next[r][c]=null;changed=true;}
    } else {
      if (!chip){next[r][c]=curTeam;changed=true;advance=true;}
    }

    if (!changed) return;
    setChips(next);
    const ns=findSequences(next);
    setSeqs(ns);
    const t1=ns.filter(s=>s.team==="team1").length;
    const t2=ns.filter(s=>s.team==="team2").length;
    const w=t1>=2?"team1":t2>=2?"team2":null;
    if (w) setWinner(w);
    if (advance&&!w) setCurP(p=>(p+1)%pList.length);
    setMode("normal");
  };

  const reset=()=>{
    setChips(Array.from({length:10},()=>Array(10).fill(null)));
    setCurP(0);setMode("normal");setSeqs([]);setWinner(null);
  };

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────
  if (screen==="setup") return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#071a0f 0%,#0d2c1a 60%,#071a0f 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Georgia',serif",
    }}>
      <div style={{
        background:"rgba(255,255,255,0.04)",backdropFilter:"blur(12px)",
        border:"1px solid rgba(255,255,255,0.10)",
        borderRadius:24,padding:"44px 36px",textAlign:"center",
        maxWidth:480,width:"90%",
      }}>
        <div style={{
          fontSize:"clamp(32px,6vw,52px)",fontWeight:"bold",letterSpacing:"0.22em",
          color:"#f59e0b",textShadow:"0 0 32px rgba(245,158,11,0.45)",marginBottom:6,
        }}>SEQUENCE</div>
        <div style={{color:"#6ee7b7",fontSize:12,letterSpacing:"0.18em",marginBottom:40}}>
          DIGITAL BOARD TRACKER
        </div>

        <div style={{color:"#94a3b8",fontSize:14,marginBottom:14}}>Select mode</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:32}}>
          {[{n:2,label:"2 Players",sub:"Head to Head"},{n:4,label:"4 Players",sub:"2 Teams of 2"}]
            .map(({n,label,sub})=>(
            <button key={n} onClick={()=>setNumP(n)} style={{
              padding:"18px 26px",borderRadius:14,cursor:"pointer",
              fontSize:15,fontWeight:"bold",
              border:`2px solid ${numP===n?"#f59e0b":"rgba(255,255,255,0.12)"}`,
              background:numP===n?"rgba(245,158,11,0.12)":"rgba(255,255,255,0.03)",
              color:numP===n?"#fef3c7":"#64748b",
              transition:"all 0.18s",
            }}>
              <div>{label}</div>
              <div style={{fontSize:11,opacity:0.65,marginTop:4}}>{sub}</div>
            </button>
          ))}
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:36}}>
          {(numP===2
            ?[{name:"Player 1",t:"team1"},{name:"Player 2",t:"team2"}]
            :[{name:"Player 1",t:"team1"},{name:"Player 2",t:"team2"},
              {name:"Player 3",t:"team1"},{name:"Player 4",t:"team2"}]
          ).map((p,i)=>(
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:8,
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.09)",
              padding:"8px 14px",borderRadius:10,
              color:"#e2e8f0",fontSize:13,
            }}>
              <div style={{width:12,height:12,borderRadius:"50%",background:TEAMS[p.t].color,flexShrink:0}}/>
              <div>
                <div style={{fontWeight:"bold"}}>{p.name}</div>
                <div style={{fontSize:10,opacity:0.55}}>{TEAMS[p.t].name} Team</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={()=>setScreen("game")} style={{
          padding:"14px 52px",
          background:"linear-gradient(135deg,#f59e0b,#d97706)",
          color:"#1a1a1a",border:"none",borderRadius:12,
          fontSize:17,fontWeight:"bold",cursor:"pointer",
          letterSpacing:"0.1em",
          boxShadow:"0 4px 28px rgba(245,158,11,0.38)",
        }}>START GAME</button>
      </div>
    </div>
  );

  // ── GAME SCREEN ───────────────────────────────────────────────────────────
  return (
    <div style={{
      height:"100dvh",background:"#071a0f",
      display:"flex",flexDirection:"column",alignItems:"center",
      padding:"3px 4px 2px",boxSizing:"border-box",
      fontFamily:"'Georgia',serif",overflow:"hidden",
    }}>

      {/* HEADER */}
      <div style={{
        width:"100%",maxWidth:1000,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        gap:6,marginBottom:3,flexShrink:0,flexWrap:"wrap",
      }}>
        <button onClick={()=>setScreen("setup")} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
          color:"#64748b",padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12,
        }}>← Setup</button>

        {!winner ? (
          <div style={{
            display:"flex",alignItems:"center",gap:8,
            background:"rgba(0,0,0,0.45)",padding:"4px 16px",
            borderRadius:24,border:`1.5px solid ${T.color}45`,
          }}>
            <div style={{width:11,height:11,borderRadius:"50%",background:T.color,boxShadow:`0 0 8px ${T.glow}`}}/>
            <span style={{color:T.light,fontWeight:"bold",fontSize:14}}>{curName}</span>
            <span style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>· {T.name} Team</span>
          </div>
        ) : (
          <div style={{
            display:"flex",alignItems:"center",gap:10,
            background:`linear-gradient(135deg,${TEAMS[winner].color},${TEAMS[winner].color}bb)`,
            padding:"7px 22px",borderRadius:24,
            color:"#fff",fontWeight:"bold",fontSize:15,
          }}>
            🎉 {TEAMS[winner].name} Team Wins!
            <button onClick={reset} style={{
              marginLeft:6,background:"rgba(0,0,0,0.25)",border:"none",
              color:"#fff",padding:"3px 10px",borderRadius:6,cursor:"pointer",fontSize:12,
            }}>New Game</button>
          </div>
        )}

        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {["team1","team2"].map(t=>(
            <div key={t} style={{
              display:"flex",alignItems:"center",gap:5,
              background:"rgba(0,0,0,0.35)",padding:"4px 12px",borderRadius:12,
            }}>
              <div style={{width:8,height:8,borderRadius:"50%",background:TEAMS[t].color}}/>
              <span style={{color:"#e2e8f0",fontSize:13,fontWeight:"bold"}}>
                {seqs.filter(s=>s.team===t).length}/2
              </span>
            </div>
          ))}
          <button onClick={reset} style={{
            background:"rgba(255,50,50,0.1)",border:"1px solid rgba(255,100,100,0.25)",
            color:"#fca5a5",padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:13,
          }}>↺</button>
        </div>
      </div>

      {/* BOARD */}
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(10,1fr)",
        gap:2,background:"#14542a",
        border:"3px solid #0a3319",borderRadius:6,padding:3,
        width:"min(calc(100vw - 16px), calc(100dvh - 98px))",
        height:"min(calc(100vw - 16px), calc(100dvh - 98px))",
        boxSizing:"border-box",flexShrink:0,
      }}>
        {BOARD.map((row,r)=>row.map((card,c)=>{
          const chip=chips[r][c], locked=isLocked(r,c);
          const p=parseCard(card), isFree=card==="FREE";
          const isRed=p&&SUIT_RED[p.suit];
          const seqCell=seqs.find(s=>s.cells.some(([sr,sc])=>sr===r&&sc===c));

          const removable=mode==="oneEye"&&chip&&chip!==curTeam&&!locked;
          const fixable=mode==="fix"&&chip===curTeam&&!locked;
          const tappable=removable||fixable||(mode!=="oneEye"&&mode!=="fix"&&!chip&&!isFree);

          let bg="#faf7ef";
          if (isFree) bg="#fef9ec";
          if (locked&&seqCell) bg=`${TEAMS[seqCell.team].light}70`;

          let bdr="1px solid #ccc5a0";
          if (locked)    bdr="2px solid #f59e0b";
          if (removable) bdr="2.5px solid #ef4444";
          if (fixable)   bdr=`2.5px solid ${T.color}`;

          return (
            <div key={`${r}-${c}`} onClick={()=>handleCell(r,c)} style={{
              background:bg,borderRadius:3,border:bdr,
              cursor:tappable?"pointer":"default",
              position:"relative",display:"flex",alignItems:"center",justifyContent:"center",
              overflow:"hidden",userSelect:"none",
              WebkitUserSelect:"none",WebkitTapHighlightColor:"transparent",
              aspectRatio:"1/1",
            }}>
              {isFree ? (
                <span style={{fontSize:"clamp(9px,2.1vmin,20px)",color:"#b45309",lineHeight:1}}>✦</span>
              ) : (
                <>
                  <span style={{
                    position:"absolute",top:1,left:2,
                    fontSize:"clamp(5px,1.15vmin,11px)",
                    fontWeight:"bold",lineHeight:1,
                    color:isRed?"#dc2626":"#1e293b",
                  }}>{disp(p.val)}</span>
                  <span style={{
                    fontSize:"clamp(9px,2.3vmin,22px)",lineHeight:1,
                    color:isRed?"#dc2626":"#1e293b",
                  }}>{SUIT_SYM[p.suit]}</span>
                  <span style={{
                    position:"absolute",bottom:1,right:2,
                    fontSize:"clamp(5px,1.15vmin,11px)",
                    fontWeight:"bold",lineHeight:1,
                    color:isRed?"#dc2626":"#1e293b",
                    transform:"rotate(180deg)",
                  }}>{disp(p.val)}</span>
                </>
              )}

              {chip && (
                <div style={{
                  position:"absolute",inset:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  pointerEvents:"none",
                }}>
                  <div style={{
                    width:"76%",height:"76%",borderRadius:"50%",
                    background:TEAMS[chip].color,
                    opacity:locked?1:0.86,
                    border:locked?"2.5px solid #f59e0b":"1.5px solid rgba(255,255,255,0.38)",
                    boxShadow:locked
                      ?"0 0 0 1.5px #f59e0b,0 2px 10px rgba(0,0,0,0.45)"
                      :"0 2px 6px rgba(0,0,0,0.38)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"clamp(7px,1.7vmin,17px)",
                    color:"rgba(255,255,255,0.85)",
                  }}>
                    {locked&&"★"}
                  </div>
                </div>
              )}

              {!chip&&!isFree&&(
                <div style={{
                  position:"absolute",inset:0,
                  background:`${T.color}16`,
                  borderRadius:2,pointerEvents:"none",
                }}/>
              )}
            </div>
          );
        }))}
      </div>

      {/* ACTION BUTTONS */}
      <div style={{
        display:"flex",gap:8,marginTop:4,flexShrink:0,
        alignItems:"center",justifyContent:"center",flexWrap:"wrap",
      }}>
        <span style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>PLAY:</span>
        {[
          {key:"twoEye",label:"2-Eye Jack",sub:"Place anywhere",em:"🃏"},
          {key:"oneEye",label:"1-Eye Jack",sub:"Remove enemy chip",em:"✂️"},
          {key:"fix",   label:"Fix Chip",  sub:"Remove own (no turn)",em:"↩"},
        ].map(btn=>{
          const on=mode===btn.key;
          return (
            <button key={btn.key} onClick={()=>setMode(on?"normal":btn.key)} style={{
              padding:"7px 13px",borderRadius:10,cursor:"pointer",
              border:`1.5px solid ${on?T.color:"rgba(255,255,255,0.13)"}`,
              background:on?`${T.color}22`:"rgba(255,255,255,0.03)",
              color:on?T.light:"#64748b",
              fontSize:13,fontWeight:on?"bold":"normal",
              display:"flex",flexDirection:"column",alignItems:"center",gap:1,
              transition:"all 0.15s",
            }}>
              <span>{btn.em} {btn.label}</span>
              <span style={{fontSize:10,opacity:0.6}}>{btn.sub}</span>
            </button>
          );
        })}
        {mode!=="normal"&&(
          <div style={{
            padding:"6px 14px",borderRadius:10,
            background:`${T.color}18`,border:`1px solid ${T.color}45`,
            color:T.light,fontSize:11,lineHeight:1.4,
            textAlign:"center",maxWidth:170,
          }}>
            {mode==="twoEye"&&"Tap any empty space"}
            {mode==="oneEye"&&"Tap a red-outlined chip to remove it"}
            {mode==="fix"&&"Tap your chip to remove (turn stays)"}
          </div>
        )}
      </div>
    </div>
  );
}
