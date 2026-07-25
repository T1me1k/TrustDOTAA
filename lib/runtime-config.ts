import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

export type AdminRole = 'Owner' | 'Admin' | 'Operator' | 'Support' | 'Read Only';
export type PatchStatus = 'Draft' | 'Scheduled' | 'Published' | 'Archived';
export type RuntimeConfig = {
  updatedAt: string; updatedBy: string;
  featureFlags: Record<string,{enabled:boolean;description:string;environment:string;updatedAt:string;updatedBy:string;dangerous?:boolean}>;
  matchmaking: { enabled:boolean; pauseNewQueues:boolean; drainMode:boolean; disabledMessage:string; matchFoundDelayMs:number; acceptTimerSeconds:number; requiredPlayers:number; minTrustScore:number; maxRatingSpread:number; expectedQueueSeconds:number; mockErrorProbability:number; autoAdvance:boolean; cancelEnabled:boolean; launchDotaEnabled:boolean; completedMatchEnabled:boolean; };
  content: { stats:{label:string;value:string;delta:string}[]; heroTitle:string; heroText:string; maintenanceBanner:string; queueDisabledText:string; announcements:string[]; navLinks:{href:string;label:string}[]; seasonalCaption:string; primeHubs:number; };
  patch: { version:string; title:string; summary:string; changelog:string; categories:string[]; publishedAt:string; status:PatchStatus; history:{version:string;title:string;publishedAt:string}[]; };
  regions: { id:string; name:string; enabled:boolean; status:string; latencyMs:number; load:number }[];
  roles: { id:string; name:string; enabled:boolean; order:number; regions:string[] }[];
  maintenance: { enabled:boolean; infoOnly:boolean; blockMatchmaking:boolean; title:string; message:string; eta:string; startsAt:string; endsAt:string; };
  admin: { storeWarning:string; roles:AdminRole[]; currentRole:AdminRole; };
};

