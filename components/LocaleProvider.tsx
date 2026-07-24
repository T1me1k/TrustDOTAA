'use client';
import { createContext, useContext, useMemo, useState } from 'react';
import { en, ru, TranslationKey } from '@/lib/i18n';
type Locale='en'|'ru';
const Context=createContext<{locale:Locale;setLocale:(v:Locale)=>void;t:(key:TranslationKey,values?:Record<string,string|number>)=>string;number:(v:number)=>string;date:(v:string|number|Date)=>string}|null>(null);
function render(message:string, locale:Locale, values:Record<string,string|number>={}) {
  message=message.replace(/\{(\w+), plural, ([^}]+(?:\}[^}]*)*)\}/g,(_,key,forms)=>{const n=Number(values[key]); const category=new Intl.PluralRules(locale).select(n); const match=forms.match(new RegExp(`${category} \\{([^}]*)\\}`))||forms.match(/other \{([^}]*)\}/); return (match?.[1]||'').replace('#',String(n));});
  return message.replace(/\{(\w+)\}/g,(_,key)=>String(values[key]??`{${key}}`));
}
export function LocaleProvider({initialLocale,children}:{initialLocale:Locale;children:React.ReactNode}) { const [locale,setState]=useState(initialLocale); const value=useMemo(()=>({locale,setLocale:(next:Locale)=>{setState(next);document.cookie=`trust_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;localStorage.setItem('trust_locale',next);document.documentElement.lang=next;},t:(key:TranslationKey,values?:Record<string,string|number>)=>render((locale==='ru'&&ru[key])||en[key],locale,values),number:(v:number)=>new Intl.NumberFormat(locale).format(v),date:(v:string|number|Date)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(v))}),[locale]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useLocale(){const value=useContext(Context);if(!value)throw new Error('useLocale requires LocaleProvider');return value;}
