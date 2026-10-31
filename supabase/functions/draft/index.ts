import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-admin-secret","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(v:any,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,"Content-Type":"application/json"}});
const shuffle=<T>(a:T[])=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[x[i],x[j]]=[x[j],x[i]];}return x;};
const uid=()=>crypto.randomUUID();
function publicState(s:any){return {captains:s.captains,captainsOrder:s.captainsOrder,round:s.round,turnIndex:s.turnIndex,order:s.order,roundPicks:s.roundPicks.map((p:any)=>({box:p.box,revealed:p.revealed})),results:s.results,teams:s.teams};}
serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply({error:"POST only"},405);
 try{
 const body=await req.json(),action=body.action,secret=Deno.env.get("ADMIN_SECRET")||"",admin=req.headers.get("x-admin-secret")===secret&&secret.length>=16;
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const load=async()=>{const {data,error}=await db.from("cricket_draft_state").select("state").eq("id",1).single();if(error)throw error;return data.state;};
 const save=async(s:any)=>{const {error}=await db.from("cricket_draft_state").upsert({id:1,state:s,updated_at:new Date().toISOString()});if(error)throw error;};
 if(action==="initialize"){
 if(!admin)return reply({error:"Admin authorization required"},403);
 const c=body.captains,r=body.roster;
 if(!Array.isArray(c)||c.length!==4||!r||Array.from({length:12},(_,i)=>r["Box "+(i+1)]).some((v:any)=>!Array.isArray(v)||v.length!==4))return reply({error:"Need Box 1 through Box 12, with 4 players in each"},400);
 const orderedPools=Array.from({length:12},(_,i)=>r["Box "+(i+1)] as string[]);
 const all=orderedPools.flat();if(all.length!==48||new Set(all.map((x:any)=>String(x).trim().toLowerCase())).size!==48)return reply({error:"Roster must contain 48 unique names"},400);
 const ids=c.map(()=>uid()),captains=Object.fromEntries(ids.map((id,i)=>[id,c[i]])),s={captains,captainsOrder:ids,round:1,turnIndex:0,order:shuffle(ids),roundPicks:[],results:[],teams:Object.fromEntries(ids.map(id=>[id,[]])),hiddenPools:orderedPools.map((a:string[])=>shuffle(a))};
 await save(s);return reply(publicState(s));
 }
 const s=await load();
 if(action==="state")return reply(publicState(s));
 if(action==="pick"){
 if(s.turnIndex>=4)return reply({error:"Round complete"},409);
 const box=Number(body.box);if(!Number.isInteger(box)||box<1||box>4)return reply({error:"Invalid box"},400);
 if(s.roundPicks.some((p:any)=>p.box===box))return reply({error:"Box already opened"},409);
 const captain=s.order[s.turnIndex],player=s.hiddenPools[s.round-1][box-1],pickId=uid();
 s.roundPicks.push({pickId,captain,box,player,selectedAt:Date.now(),revealed:false});await save(s);return reply({pickId});
 }
 if(action==="reveal"){
 const p=s.roundPicks.find((x:any)=>x.pickId===body.pickId);if(!p||p.revealed)return reply({error:"Invalid selection"},409);
 if(Date.now()-p.selectedAt<4800)return reply({error:"Reveal countdown has not finished"},425);
 p.revealed=true;s.teams[p.captain].push(p.player);s.results.push({round:s.round,captain:p.captain,player:p.player,box:p.box});s.turnIndex++;await save(s);
 return reply({player:p.player,team:s.captains[p.captain],state:publicState(s)});
 }
 if(action==="nextRound"){
 if(s.turnIndex!==4||s.roundPicks.length!==4)return reply({error:"All four captains must finish"},409);
 if(s.round>=12)return reply({error:"All rounds complete"},409);
 s.round++;s.turnIndex=0;s.roundPicks=[];s.order=shuffle(s.captainsOrder);await save(s);return reply(publicState(s));
 }
 return reply({error:"Unknown action"},400);
 }catch(e){return reply({error:String(e?.message||e)},500);}
});