const now = new Date().toISOString();
export const defaultRuntimeConfig: RuntimeConfig = {
  updatedAt: now, updatedBy: 'system',
  featureFlags: Object.fromEntries([
    ['matchmaking_enabled','Global matchmaking availability'],['play_button_enabled','Public Play button availability'],['steam_connect_enabled','Steam connect button'],['registrations_enabled','New account registrations'],['leaderboard_enabled','Leaderboard page'],['profiles_enabled','Profile page'],['match_history_enabled','Match history widgets'],['trust_score_enabled','Trust Score display'],['maintenance_banner_enabled','Public maintenance banner'],['new_match_overlay_enabled','Match found overlay'],['admin_demo_tools_enabled','Admin mock controls'],
  ].map(([key,description])=>[key,{enabled:true,description,environment:process.env.NODE_ENV||'development',updatedAt:now,updatedBy:'system',dangerous:['matchmaking_enabled','play_button_enabled','registrations_enabled'].includes(key)}])),
  matchmaking: { enabled:true, pauseNewQueues:false, drainMode:false, disabledMessage:'Matchmaking is temporarily disabled by TRUST operators.', matchFoundDelayMs:4500, acceptTimerSeconds:10, requiredPlayers:10, minTrustScore:70, maxRatingSpread:650, expectedQueueSeconds:94, mockErrorProbability:0, autoAdvance:true, cancelEnabled:true, launchDotaEnabled:true, completedMatchEnabled:true },
  content: { stats:[{label:'Players online',value:'18,420',delta:'+12%'},{label:'Matches today',value:'3,847',delta:'+8%'},{label:'Avg queue',value:'01:34',delta:'fast'},{label:'Prime hubs',value:'24',delta:'live'}], heroTitle:'Competitive Dota 2 with verified trust.', heroText:'Выберите регион и основную роль, запустите поиск и найдите настоящий матч через TRUST backend.', maintenanceBanner:'', queueDisabledText:'Queue is paused by TRUST operators.', announcements:['Season One demo environment'], navLinks:[{href:'/#queue',label:'Queue'},{href:'/leaderboard',label:'Leaderboard'},{href:'/#patch',label:'Patch'}], seasonalCaption:'Interactive Season One demo', primeHubs:24 },
  patch: { version:'1.04', title:'Stricter smurf signals', summary:'Role-performance MMR, faster remake votes and improved behavior weighting for high-rank lobbies.', changelog:'- Stricter smurf signals\n- Faster remake votes\n- Improved behavior weighting', categories:['Matchmaking','Trust Score','UI','Bug fixes'], publishedAt:now, status:'Published', history:[{version:'1.03',title:'Prime hubs tuning',publishedAt:now}] },
  regions:[{id:'eu-west',name:'EU West',enabled:true,status:'Live',latencyMs:32,load:61},{id:'eu-east',name:'EU East',enabled:true,status:'Live',latencyMs:48,load:54},{id:'us-east',name:'US East',enabled:true,status:'Live',latencyMs:78,load:43},{id:'us-west',name:'US West',enabled:true,status:'Live',latencyMs:92,load:38},{id:'sea',name:'SEA',enabled:true,status:'Live',latencyMs:96,load:70}],
  roles:[{id:'carry',name:'Carry',enabled:true,order:1,regions:['eu-west','eu-east','us-east','us-west','sea']},{id:'mid',name:'Mid',enabled:true,order:2,regions:['eu-west','eu-east','us-east','us-west','sea']},{id:'offlane',name:'Offlane',enabled:true,order:3,regions:['eu-west','eu-east','us-east','us-west','sea']},{id:'soft-support',name:'Soft Support',enabled:true,order:4,regions:['eu-west','eu-east','us-east','us-west','sea']},{id:'hard-support',name:'Hard Support',enabled:true,order:5,regions:['eu-west','eu-east','us-east','us-west','sea']}],
  maintenance:{enabled:false,infoOnly:true,blockMatchmaking:false,title:'Scheduled maintenance',message:'TRUST operators are tuning the demo environment.',eta:'',startsAt:'',endsAt:''},
  admin:{storeWarning:'Railway PostgreSQL admin API is connected.',roles:['Owner','Admin','Operator','Support','Read Only'],currentRole:'Owner'}
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Adapt the small backend envelope into a complete, safe UI configuration. */
export function adaptPublicRuntimeConfig(payload: unknown): RuntimeConfig {
  const envelope = isRecord(payload) && isRecord(payload.config) ? payload.config : payload;
  const source = isRecord(envelope) ? envelope : {};
  const mergeObject = (fallback: Record<string, unknown>, value: unknown): Record<string, unknown> => {
    if (!isRecord(value)) return { ...fallback };
    const result = { ...fallback };
    for (const key of Object.keys(fallback)) {
      const next = value[key];
      if (next === undefined || next === null) continue;
      const original = fallback[key];
      if (Array.isArray(original)) { if (Array.isArray(next)) result[key] = next; }
      else if (isRecord(original)) result[key] = mergeObject(original, next);
      else if (typeof next === typeof original) result[key] = next;
    }
    return result;
  };
  const result = mergeObject(defaultRuntimeConfig as unknown as Record<string, unknown>, source) as unknown as RuntimeConfig;
  if (typeof source.matchmaking_enabled === 'boolean') {
    result.matchmaking.enabled = source.matchmaking_enabled;
    result.featureFlags.matchmaking_enabled.enabled = source.matchmaking_enabled;
  }
  if (typeof source.play_button_enabled === 'boolean') result.featureFlags.play_button_enabled.enabled = source.play_button_enabled;
  return result;
}

const dataDir = path.join(process.cwd(), '.data');
const configFile = path.join(dataDir, 'runtime-config.json');
export async function getRuntimeConfig(): Promise<RuntimeConfig> { try { const raw=await fs.readFile(configFile,'utf8'); return { ...defaultRuntimeConfig, ...JSON.parse(raw) }; } catch { return defaultRuntimeConfig; } }
export async function saveRuntimeConfig(next: RuntimeConfig, admin='admin') { await fs.mkdir(dataDir,{recursive:true}); const clean={...next,updatedAt:new Date().toISOString(),updatedBy:admin}; await fs.writeFile(configFile, JSON.stringify(clean,null,2)); return clean; }
export function publicRuntimeConfig(config: RuntimeConfig) { const { matchmaking, content, patch, regions, roles, maintenance, featureFlags, updatedAt, updatedBy } = config; return { matchmaking, content, patch, regions, roles, maintenance, featureFlags, updatedAt, updatedBy }; }
