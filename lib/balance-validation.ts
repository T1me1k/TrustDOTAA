import type { AbilityValue, BalancePatch, Hero, PatchStatus } from './balance-types';
export const IMPORT_LIMIT = 1024 * 1024;
export function validateAbilityValue(value: AbilityValue, maxLevel:number){ return typeof value === 'number' ? Number.isFinite(value) : value.length === maxLevel && value.every(Number.isFinite); }
export function validateHero(hero:Partial<Hero>){
 const errors:Record<string,string>={};
 if(!hero.slug?.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) errors.slug='Use lowercase letters, numbers and hyphens.';
 if(!hero.nameEn?.trim()) errors.nameEn='English name is required.';
 if(!hero.nameRu?.trim()) errors.nameRu='Russian name is required.';
 const stats=hero.baseStats||{}; for(const [key,value] of Object.entries(stats)) if(typeof value==='number'&&!Number.isFinite(value)) errors[`baseStats.${key}`]='Must be a finite number.';
 if(typeof stats.damageMin==='number'&&typeof stats.damageMax==='number'&&stats.damageMin>stats.damageMax) errors['baseStats.damageMax']='Maximum damage must be greater than or equal to minimum damage.';
 return errors;
}
export const canEditPatch=(status:PatchStatus)=>status==='draft';
export const workflowActions=(status:PatchStatus):string[]=>({draft:['validate','submit'],in_review:['approve','return-to-draft'],approved:['schedule','publish'],scheduled:['publish'],published:['rollback'],superseded:['rollback'],archived:[]}[status]);
export function publishConfirmed(patch:Pick<BalancePatch,'version'|'status'>, typed:string, confirmed:boolean){return patch.status==='approved'&&typed===patch.version&&confirmed;}
export function validateImport(value:unknown,size:number){if(size>IMPORT_LIMIT)return {valid:false,error:'Import exceeds 1 MB.'}; if(!value||typeof value!=='object'||(value as {schemaVersion?:unknown}).schemaVersion!=='1.0')return {valid:false,error:'schemaVersion 1.0 is required.'}; return {valid:true};}
