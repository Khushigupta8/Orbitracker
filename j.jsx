import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { loadAll, saveHabits as saveHabitsDB, toggleCompletion, saveProjects as saveProjectsDB, saveSprints as saveSprintsDB, saveWishes as saveWishesDB, updateDailyLog as updateDailyLogDB, saveProfile as saveProfileDB, saveExpenses as saveExpensesDB, saveBudgets as saveBudgetsDB } from "./api";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, YAxis, CartesianGrid,
} from "recharts";

// ─── helpers ──────────────────────────────────────────────────────────────────
const DOWS     = ["S","M","T","W","T","F","S"];
const DOWF     = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const pad2     = n => String(n).padStart(2,"0");
const todayStr = () => new Date().toISOString().split("T")[0];
const todayDow = () => new Date().getDay();
const durMin   = (s,e) => { const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number); return Math.max(0,(eh*60+em)-(sh*60+sm)); };
const fmtDur   = m => !m?"-":m<60?`${m}m`:`${Math.floor(m/60)}h${m%60?` ${m%60}m`:""}`;
const fmtTime  = t => { const [h,m]=t.split(":").map(Number); return `${h%12||12}:${pad2(m)} ${h>=12?"pm":"am"}`; };
const fmtDate  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const daysLeft = d => d ? Math.ceil((new Date(d+"T00:00:00")-new Date())/86400000) : null;
const fmtTs    = ts => new Date(ts).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
const monthKey = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
const inMonth  = (dateStr, mk) => dateStr && dateStr.startsWith(mk);
const fmtMonth = mk => { const [y,m] = mk.split("-").map(Number); return new Date(y, m-1, 1).toLocaleDateString("en-US",{month:"long",year:"numeric"}); };
const fmtINR   = n => "₹" + Math.round(Number(n||0)).toLocaleString("en-IN");

// ─── themes ───────────────────────────────────────────────────────────────────
const THEMES = [
  {id:"rose",     name:"Rose Garden", bg:"linear-gradient(135deg,#fdf2f8 0%,#fce7f3 60%,#fbcfe8 100%)", dark:false},
  {id:"lavender", name:"Lavender",    bg:"linear-gradient(135deg,#f5f3ff 0%,#ede9fe 60%,#ddd6fe 100%)", dark:false},
  {id:"peach",    name:"Peach Bloom", bg:"linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)", dark:false},
  {id:"mint",     name:"Mint Fresh",  bg:"linear-gradient(135deg,#f0fdf4 0%,#dcfce7 60%,#bbf7d0 100%)", dark:false},
  {id:"sky",      name:"Sky Blue",    bg:"linear-gradient(135deg,#eff6ff 0%,#dbeafe 60%,#bfdbfe 100%)", dark:false},
  {id:"midnight", name:"Midnight",    bg:"linear-gradient(135deg,#0f0c29 0%,#302b63 60%,#24243e 100%)", dark:true},
  {id:"aurora",   name:"Aurora",      bg:"linear-gradient(135deg,#0d1117 0%,#1a1a2e 40%,#0d324d 100%)", dark:true},
  {id:"blush",    name:"Blush Night", bg:"linear-gradient(135deg,#1a0a1a 0%,#2d1040 50%,#1a1025 100%)", dark:true},
];

// ─── constants ────────────────────────────────────────────────────────────────
const CATS = {
  work:     {label:"Work",    color:"#9B8EC4",bg:"rgba(155,142,196,0.15)"},
  health:   {label:"Health",  color:"#6BAA84",bg:"rgba(107,170,132,0.15)"},
  learning: {label:"Learning",color:"#D4A054",bg:"rgba(212,160,84,0.15)"},
  personal: {label:"Personal",color:"#D4537E",bg:"rgba(212,83,126,0.15)"},
  social:   {label:"Social",  color:"#E8824A",bg:"rgba(232,130,74,0.15)"},
};
const STATUS = {
  "on-track":{label:"on track",color:"#6BAA84",bg:"rgba(107,170,132,0.15)"},
  "at-risk": {label:"at risk", color:"#D4A054",bg:"rgba(212,160,84,0.15)"},
  "blocked": {label:"blocked", color:"#D4537E",bg:"rgba(212,83,126,0.15)"},
  "done":    {label:"done",    color:"#9B8EC4",bg:"rgba(155,142,196,0.15)"},
  "paused":  {label:"paused",  color:"#888780",bg:"rgba(136,135,128,0.15)"},
};
const PRIO  = {high:{c:"#D4537E"},medium:{c:"#D4A054"},low:{c:"#9B8EC4"}};
const PCOLS = ["#9B8EC4","#D4537E","#D4A054","#6BAA84","#E8824A"];
const SDLC  = [
  {key:"planning",    label:"Planning"},
  {key:"requirements",label:"Requirements"},
  {key:"design",      label:"Design"},
  {key:"development", label:"Development"},
  {key:"testing",     label:"Testing / QA"},
  {key:"deployment",  label:"Deployment"},
  {key:"maintenance", label:"Maintenance"},
];
const MOODS = ["moodVerySad","moodSad","moodMeh","moodSmile","moodLaugh"];
const MOOD_LABELS = ["Rough","Low","Okay","Good","Great"];
const SPRINT_COLS = [
  {key:"backlog",    label:"Backlog",     color:"#9ca3af"},
  {key:"inprogress", label:"In Progress", color:"#D4A054"},
  {key:"done",       label:"Done",        color:"#6BAA84"},
];
const TABS = [
  ["today","Today",   "#D4537E"],
  ["projects","Projects","#D4A054"],
  ["sprints","Sprints","#9B8EC4"],
  ["wishes","Wishes","#E07CC3"],
  ["expenses","Expenses","#56B4D3"],
  ["log","Log",       "#6BAA84"],
  ["charts","Charts", "#E8824A"],
  ["manage","Manage", "#7B9ED9"],
];
const WISH_CATS = {
  travel:     {label:"Travel",     icon:"travel",       color:"#56B4D3",bg:"rgba(86,180,211,0.12)"},
  experience: {label:"Experience", icon:"experience",   color:"#E07CC3",bg:"rgba(224,124,195,0.12)"},
  skill:      {label:"Skill",      icon:"skill",        color:"#D4A054",bg:"rgba(212,160,84,0.12)"},
  goal:       {label:"Goal",       icon:"goal",         color:"#6BAA84",bg:"rgba(107,170,132,0.12)"},
  creative:   {label:"Creative",   icon:"creative",     color:"#9B8EC4",bg:"rgba(155,142,196,0.12)"},
  shopping:   {label:"Shopping",   icon:"shopping",     color:"#E8824A",bg:"rgba(232,130,74,0.12)"},
  tech:       {label:"Tech",       icon:"tech",         color:"#7B9ED9",bg:"rgba(123,158,217,0.12)"},
  fashion:    {label:"Fashion",    icon:"fashion",      color:"#D4537E",bg:"rgba(212,83,126,0.12)"},
  home:       {label:"Home",       icon:"rent",         color:"#6BAA84",bg:"rgba(107,170,132,0.12)"},
  other:      {label:"Other",      icon:"sparkle",      color:"#E8824A",bg:"rgba(232,130,74,0.12)"},
};
const WISH_PRIO = {"must":{label:"must do",color:"#D4537E"},"want":{label:"really want",color:"#D4A054"},"dream":{label:"someday",color:"#9B8EC4"}};
const BUY_CATS = ["shopping","tech","fashion","home","other"];
const DREAM_CATS = ["travel","experience","skill","goal","creative","other"];
const BLANK_H = {name:"",category:"personal",startTime:"09:00",endTime:"10:00",days:[1,2,3,4,5]};
const BLANK_P = {name:"",status:"on-track",progress:0,dueDate:"",ci:0,desc:"",stage:"planning",priority:"medium",milestones:[],developer:""};

// ─── expenses ─────────────────────────────────────────────────────────────────
const EXPENSE_CATS = {
  food:          {label:"Food & Dining", icon:"food",          color:"#E8824A",bg:"rgba(232,130,74,0.12)"},
  groceries:     {label:"Groceries",     icon:"groceries",     color:"#6BAA84",bg:"rgba(107,170,132,0.12)"},
  transport:     {label:"Transport",     icon:"transport",     color:"#7B9ED9",bg:"rgba(123,158,217,0.12)"},
  bills:         {label:"Bills",         icon:"bills",         color:"#D4A054",bg:"rgba(212,160,84,0.12)"},
  rent:          {label:"Rent / Home",   icon:"rent",          color:"#9B8EC4",bg:"rgba(155,142,196,0.12)"},
  shopping:      {label:"Shopping",      icon:"shopping",      color:"#D4537E",bg:"rgba(212,83,126,0.12)"},
  entertainment: {label:"Entertainment", icon:"entertainment", color:"#E07CC3",bg:"rgba(224,124,195,0.12)"},
  subscriptions: {label:"Subscriptions", icon:"subscriptions", color:"#56B4D3",bg:"rgba(86,180,211,0.12)"},
  health:        {label:"Health",        icon:"health",        color:"#6BAA84",bg:"rgba(107,170,132,0.12)"},
  travel:        {label:"Travel",        icon:"travel",        color:"#56B4D3",bg:"rgba(86,180,211,0.12)"},
  education:     {label:"Education",     icon:"education",     color:"#9B8EC4",bg:"rgba(155,142,196,0.12)"},
  gifts:         {label:"Gifts",         icon:"gift",          color:"#E07CC3",bg:"rgba(224,124,195,0.12)"},
  family:        {label:"Family",        icon:"family",        color:"#B85C8A",bg:"rgba(184,92,138,0.12)"},
  other:         {label:"Other",         icon:"more",          color:"#888780",bg:"rgba(136,135,128,0.12)"},
};
const INCOME_CATS = {
  salary:    {label:"Salary",    icon:"salary",    color:"#6BAA84",bg:"rgba(107,170,132,0.12)"},
  freelance: {label:"Freelance", icon:"freelance", color:"#7B9ED9",bg:"rgba(123,158,217,0.12)"},
  gift:      {label:"Gift",      icon:"gift",      color:"#E07CC3",bg:"rgba(224,124,195,0.12)"},
  refund:    {label:"Refund",    icon:"refund",    color:"#D4A054",bg:"rgba(212,160,84,0.12)"},
  other:     {label:"Other",     icon:"wallet",    color:"#888780",bg:"rgba(136,135,128,0.12)"},
};
const SAVINGS_CATS = {
  sip:             {label:"SIP",               icon:"trending", color:"#6BAA84",bg:"rgba(107,170,132,0.12)"},
  savings_account: {label:"Savings Account",   icon:"savings",  color:"#56B4D3",bg:"rgba(86,180,211,0.12)"},
  fd:              {label:"Fixed Deposit",     icon:"bank",     color:"#9B8EC4",bg:"rgba(155,142,196,0.12)"},
  mutual_fund:     {label:"Mutual Fund",       icon:"trending", color:"#7B9ED9",bg:"rgba(123,158,217,0.12)"},
  rd:              {label:"Recurring Deposit", icon:"refund",   color:"#D4A054",bg:"rgba(212,160,84,0.12)"},
  ppf:             {label:"PPF",               icon:"savings",  color:"#6BAA84",bg:"rgba(107,170,132,0.12)"},
  stocks:          {label:"Stocks",            icon:"trending", color:"#E07CC3",bg:"rgba(224,124,195,0.12)"},
  gold:            {label:"Gold",              icon:"star",     color:"#D4A054",bg:"rgba(212,160,84,0.12)"},
  crypto:          {label:"Crypto",            icon:"sparkle",  color:"#9B8EC4",bg:"rgba(155,142,196,0.12)"},
  emergency:       {label:"Emergency Fund",    icon:"alert",    color:"#D4537E",bg:"rgba(212,83,126,0.12)"},
  other:           {label:"Other",             icon:"wallet",   color:"#888780",bg:"rgba(136,135,128,0.12)"},
};
const PAY_METHODS = [
  {k:"cash",  label:"Cash",  icon:"cash"},
  {k:"card",  label:"Card",  icon:"card"},
  {k:"upi",   label:"UPI",   icon:"upi"},
  {k:"bank",  label:"Bank",  icon:"bank"},
  {k:"other", label:"Other", icon:"more"},
];
const BLANK_E = {amount:"",type:"expense",category:"food",note:"",paymentMethod:"upi",date:todayStr()};
const SAVINGS_KEY = "__savings__";

const INIT_H = [
  {id:"1",name:"Morning workout",  category:"health",  startTime:"06:30",endTime:"07:30",days:[1,2,3,4,5]},
  {id:"2",name:"Deep work block",  category:"work",    startTime:"09:00",endTime:"12:00",days:[1,2,3,4,5]},
  {id:"3",name:"Read 30 mins",     category:"learning",startTime:"20:00",endTime:"20:30",days:[0,1,2,3,4,5,6]},
  {id:"4",name:"Evening walk",     category:"health",  startTime:"18:30",endTime:"19:00",days:[0,1,2,3,4,5,6]},
  {id:"5",name:"Journal",          category:"personal",startTime:"21:30",endTime:"22:00",days:[0,1,2,3,4,5,6]},
];
const INIT_P = [
  {id:"p1",name:"Q2 Roadmap",       ci:0,stage:"development",status:"on-track",progress:65,dueDate:"2026-06-30",desc:"Define Q2 product roadmap",priority:"high",milestones:[]},
  {id:"p2",name:"Dashboard Redesign",ci:1,stage:"design",     status:"at-risk", progress:30,dueDate:"2026-05-15",desc:"New analytics dashboard",   priority:"high",milestones:[]},
  {id:"p3",name:"Onboarding Flow",  ci:2,stage:"testing",     status:"blocked", progress:45,dueDate:"2026-04-30",desc:"Revamp onboarding UX",        priority:"medium",milestones:[]},
];

// ─── icons ────────────────────────────────────────────────────────────────────
const Heart = ({filled,color}) => (
  <svg width={14} height={14} viewBox="0 0 24 24">
    <path d="M12 21C12 21 3 14 3 8.5A5.5 5.5 0 0 1 13.5 5.5a5.5 5.5 0 0 1 7.5 3 5.5 5.5 0 0 1-9 12z"
      fill={filled?color:"none"} stroke={color} strokeWidth={2} strokeLinecap="round"/>
  </svg>
);
const Tick = () => (
  <svg width={9} height={9} viewBox="0 0 12 12">
    <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CalIcon = () => (
  <svg width={11} height={11} viewBox="0 0 16 16" style={{flexShrink:0}}>
    <rect x={1} y={3} width={14} height={12} rx={2} fill="none" stroke="currentColor" strokeWidth={1.5}/>
    <line x1={1} y1={7} x2={15} y2={7} stroke="currentColor" strokeWidth={1.5}/>
    <line x1={5} y1={1} x2={5} y2={5} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
    <line x1={11} y1={1} x2={11} y2={5} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
  </svg>
);

// ─── icon library (lucide-style) ─────────────────────────────────────────────
const ICONS = {
  // expense categories
  food:          <><path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/></>,
  groceries:     <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></>,
  transport:     <><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></>,
  bills:         <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  rent:          <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  shopping:      <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
  entertainment: <><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></>,
  subscriptions: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
  health:        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
  travel:        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>,
  education:     <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  gift:          <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>,
  family:        <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  more:          <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
  // income
  salary:        <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  freelance:     <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
  refund:        <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
  wallet:        <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></>,
  // payment methods
  cash:          <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></>,
  card:          <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  upi:           <><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
  bank:          <><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></>,
  // wishes
  experience:    <><rect x="3" y="4" width="18" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></>,
  skill:         <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  goal:          <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></>,
  creative:      <><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.943.746-1.688 1.688-1.688H16.5c2.969 0 5.5-2.531 5.5-5.5C22 6.075 17.525 2 12 2z"/></>,
  tech:          <><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  fashion:       <path d="M16 4h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 0-2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9a2 2 0 0 0-2-2 2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2a4 4 0 0 1 8 0z"/>,
  // decorative / status
  flame:         <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>,
  alert:         <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  sparkle:       <path d="M12 3l1.912 5.813a4 4 0 0 0 2.275 2.275L22 13l-5.813 1.912a4 4 0 0 0-2.275 2.275L12 23l-1.912-5.813a4 4 0 0 0-2.275-2.275L2 13l5.813-1.912a4 4 0 0 0 2.275-2.275z"/>,
  star:          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  trending:      <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  // savings (piggy bank approximation)
  savings:       <><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8.5 3.4 1.5 4.6L5 16h2v2.4c0 .9.6 1.6 1.4 1.6h.6c.8 0 1.4-.7 1.4-1.6V18h4v.4c0 .9.6 1.6 1.4 1.6h.6c.8 0 1.4-.7 1.4-1.6V18c1.7-1.1 3-2.8 3-5 0-2.7-2.2-5-5-5z"/><circle cx="16" cy="11" r="1" fill="currentColor"/></>,
  // mood (faces)
  moodVerySad: <><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
  moodSad:     <><circle cx="12" cy="12" r="10"/><path d="M16 15s-1.5-1.2-4-1.2-4 1.2-4 1.2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
  moodMeh:     <><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
  moodSmile:   <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
  moodLaugh:   <><circle cx="12" cy="12" r="10"/><path d="M7 14a5 5 0 0 0 10 0z" fill="currentColor"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
};

const Icon = ({name, size=16, color="currentColor", strokeWidth=2, style}) => {
  const body = ICONS[name];
  if (!body) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0, ...style}}>
      {body}
    </svg>
  );
};

const BrandLogo = ({size=32}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}>
    <defs>
      <linearGradient id={`bg${size}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#D4537E"/>
        <stop offset="100%" stopColor="#9B8EC4"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx={size>=24?7:5} fill={`url(#bg${size})`}/>
    <ellipse cx="16" cy="16" rx="11" ry="4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.55" transform="rotate(-28 16 16)"/>
    <circle cx="16" cy="16" r="4.2" fill="#fff"/>
    <circle cx="25" cy="11.5" r="1.9" fill="#fff"/>
  </svg>
);

// ─── theme picker ─────────────────────────────────────────────────────────────
function ThemePicker({themeId, onSelect}) {
  const [open, setOpen]     = useState(false);
  const [custom, setCustom] = useState("#fdf2f8");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  return (
    <div className="theme-fab-wrap" ref={wrapRef}>
      {open && (
        <div className="theme-panel">
          <p className="theme-panel-title"><Icon name="sparkle" size={12}/> background theme</p>
          <div className="theme-swatches">
            {THEMES.map(t => (
              <div key={t.id} title={t.name} onClick={() => onSelect(t.id, t.bg, t.dark)}
                className={"theme-swatch"+(themeId===t.id?" active":"")} style={{background:t.bg}}>
                {themeId===t.id && <span className="theme-check">✓</span>}
                <span className="theme-name">{t.name}</span>
              </div>
            ))}
          </div>
          <div className="theme-custom-row">
            <span className="theme-custom-label">custom color</span>
            <input type="color" value={custom} onChange={e=>setCustom(e.target.value)} className="color-input"/>
            <button onClick={() => onSelect("custom",custom,false)} className="theme-apply-btn">apply</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o=>!o)} className={"theme-fab"+(open?" open":"")}>
        {open ? "✕" : <Icon name="sparkle" size={18} color="white"/>}
      </button>
    </div>
  );
}

// ─── Claude AI Chat ───────────────────────────────────────────────────────────
function ClaudeChat({ habits, comps, projects, sprints, logs, todayH, todayC, todayLog, userName, expenses, budgets }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const endRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Close chat when clicking outside the panel/fab
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  const buildContext = () => {
    const ds = todayStr(), dow = todayDow();
    const doneH = todayH.filter(h => todayC[h.id]).length;
    const pct = todayH.length ? Math.round((doneH / todayH.length) * 100) : 0;
    const doneT = todayLog.tasks.filter(t => t.done).length;
    const active = sprints.find(s => !s.completed);

    const mk = monthKey(new Date());
    const monthExp = (expenses || []).filter(e => inMonth(e.date, mk));
    const spent  = monthExp.filter(e => e.type === "expense").reduce((a, e) => a + Number(e.amount || 0), 0);
    const income = monthExp.filter(e => e.type === "income").reduce((a, e) => a + Number(e.amount || 0), 0);
    const saved  = monthExp.filter(e => e.type === "savings").reduce((a, e) => a + Number(e.amount || 0), 0);
    const byCat = {};
    monthExp.filter(e => e.type === "expense").forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0); });
    const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const savedBy = {};
    monthExp.filter(e => e.type === "savings").forEach(e => { savedBy[e.category] = (savedBy[e.category] || 0) + Number(e.amount || 0); });
    const SAVINGS = "__savings__";
    const goal = Number((budgets || []).find(b => b.category === SAVINGS)?.monthlyLimit || 0);
    const budgetLines = (budgets || []).filter(b => b.category !== SAVINGS).map(b => {
      const s = byCat[b.category] || 0;
      return `- ${EXPENSE_CATS[b.category]?.label || b.category}: ₹${Math.round(s)} / ₹${Math.round(b.monthlyLimit)}${s > b.monthlyLimit ? " (OVER)" : ""}`;
    });
    const savingsLine = goal > 0
      ? `Savings goal: ₹${Math.round(goal)}/mo · saved so far: ₹${Math.round(saved)} (${Math.round((saved/goal)*100)}% of goal)`
      : (saved > 0 ? `Saved this month: ₹${Math.round(saved)}` : "");
    const savingsBreakdown = Object.entries(savedBy).map(([k,v]) => `  · ${k}: ₹${Math.round(v)}`).join("\n");

    return `User: ${userName}
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

Today's Habits (${doneH}/${todayH.length} done, ${pct}%):
${todayH.map(h => `- ${h.name} (${CATS[h.category].label}, ${fmtTime(h.startTime)}–${fmtTime(h.endTime)}) ${todayC[h.id] ? "✓ DONE" : "○ pending"}`).join("\n") || "None scheduled"}

Today's Tasks (${doneT}/${todayLog.tasks.length}):
${todayLog.tasks.map(t => `- ${t.text} [${t.priority}] ${t.done ? "✓" : "○"}`).join("\n") || "None"}

Mood: ${todayLog.mood != null ? MOOD_LABELS[todayLog.mood] : "Not logged"}

Projects (${projects.filter(p => p.status !== "done").length} active):
${projects.map(p => `- ${p.name}: ${p.progress}% / ${STATUS[p.status].label} / ${SDLC.find(s => s.key === p.stage)?.label || "planning"}${p.developer ? " / dev: " + p.developer : ""}${p.dueDate ? " (due " + fmtDate(p.dueDate) + ")" : ""}`).join("\n") || "None"}

${active ? `Active Sprint: ${active.name} — ${active.items.filter(i => i.status === "done").length}/${active.items.length} done` : "No active sprint"}

This Month's Money (${fmtMonth(mk)}):
- Spent: ₹${Math.round(spent)} across ${monthExp.filter(e => e.type === "expense").length} txns
- Income: ₹${Math.round(income)}
- Saved (deposits to SIP / FD / etc): ₹${Math.round(saved)}
- Free cash (income − spent − saved): ${income - spent - saved >= 0 ? "+" : ""}₹${Math.round(income - spent - saved)}
${topCats.length ? "Top expense categories:\n" + topCats.map(([k, v]) => `  · ${EXPENSE_CATS[k]?.label || k}: ₹${Math.round(v)}`).join("\n") : ""}
${savingsBreakdown ? "Savings breakdown:\n" + savingsBreakdown : ""}
${budgetLines.length ? "Budgets:\n" + budgetLines.join("\n") : ""}
${savingsLine}

Standup — Wins: ${todayLog.wins || "–"} | Blockers: ${todayLog.blockers || "–"} | Plans: ${todayLog.plans || "–"}`;
  };

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg = { role: "user", content: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Something went wrong"); setLoading(false); return; }
      setMessages([...next, { role: "assistant", content: data.content?.[0]?.text || "Sorry, I couldn't generate a response." }]);
    } catch (e) {
      setError("Connection failed. Check your API key.");
    }
    setLoading(false);
  };

  const suggestions = ["How's my day going?", "Where did my money go this month?", "Summarize my projects", "What should I focus on?"];

  return (
    <div className="chat-fab-wrap" ref={wrapRef}>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-icon"><BrandLogo size={26}/></div>
            <div style={{flex:1}}>
              <p className="chat-header-title">orbit assistant</p>
              <p className="chat-header-sub">powered by Llama 3.3</p>
            </div>
            <button className="chat-clear" onClick={() => {setMessages([]); setError(null);}}>clear</button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="chat-welcome">
                <p className="chat-welcome-icon"><BrandLogo size={42}/></p>
                <p className="chat-welcome-title">Hi {userName}!</p>
                <p className="chat-welcome-sub">I know your habits, tasks, projects & spending.<br/>Ask me anything about your day.</p>
                <div className="chat-suggestions">
                  {suggestions.map(s => (
                    <button key={s} className="chat-suggestion" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === "assistant" && <span className="chat-msg-avatar"><BrandLogo size={20}/></span>}
                <div className="chat-msg-bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <span className="chat-msg-avatar"><BrandLogo size={20}/></span>
                <div className="chat-typing"><span/><span/><span/></div>
              </div>
            )}
            {error && <div className="chat-error"><Icon name="alert" size={13}/> {error}</div>}
            <div ref={endRef}/>
          </div>

          <div className="chat-input-area">
            <input className="chat-input" placeholder="Ask Orbit anything…"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}/>
            <button className="chat-send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1={12} y1={19} x2={12} y2={5}/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className={"chat-fab" + (open ? " open" : "")}
        title="Chat with AI assistant">
        {open ? "✕" : <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <circle cx={9} cy={10} r={1} fill="currentColor" stroke="none"/>
          <circle cx={12} cy={10} r={1} fill="currentColor" stroke="none"/>
          <circle cx={15} cy={10} r={1} fill="currentColor" stroke="none"/>
        </svg>}
      </button>
    </div>
  );
}

// ─── main app ─────────────────────────────────────────────────────────────────
export default function App({ user }) {
  const [tab, setTab]         = useState("today");
  const [themeId, setThemeId] = useState("rose");
  const [themeDark, setThemeDark] = useState(false);
  const [ready, setReady]     = useState(false);
  const [userName, setUserName] = useState("User");
  const [habits, setHabits]   = useState([]);
  const [comps, setComps]     = useState({});
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [logs, setLogs]       = useState({});
  const [wishes, setWishes]   = useState([]);
  const [showHF, setShowHF]   = useState(false);
  const [editHId, setEditHId] = useState(null);
  const [hf, setHf]           = useState({...BLANK_H});
  const [showPF, setShowPF]   = useState(false);
  const [editPId, setEditPId] = useState(null);
  const [pf, setPf]           = useState({...BLANK_P});
  const [showSF, setShowSF]   = useState(false);
  const [sprintForm, setSprintForm] = useState({name:"Sprint 1",goal:"",startDate:todayStr(),endDate:"",items:[]});
  const [showWF, setShowWF]   = useState(false);
  const [editWId, setEditWId] = useState(null);
  const [wf, setWf]           = useState({title:"",category:"goal",priority:"want",notes:"",targetDate:"",done:false,type:"dream",price:""});
  const [wishFilter, setWishFilter] = useState("all");
  const [wishTab, setWishTab] = useState("all");
  const [taskIn, setTaskIn]   = useState("");
  const [taskPrio, setTaskPrio] = useState("medium");
  const [taskProj, setTaskProj] = useState("");
  const [sprintItemIn, setSprintItemIn] = useState("");
  const [sprintItemProj, setSprintItemProj] = useState("");
  const [meetTitle, setMeetTitle] = useState("");
  const [meetNotes, setMeetNotes] = useState("");
  const [logDate, setLogDate]     = useState(todayStr());
  const [milestoneIn, setMilestoneIn] = useState("");
  const [expandProjId, setExpandProjId] = useState(null);
  const [devFilter, setDevFilter]       = useState("all");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("Khushi");
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets]   = useState([]);
  const [showEF, setShowEF]     = useState(false);
  const [editEId, setEditEId]   = useState(null);
  const [ef, setEf]             = useState({...BLANK_E});
  const [expMonth, setExpMonth] = useState(monthKey(new Date()));
  const [expFilter, setExpFilter] = useState("all");
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const applyBg = bg => {
    document.documentElement.style.setProperty("--app-bg", bg);
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("rt:theme")||"null");
        if (saved) { setThemeId(saved.id); setThemeDark(saved.dark); applyBg(saved.bg); document.documentElement.setAttribute("data-theme", saved.dark?"dark":"light"); }
        else { applyBg(THEMES[0].bg); document.documentElement.setAttribute("data-theme","light"); }

        const d = await loadAll();
        setHabits(d.habits);
        setComps(d.comps);
        setProjects(d.projects);
        setLogs(d.logs);
        setSprints(d.sprints);
        setUserName(d.username); setNameInput(d.username);
        setWishes(d.wishes);
        setExpenses(d.expenses || []);
        setBudgets(d.budgets || []);
      } catch(e) { console.error("load error", e); }
      setReady(true);
    })();
  }, []);

  const selectTheme = (id, bg, dark) => {
    setThemeId(id); setThemeDark(dark);
    applyBg(bg);
    document.documentElement.setAttribute("data-theme", dark?"dark":"light");
    localStorage.setItem("rt:theme", JSON.stringify({id,bg,dark}));
  };

  const saveH    = async h => { setHabits(h);   try { await saveHabitsDB(user.id, h)   } catch(e){ console.error(e); } };
  const saveP    = async p => { setProjects(p); try { await saveProjectsDB(user.id, p) } catch(e){ console.error(e); } };
  const saveS    = async s => { setSprints(s);  try { await saveSprintsDB(user.id, s)  } catch(e){ console.error(e); } };
  const saveW    = async w => { setWishes(w);   try { await saveWishesDB(user.id, w)   } catch(e){ console.error(e); } };
  const saveUser = async n => { setUserName(n); try { await saveProfileDB(user.id, n)  } catch(e){ console.error(e); } };
  const saveE    = async e => { setExpenses(e); try { await saveExpensesDB(user.id, e) } catch(err){ console.error(err); alert("Couldn't save: "+(err.message||err)); } };
  const saveB    = async b => { setBudgets(b);  try { await saveBudgetsDB(user.id, b)  } catch(err){ console.error(err); } };

  const ds      = todayStr();
  const dow     = todayDow();
  const todayH  = habits.filter(h=>h.days.includes(dow)).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const todayC  = comps[ds]||{};
  const doneH   = todayH.filter(h=>todayC[h.id]).length;
  const pct     = todayH.length ? Math.round((doneH/todayH.length)*100) : 0;
  const totalM  = todayH.reduce((a,h)=>a+durMin(h.startTime,h.endTime),0);
  const toggle = async (id) => {
    const newVal = !todayC[id];
    setComps(prev => ({...prev, [ds]: {...(prev[ds]||{}), [id]: newVal}}));
    try { await toggleCompletion(user.id, id, ds, newVal); } catch(e){ console.error(e); }
  };

  const todayLog  = logs[ds]||{wins:"",blockers:"",plans:"",tasks:[],mood:null,meetings:[],decisions:[]};
  const updateLog = async (patch) => {
    const newLog = {...todayLog, ...patch};
    setLogs(prev => ({...prev, [ds]: newLog}));
    try { await updateDailyLogDB(user.id, ds, newLog); } catch(e){ console.error(e); }
  };

  const isLogToday  = logDate === ds;
  const viewLog     = logs[logDate]||{wins:"",blockers:"",plans:"",tasks:[],mood:null,meetings:[],decisions:[]};
  const viewDoneT   = viewLog.tasks.filter(t=>t.done).length;
  const navLogDate  = dir => {
    const d = new Date(logDate+"T00:00:00"); d.setDate(d.getDate()+dir);
    const next = d.toISOString().split("T")[0];
    if (next <= ds) setLogDate(next);
  };
  const updateViewLog = async (patch) => {
    const newLog = {...viewLog, ...patch};
    setLogs(prev => ({...prev, [logDate]: newLog}));
    try { await updateDailyLogDB(user.id, logDate, newLog); } catch(e){ console.error(e); }
  };
  const addTask   = () => {
    if(!taskIn.trim())return;
    updateLog({tasks:[...todayLog.tasks,{id:Date.now().toString(),text:taskIn.trim(),done:false,priority:taskPrio,projectId:taskProj}]});
    setTaskIn(""); setTaskPrio("medium"); setTaskProj("");
  };
  const toggleTask = id => updateLog({tasks:todayLog.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)});
  const delTask    = id => updateLog({tasks:todayLog.tasks.filter(t=>t.id!==id)});
  const doneT      = todayLog.tasks.filter(t=>t.done).length;

  const addMeeting = () => {
    if(!meetTitle.trim())return;
    updateViewLog({meetings:[...(viewLog.meetings||[]),{id:Date.now().toString(),title:meetTitle,notes:meetNotes,ts:new Date().toISOString()}]});
    setMeetTitle(""); setMeetNotes("");
  };

  const getStreak = habitId => {
    let streak=0,d=new Date();
    for(let i=0;i<60;i++){
      const dstr=d.toISOString().split("T")[0],ddow=d.getDay();
      const h=habits.find(x=>x.id===habitId); if(!h)break;
      if(!h.days.includes(ddow)){d.setDate(d.getDate()-1);continue;}
      if(comps[dstr]?.[habitId]){streak++;d.setDate(d.getDate()-1);}else break;
    }
    return streak;
  };

  const weekData = Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i));
    const dstr=d.toISOString().split("T")[0],ddow=d.getDay();
    const dh=habits.filter(h=>h.days.includes(ddow)),dc=comps[dstr]||{};
    const lg=logs[dstr]||{};
    return {
      day:DOWF[ddow].slice(0,3),
      pct:dh.length?Math.round((dh.filter(h=>dc[h.id]).length/dh.length)*100):0,
      tasks:(lg.tasks||[]).filter(t=>t.done).length,
      mood:lg.mood!=null?lg.mood+1:0,
    };
  });
  const sevenAvg = Math.round(weekData.reduce((a,d)=>a+d.pct,0)/7);

  const catMins={};
  todayH.forEach(h=>{catMins[h.category]=(catMins[h.category]||0)+durMin(h.startTime,h.endTime);});
  const pieData=Object.entries(catMins).map(([k,v])=>({name:CATS[k].label,value:v,color:CATS[k].color}));

  const openAddH  = ()=>{setEditHId(null);setHf({...BLANK_H});setShowHF(true);};
  const openEditH = h=>{setEditHId(h.id);setHf({name:h.name,category:h.category,startTime:h.startTime,endTime:h.endTime,days:[...h.days]});setShowHF(true);};
  const cancelH   = ()=>{setShowHF(false);setEditHId(null);};
  const submitH   = ()=>{ if(!hf.name.trim()||!hf.days.length)return; editHId?saveH(habits.map(h=>h.id===editHId?{...h,...hf}:h)):saveH([...habits,{...hf,id:Date.now().toString()}]); cancelH(); };
  const toggleDay = i=>setHf(f=>({...f,days:f.days.includes(i)?f.days.filter(d=>d!==i):[...f.days,i].sort()}));

  const openAddP  = ()=>{setEditPId(null);setPf({...BLANK_P});setShowPF(true);};
  const openEditP = p=>{setEditPId(p.id);setPf({name:p.name,status:p.status,progress:p.progress,dueDate:p.dueDate||"",ci:p.ci,desc:p.desc,stage:p.stage||"planning",priority:p.priority||"medium",milestones:p.milestones||[],developer:p.developer||""});setShowPF(true);};
  const cancelP   = ()=>{setShowPF(false);setEditPId(null);};
  const submitP   = ()=>{ if(!pf.name.trim())return; editPId?saveP(projects.map(p=>p.id===editPId?{...p,...pf}:p)):saveP([...projects,{...pf,id:"p"+Date.now()}]); cancelP(); };

  const activeSprint = sprints.find(s=>!s.completed)||null;
  const moveItem = (sprintId,itemId,newStatus) => saveS(sprints.map(s=>s.id===sprintId?{...s,items:s.items.map(i=>i.id===itemId?{...i,status:newStatus}:i)}:s));
  const addSprintItem = () => {
    if(!sprintItemIn.trim()||!activeSprint)return;
    saveS(sprints.map(s=>s.id===activeSprint.id?{...s,items:[...s.items,{id:Date.now().toString(),text:sprintItemIn,projectId:sprintItemProj,status:"backlog"}]}:s));
    setSprintItemIn(""); setSprintItemProj("");
  };
  const createSprint = () => {
    if(!sprintForm.name.trim())return;
    saveS([...sprints,{...sprintForm,id:"s"+Date.now(),items:[],completed:false}]);
    setShowSF(false);
  };

  // ── Bucket list helpers ──
  const openAddW  = (type="dream")=>{setEditWId(null);setWf({title:"",category:type==="buy"?"shopping":"goal",priority:"want",notes:"",targetDate:"",done:false,type,price:""});setShowWF(true);};
  const openEditW = w=>{setEditWId(w.id);setWf({title:w.title,category:w.category,priority:w.priority,notes:w.notes||"",targetDate:w.targetDate||"",done:w.done,type:w.type||"dream",price:w.price||""});setShowWF(true);};
  const cancelW   = ()=>{setShowWF(false);setEditWId(null);};
  const submitW   = ()=>{ if(!wf.title.trim())return; editWId?saveW(wishes.map(w=>w.id===editWId?{...w,...wf}:w)):saveW([...wishes,{...wf,id:"w"+Date.now(),createdAt:new Date().toISOString()}]); cancelW(); };
  const toggleWish = id => saveW(wishes.map(w=>w.id===id?{...w,done:!w.done}:w));
  const delWish    = id => saveW(wishes.filter(w=>w.id!==id));
  const typeWishes = wishTab==="all"?wishes:wishTab==="buy"?wishes.filter(w=>(w.type||"dream")==="buy"):wishes.filter(w=>(w.type||"dream")==="dream");
  const filteredWishes = wishFilter==="all"?typeWishes:wishFilter==="done"?typeWishes.filter(w=>w.done):wishFilter==="active"?typeWishes.filter(w=>!w.done):typeWishes.filter(w=>w.category===wishFilter);
  const wishesDone = wishes.filter(w=>w.done).length;
  const wishesPct  = wishes.length?Math.round((wishesDone/wishes.length)*100):0;
  const buyTotal   = wishes.filter(w=>(w.type||"dream")==="buy"&&w.price).reduce((a,w)=>a+Number(w.price||0),0);
  const buyDone    = wishes.filter(w=>(w.type||"dream")==="buy"&&w.done).length;
  const buyCount   = wishes.filter(w=>(w.type||"dream")==="buy").length;
  const dreamCount = wishes.filter(w=>(w.type||"dream")==="dream").length;

  // ── Expense helpers ──
  const catsForType = (t) => t === "income" ? INCOME_CATS : t === "savings" ? SAVINGS_CATS : EXPENSE_CATS;
  const defaultCatForType = (t) => t === "income" ? "salary" : t === "savings" ? "sip" : "food";
  const openAddE  = (type="expense")=>{setEditEId(null);setEf({...BLANK_E,type,category:defaultCatForType(type),date:todayStr()});setShowEF(true);};
  const openEditE = e=>{setEditEId(e.id);setEf({amount:String(e.amount),type:e.type,category:e.category,note:e.note||"",paymentMethod:e.paymentMethod||"upi",date:e.date});setShowEF(true);};
  const cancelE   = ()=>{setShowEF(false);setEditEId(null);};
  const submitE   = ()=>{
    const amt = Number(ef.amount);
    if(!amt||amt<=0)return;
    const payload = {amount:amt, type:ef.type, category:ef.category, note:ef.note||"", paymentMethod:ef.paymentMethod, date:ef.date};
    editEId
      ? saveE(expenses.map(x=>x.id===editEId?{...x,...payload}:x))
      : saveE([{...payload,id:"e"+Date.now(),createdAt:new Date().toISOString()},...expenses]);
    cancelE();
  };
  const delE = id => saveE(expenses.filter(e=>e.id!==id));
  const navMonth = dir => {
    const [y,m] = expMonth.split("-").map(Number);
    const d = new Date(y, m-1+dir, 1);
    const next = monthKey(d);
    if (next <= monthKey(new Date())) setExpMonth(next);
  };
  const monthExp = expenses.filter(e=>inMonth(e.date,expMonth));
  const monthSpent  = monthExp.filter(e=>e.type==="expense").reduce((a,e)=>a+Number(e.amount||0),0);
  const monthIncome = monthExp.filter(e=>e.type==="income").reduce((a,e)=>a+Number(e.amount||0),0);
  const monthSaved  = monthExp.filter(e=>e.type==="savings").reduce((a,e)=>a+Number(e.amount||0),0);
  const monthNet = monthIncome - monthSpent - monthSaved;
  const spendByCat = {};
  monthExp.filter(e=>e.type==="expense").forEach(e=>{
    spendByCat[e.category] = (spendByCat[e.category]||0) + Number(e.amount||0);
  });
  const savedByCat = {};
  monthExp.filter(e=>e.type==="savings").forEach(e=>{
    savedByCat[e.category] = (savedByCat[e.category]||0) + Number(e.amount||0);
  });
  const topCats = Object.entries(spendByCat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const expenseDonutData = topCats.map(([k,v])=>({
    name: EXPENSE_CATS[k]?.label || k,
    value: v,
    color: EXPENSE_CATS[k]?.color || "#888780",
  }));
  const filteredMonthExp = expFilter==="all" ? monthExp
    : expFilter==="income" ? monthExp.filter(e=>e.type==="income")
    : expFilter==="expense" ? monthExp.filter(e=>e.type==="expense")
    : expFilter==="savings" ? monthExp.filter(e=>e.type==="savings")
    : monthExp.filter(e=>e.category===expFilter);
  const txDays = {};
  filteredMonthExp.forEach(e=>{ if(!txDays[e.date]) txDays[e.date] = []; txDays[e.date].push(e); });
  const txDates = Object.keys(txDays).sort((a,b)=>b.localeCompare(a));
  const categoryBudgets = budgets.filter(b => b.category !== SAVINGS_KEY);
  const budgetByCat = Object.fromEntries(categoryBudgets.map(b=>[b.category, Number(b.monthlyLimit||0)]));
  const totalBudget = categoryBudgets.reduce((a,b)=>a+Number(b.monthlyLimit||0),0);
  const savingsGoal = Number(budgets.find(b => b.category === SAVINGS_KEY)?.monthlyLimit || 0);
  const savingsActual = monthSaved;
  const savingsPct = savingsGoal > 0 ? Math.min(100, Math.max(0, Math.round((savingsActual / savingsGoal) * 100))) : 0;

  // Last 6 months of savings (sum of savings-type transactions per month)
  const savingsTrend = (()=>{
    const now = new Date();
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = monthKey(d);
      const saved = expenses
        .filter(e => e.type === "savings" && inMonth(e.date, mk))
        .reduce((a, e) => a + Number(e.amount || 0), 0);
      out.push({ label: d.toLocaleDateString("en-US",{month:"short"}), saved, mk });
    }
    return out;
  })();
  const totalSaved6mo = savingsTrend.reduce((a,m) => a + Math.max(0, m.saved), 0);
  const monthsOnTrack = savingsGoal > 0 ? savingsTrend.filter(m => m.saved >= savingsGoal).length : 0;
  const openBudgets = () => {
    const draft = Object.fromEntries(Object.keys(EXPENSE_CATS).map(k => [k, String(budgetByCat[k] || "")]));
    draft[SAVINGS_KEY] = String(savingsGoal || "");
    setBudgetDraft(draft);
    setShowBudgetEditor(true);
  };
  const saveBudgetDraft = () => {
    const next = Object.entries(budgetDraft)
      .map(([cat,val]) => ({ cat, n: Number(val) }))
      .filter(({n}) => n > 0)
      .map(({cat,n}) => {
        const existing = budgets.find(b => b.category === cat);
        return { id: existing?.id || ("b"+cat), category: cat, monthlyLimit: n };
      });
    saveB(next);
    setShowBudgetEditor(false);
  };

  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":"Good afternoon";
  const dateLabel = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  const activeP = projects.filter(p=>p.status!=="done").length;
  const circ = 2*Math.PI*38, arc = (pct/100)*circ;

  if(!ready) return <div className="loading">loading your space...</div>;

  return (
    <div className="app-root">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <BrandLogo size={28}/>
          <div className="sidebar-brand-text">
            <p className="sidebar-brand-name">Orbit</p>
            <p className="sidebar-brand-tagline">your life, in one place</p>
          </div>
        </div>

        {/* User */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            {editingName ? (
              <div style={{display:"flex",gap:4}}>
                <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){saveUser(nameInput);setEditingName(false);}}}
                  style={{fontSize:12,padding:"3px 6px",borderRadius:6,width:90,background:"var(--input-bg)",border:"1px solid var(--input-border)",color:"var(--text-primary)"}}
                  autoFocus/>
                <button onClick={()=>{saveUser(nameInput);setEditingName(false);}} style={{fontSize:10,padding:"2px 6px",borderRadius:6,cursor:"pointer",background:"rgba(212,83,126,0.15)",color:"#D4537E",border:"1px solid rgba(212,83,126,0.3)"}}>✓</button>
              </div>
            ):(
              <p className="user-name" onClick={()=>{setEditingName(true);setNameInput(userName);}}>{userName} ✎</p>
            )}
            <p className="user-greeting">{greeting}</p>
          </div>
        </div>

        <p className="sidebar-date">{dateLabel}</p>

        {/* Ring */}
        <div className="ring-container">
          <svg width={100} height={100} viewBox="0 0 96 96">
            <circle cx={48} cy={48} r={38} fill="none" stroke="var(--ring-track)" strokeWidth={6}/>
            {pct>0&&(
              <circle cx={48} cy={48} r={38} fill="none" stroke="#D4537E" strokeWidth={6}
                strokeDasharray={arc.toFixed(1)+" "+circ.toFixed(1)} strokeLinecap="round"
                transform="rotate(-90 48 48)" style={{transition:"stroke-dasharray 0.6s ease"}}/>
            )}
            <text x={48} y={42} textAnchor="middle" dominantBaseline="central" fill="#D4537E" fontSize={16} fontWeight={700}>{pct}%</text>
            <text x={48} y={60} textAnchor="middle" fill="var(--text-muted)" fontSize={9} fontWeight={500}>today's habits</text>
          </svg>
        </div>

        {/* Stats */}
        <div className="sidebar-stats">
          {[
            {l:"tasks done",   v:`${doneT}/${todayLog.tasks.length}`, c:"#D4A054"},
            {l:"active proj",  v:`${activeP}`,                        c:"#9B8EC4"},
            {l:"time planned", v:fmtDur(totalM),                      c:"#6BAA84"},
            {l:"today's mood", v:todayLog.mood!=null?<Icon name={MOODS[todayLog.mood]} size={18} color="#D4537E" strokeWidth={2}/>:"—", c:"#D4537E"},
          ].map(s=>(
            <div key={s.l} className="sidebar-stat">
              <span className="stat-label">{s.l}</span>
              <span className="stat-val" style={{color:s.c}}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {TABS.map(([k,l,c])=>(
            <button key={k} onClick={()=>{setTab(k);setShowHF(false);setShowPF(false);setShowEF(false);}} className={"nav-item"+(tab===k?" active":"")}
              style={tab===k?{color:c,background:c+"22",borderColor:c+"44"}:{}}>
              <span>{l}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MOBILE HEADER ───────────────────────────────────────────────── */}
      <header className="mobile-header">
        <div className="mobile-header-left">
          <BrandLogo size={32}/>
          <div>
            <p className="mobile-greeting">Orbit · {greeting}, {userName}</p>
            <p className="mobile-date">{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p>
          </div>
        </div>
        <div className="mobile-header-right">
          <svg width={34} height={34} viewBox="0 0 96 96">
            <circle cx={48} cy={48} r={38} fill="none" stroke="var(--ring-track)" strokeWidth={7}/>
            {pct>0&&<circle cx={48} cy={48} r={38} fill="none" stroke="#D4537E" strokeWidth={7}
              strokeDasharray={arc.toFixed(1)+" "+circ.toFixed(1)} strokeLinecap="round"
              transform="rotate(-90 48 48)"/>}
            <text x={48} y={48} textAnchor="middle" dominantBaseline="central" fill="#D4537E" fontSize={20} fontWeight={700}>{pct}%</text>
          </svg>
          <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1={3} y1={6} x2={21} y2={6}/>
              <line x1={3} y1={12} x2={21} y2={12}/>
              <line x1={3} y1={18} x2={21} y2={18}/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="main-content">

        {/* ── PAGE HEADER ──── */}
        <div className="page-header">
          <div>
            <h2 className="page-title">{TABS.find(t=>t[0]===tab)?.[1]}</h2>
            <p className="page-sub">{tab==="today"?`${todayH.length} habits · ${todayLog.tasks.length} tasks scheduled`:
              tab==="projects"?`${projects.length} total · ${activeP} active`:
              tab==="sprints"?`${sprints.length} sprints · ${activeSprint?activeSprint.items.length+" items in sprint":"no active sprint"}`:
              tab==="wishes"?`${wishes.length} dreams · ${wishesDone} achieved`:
              tab==="expenses"?`${fmtMonth(expMonth)} · spent ${fmtINR(monthSpent)}${monthIncome>0?` · earned ${fmtINR(monthIncome)}`:""}${monthSaved>0?` · saved ${fmtINR(monthSaved)}`:""}`:
              tab==="log"?`${dateLabel}`:
              tab==="charts"?`7-day avg ${sevenAvg}%`:
              `${habits.length} habits tracked`}</p>
          </div>
          {tab==="projects"&&!showPF&&<button className="primary-btn" onClick={openAddP}>+ new project</button>}
          {tab==="manage"&&!showHF&&<button className="primary-btn" onClick={openAddH}>+ new habit</button>}
          {tab==="sprints"&&!showSF&&<button className="primary-btn" onClick={()=>setShowSF(true)}>+ new sprint</button>}
          {tab==="wishes"&&!showWF&&(
            <div style={{display:"flex",gap:6}}>
              <button className="primary-btn" style={{background:"rgba(224,124,195,0.12)",color:"#E07CC3",borderColor:"rgba(224,124,195,0.35)"}} onClick={()=>openAddW("dream")}>+ dream</button>
              <button className="primary-btn" style={{background:"rgba(232,130,74,0.12)",color:"#E8824A",borderColor:"rgba(232,130,74,0.35)"}} onClick={()=>openAddW("buy")}>+ to buy</button>
            </div>
          )}
          {tab==="expenses"&&!showEF&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button className="primary-btn" style={{background:"rgba(86,180,211,0.12)",color:"#56B4D3",borderColor:"rgba(86,180,211,0.35)"}} onClick={()=>openAddE("expense")}>+ expense</button>
              <button className="primary-btn" style={{background:"rgba(107,170,132,0.12)",color:"#6BAA84",borderColor:"rgba(107,170,132,0.35)"}} onClick={()=>openAddE("income")}>+ income</button>
              <button className="primary-btn" style={{background:"rgba(155,142,196,0.12)",color:"#9B8EC4",borderColor:"rgba(155,142,196,0.35)"}} onClick={()=>openAddE("savings")}>+ savings</button>
            </div>
          )}
        </div>

        {/* ════════════════════ TODAY ════════════════════════════════════ */}
        {tab==="today"&&(
          <div className="tab-content">

            {/* Habits */}
            <section>
              <div className="section-header">
                <p className="section-title">habits</p>
                <p className="section-hint">tap to mark complete</p>
              </div>
              {todayH.length===0?<p className="empty-state">no habits for today — add some in Manage</p>:(
                <>
                  <div className="h-scroll">
                    {todayH.map(h=>{
                      const ck=!!todayC[h.id], cat=CATS[h.category], streak=getStreak(h.id);
                      return (
                        <div key={h.id} className={"habit-card"+(ck?" checked":"")} onClick={()=>toggle(h.id)}
                          style={{borderTopColor:cat.color, background:ck?cat.bg:"var(--card-bg)", borderColor:ck?cat.color+"66":"var(--card-border)"}}>
                          <div className="habit-card-top">
                            <Heart filled={ck} color={cat.color}/>
                            {streak>0&&<span className="streak-badge" style={{color:cat.color,background:cat.bg}}><Icon name="flame" size={11} color={cat.color}/> {streak}</span>}
                          </div>
                          <p className="habit-name" style={{textDecoration:ck?"line-through":"none",opacity:ck?0.5:1}}>{h.name}</p>
                          <div className="habit-meta">
                            <span className="cat-pill" style={{background:cat.bg,color:cat.color}}>{cat.label}</span>
                          </div>
                          <div className="habit-footer">
                            <p className="habit-time">{fmtTime(h.startTime)}</p>
                            <p className="habit-dur" style={{color:cat.color}}>{fmtDur(durMin(h.startTime,h.endTime))}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{width:pct+"%"}}/>
                    <span className="progress-label">{pct}% complete — {doneH} of {todayH.length} done</span>
                  </div>
                </>
              )}
            </section>

            {/* Mood */}
            <section>
              <p className="section-title">how are you feeling today?</p>
              <div className="mood-row">
                {MOODS.map((m,i)=>(
                  <button key={i} onClick={()=>updateLog({mood:i})} className={"mood-btn"+(todayLog.mood===i?" active":"")}
                    style={todayLog.mood===i?{background:"rgba(212,83,126,0.15)",borderColor:"#D4537E",transform:"scale(1.2)"}:{}}>
                    <span className="mood-emoji"><Icon name={m} size={28} color={todayLog.mood===i?"#D4537E":"var(--text-secondary)"} strokeWidth={1.8}/></span>
                    <span className="mood-label">{MOOD_LABELS[i]}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Tasks */}
            <section>
              <div className="section-header">
                <p className="section-title">tasks {todayLog.tasks.length>0&&<span className="section-count">{doneT}/{todayLog.tasks.length}</span>}</p>
              </div>
              <div className="task-input-row">
                <input placeholder="add a task… (enter to save)" value={taskIn}
                  onChange={e=>setTaskIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
                  className="task-input"/>
                <select value={taskPrio} onChange={e=>setTaskPrio(e.target.value)} className="task-select">
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
                <select value={taskProj} onChange={e=>setTaskProj(e.target.value)} className="task-select wide">
                  <option value="">no project</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={addTask} className="add-btn">+ add</button>
              </div>
              {todayLog.tasks.length>0&&(
                <div className="task-list">
                  {todayLog.tasks.map(t=>{
                    const proj=projects.find(p=>p.id===t.projectId), pc=(PRIO[t.priority]||PRIO.medium).c;
                    return (
                      <div key={t.id} className={"task-row"+(t.done?" done":"")}>
                        <div className="task-check" onClick={()=>toggleTask(t.id)}
                          style={{borderColor:t.done?pc:"var(--input-border)",background:t.done?pc:"transparent"}}>
                          {t.done&&<Tick/>}
                        </div>
                        <span className="task-text">{t.text}</span>
                        <div className="task-badges">
                          <span className="mini-pill" style={{background:pc+"18",color:pc}}>{t.priority}</span>
                          {proj&&<span className="mini-pill" style={{background:PCOLS[proj.ci]+"18",color:PCOLS[proj.ci]}}>{proj.name}</span>}
                        </div>
                        <button onClick={()=>delTask(t.id)} className="del-btn">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        )}

        {/* ════════════════════ PROJECTS ══════════════════════════════════ */}
        {tab==="projects"&&(
          <div className="tab-content">
            {showPF&&(
              <div className="form-card" style={{borderLeftColor:PCOLS[pf.ci]}}>
                <p className="form-title">{editPId?"edit project":"new project"}</p>
                <div className="form-grid">
                  <input placeholder="project name" value={pf.name} onChange={e=>setPf(f=>({...f,name:e.target.value}))} style={{gridColumn:"1/-1"}}/>
                  <input placeholder="description / goal" value={pf.desc} onChange={e=>setPf(f=>({...f,desc:e.target.value}))} style={{gridColumn:"1/-1"}}/>
                  <input placeholder="developer name (who's working on this)" value={pf.developer||""} onChange={e=>setPf(f=>({...f,developer:e.target.value}))} style={{gridColumn:"1/-1"}}/>
                  <select value={pf.status} onChange={e=>setPf(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select value={pf.priority} onChange={e=>setPf(f=>({...f,priority:e.target.value}))}>
                    <option value="high">high priority</option>
                    <option value="medium">medium priority</option>
                    <option value="low">low priority</option>
                  </select>
                  <input type="date" value={pf.dueDate} onChange={e=>setPf(f=>({...f,dueDate:e.target.value}))}/>
                </div>
                <div className="form-row" style={{alignItems:"center",gap:10}}>
                  <span className="form-label">progress</span>
                  <input type="range" min={0} max={100} step={1} value={pf.progress} onChange={e=>setPf(f=>({...f,progress:Number(e.target.value)}))} style={{flex:1}}/>
                  <span style={{fontSize:13,fontWeight:600,color:PCOLS[pf.ci],minWidth:36}}>{pf.progress}%</span>
                </div>
                <div className="form-row" style={{alignItems:"center",gap:8}}>
                  <span className="form-label">color</span>
                  {PCOLS.map((c,i)=><div key={i} onClick={()=>setPf(f=>({...f,ci:i}))} className={"color-dot"+(pf.ci===i?" sel":"")} style={{background:c,outlineColor:c}}/>)}
                </div>
                <div>
                  <p className="form-label" style={{marginBottom:8}}>sdlc stage</p>
                  <div className="stage-picker">
                    {SDLC.map(s=>(
                      <button key={s.key} onClick={()=>setPf(f=>({...f,stage:s.key}))} className={"stage-btn"+(pf.stage===s.key?" active":"")}
                        style={pf.stage===s.key?{background:PCOLS[pf.ci],color:"white",borderColor:PCOLS[pf.ci]}:{}}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={cancelP} className="ghost-btn">cancel</button>
                  <button onClick={submitP} className="save-btn" style={{background:PCOLS[pf.ci]}}>{editPId?"update":"save project"}</button>
                </div>
              </div>
            )}

            {(()=>{
              const devs=[...new Set(projects.map(p=>p.developer).filter(Boolean))];
              const filtered=devFilter==="all"?projects:projects.filter(p=>p.developer===devFilter);
              return (<>
                {devs.length>0&&(
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {["all",...devs].map(d=>{
                      const active=devFilter===d;
                      const proj=projects.find(p=>p.developer===d);
                      const color=proj?PCOLS[proj.ci]:"#9ca3af";
                      return (
                        <button key={d} onClick={()=>setDevFilter(d)}
                          style={{fontSize:11,padding:"5px 12px",borderRadius:20,fontWeight:active?700:500,cursor:"pointer",
                            background:active?(d==="all"?"rgba(155,142,196,0.15)":color+"22"):"transparent",
                            color:active?(d==="all"?"#9B8EC4":color):"var(--text-secondary)",
                            border:`1px solid ${active?(d==="all"?"rgba(155,142,196,0.4)":color+"55"):"var(--border-color)"}`,
                            display:"flex",alignItems:"center",gap:5}}>
                          {d!=="all"&&<span style={{width:14,height:14,borderRadius:"50%",background:color+"22",border:`1.5px solid ${color}55`,color,fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{d.charAt(0).toUpperCase()}</span>}
                          {d==="all"?"all devs":d}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="projects-grid">
                  {filtered.length===0&&<p className="empty-state">{projects.length===0?"no projects yet — create your first one":"no projects for this developer"}</p>}
                  {filtered.map(p=>{
                const st=STATUS[p.status], pc=PCOLS[p.ci], dl=daysLeft(p.dueDate);
                const dlColor=dl!=null&&dl<0?"#D4537E":dl!=null&&dl<7?"#D4537E":dl!=null&&dl<14?"#D4A054":"var(--text-muted)";
                const dlLabel=dl===null?"":dl<0?"overdue":dl===0?"due today":dl+"d left";
                const stageIdx=SDLC.findIndex(s=>s.key===(p.stage||"planning"));
                const isExpanded=expandProjId===p.id;
                const prioC=(PRIO[p.priority||"medium"]||PRIO.medium).c;
                return (
                  <div key={p.id} className={"project-card"+(isExpanded?" expanded":"")} style={{borderTopColor:pc}}>
                    {/* header */}
                    <div className="proj-header">
                      <div style={{flex:1}}>
                        <div className="proj-title-row">
                          <p className="proj-name">{p.name}</p>
                          <span className="mini-pill" style={{background:st.bg,color:st.color}}>{st.label}</span>
                        </div>
                        {p.desc&&<p className="proj-desc">{p.desc}</p>}
                        {p.developer&&(
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:7}}>
                            <div style={{width:20,height:20,borderRadius:"50%",background:pc+"22",color:pc,border:`1.5px solid ${pc}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>
                              {p.developer.charAt(0).toUpperCase()}
                            </div>
                            <span style={{fontSize:11,color:"var(--text-secondary)",fontWeight:500}}>{p.developer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* progress */}
                    <div>
                      <div className="prog-header">
                        <span className="prog-label">progress</span>
                        <span style={{fontSize:11,fontWeight:600,color:pc}}>{p.progress}%</span>
                      </div>
                      <div className="prog-track"><div className="prog-fill" style={{width:p.progress+"%",background:pc}}/></div>
                    </div>
                    {/* meta */}
                    <div className="proj-meta">
                      {p.dueDate&&(
                        <span className="proj-meta-item" style={{color:dlColor}}>
                          <CalIcon/>{fmtDate(p.dueDate)} {dlLabel&&"· "+dlLabel}
                        </span>
                      )}
                      <span className="proj-meta-item" style={{color:prioC,gap:4}}>
                        <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:prioC}}/>
                        {p.priority||"medium"} priority
                      </span>
                    </div>
                    {/* sdlc pipeline */}
                    <div>
                      <div className="sdlc-track">
                        {SDLC.map((s,i)=>(
                          <div key={s.key} className="sdlc-seg"
                            style={{background:i<=stageIdx?pc:"var(--border-color)", outline:i===stageIdx?`2px solid ${pc}`:"none"}}
                            title={s.label}/>
                        ))}
                      </div>
                      <div className="sdlc-label-row">
                        <span style={{fontSize:11,color:pc,fontWeight:600}}>{SDLC[stageIdx]?.label}</span>
                        <span style={{fontSize:10,color:"var(--text-muted)"}}>{stageIdx+1}/{SDLC.length}</span>
                      </div>
                    </div>
                    {/* milestones */}
                    {(p.milestones||[]).length>0&&(
                      <div className="milestones">
                        {p.milestones.map(m=>(
                          <div key={m.id} className="milestone-row">
                            <span style={{width:6,height:6,borderRadius:"50%",background:m.done?"#6BAA84":"var(--text-muted)",flexShrink:0,display:"inline-block"}}/>
                            <span style={{fontSize:11,color:m.done?"var(--text-muted)":"var(--text-primary)",textDecoration:m.done?"line-through":"none",flex:1}}>{m.text}</span>
                            <button onClick={()=>saveP(projects.map(x=>x.id===p.id?{...x,milestones:x.milestones.map(ml=>ml.id===m.id?{...ml,done:!ml.done}:ml)}:x))} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--text-muted)"}}>
                              {m.done?"↺":"✓"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* notes expand */}
                    {isExpanded&&(
                      <div className="proj-notes">
                        <p style={{fontSize:11,fontWeight:600,color:pc,margin:"0 0 8px"}}>add milestone</p>
                        <div style={{display:"flex",gap:6}}>
                          <input placeholder="milestone name…" value={milestoneIn} onChange={e=>setMilestoneIn(e.target.value)}
                            onKeyDown={e=>{if(e.key==="Enter"&&milestoneIn.trim()){saveP(projects.map(x=>x.id===p.id?{...x,milestones:[...(x.milestones||[]),{id:Date.now().toString(),text:milestoneIn.trim(),done:false}]}:x));setMilestoneIn("");}}}
                            style={{flex:1}}/>
                          <button onClick={()=>{if(milestoneIn.trim()){saveP(projects.map(x=>x.id===p.id?{...x,milestones:[...(x.milestones||[]),{id:Date.now().toString(),text:milestoneIn.trim(),done:false}]}:x));setMilestoneIn("");}}} className="add-btn" style={{background:pc+"22",color:pc,borderColor:pc+"44"}}>+ add</button>
                        </div>
                      </div>
                    )}
                    {/* actions */}
                    <div className="proj-actions">
                      <button onClick={()=>setExpandProjId(isExpanded?null:p.id)} className="ghost-btn">{isExpanded?"▲ close":"▼ milestones"}</button>
                      <button onClick={()=>openEditP(p)} className="ghost-btn">edit</button>
                      <button onClick={()=>saveP(projects.filter(x=>x.id!==p.id))} className="ghost-btn danger">delete</button>
                    </div>
                  </div>
                );
              })}
                </div>
              </>);
            })()}
          </div>
        )}

        {/* ════════════════════ SPRINTS ═══════════════════════════════════ */}
        {tab==="sprints"&&(
          <div className="tab-content">
            {showSF&&(
              <div className="form-card" style={{borderLeftColor:"#9B8EC4"}}>
                <p className="form-title">new sprint</p>
                <div className="form-grid">
                  <input placeholder="sprint name (e.g. Sprint 3)" value={sprintForm.name} onChange={e=>setSprintForm(f=>({...f,name:e.target.value}))}/>
                  <input placeholder="sprint goal" value={sprintForm.goal} onChange={e=>setSprintForm(f=>({...f,goal:e.target.value}))}/>
                  <input type="date" value={sprintForm.startDate} onChange={e=>setSprintForm(f=>({...f,startDate:e.target.value}))}/>
                  <input type="date" value={sprintForm.endDate} onChange={e=>setSprintForm(f=>({...f,endDate:e.target.value}))}/>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setShowSF(false)} className="ghost-btn">cancel</button>
                  <button onClick={createSprint} className="save-btn" style={{background:"#9B8EC4"}}>create sprint</button>
                </div>
              </div>
            )}

            {sprints.length===0&&!showSF&&<p className="empty-state">no sprints yet — create your first one above</p>}

            {activeSprint&&(
              <>
                <div className="sprint-header">
                  <div>
                    <p className="sprint-name">{activeSprint.name}</p>
                    {activeSprint.goal&&<p className="sprint-goal">Goal: {activeSprint.goal}</p>}
                    {activeSprint.startDate&&<p className="sprint-dates">{fmtDate(activeSprint.startDate)}{activeSprint.endDate&&" → "+fmtDate(activeSprint.endDate)}</p>}
                  </div>
                  <div className="sprint-stats">
                    <span className="sprint-stat">{activeSprint.items.filter(i=>i.status==="done").length}/{activeSprint.items.length} done</span>
                    <button onClick={()=>saveS(sprints.map(s=>s.id===activeSprint.id?{...s,completed:true}:s))} className="ghost-btn" style={{color:"#6BAA84",borderColor:"rgba(107,170,132,0.3)"}}>complete sprint</button>
                  </div>
                </div>

                <div className="sprint-add-row">
                  <input placeholder="add sprint item…" value={sprintItemIn} onChange={e=>setSprintItemIn(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addSprintItem()}/>
                  <select value={sprintItemProj} onChange={e=>setSprintItemProj(e.target.value)}>
                    <option value="">no project</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={addSprintItem} className="add-btn">+ add item</button>
                </div>

                <div className="kanban-board">
                  {SPRINT_COLS.map(col=>{
                    const items=activeSprint.items.filter(i=>i.status===col.key);
                    return (
                      <div key={col.key} className="kanban-col">
                        <div className="kanban-col-header" style={{borderTopColor:col.color}}>
                          <span className="kanban-col-title" style={{color:col.color}}>{col.label}</span>
                          <span className="kanban-col-count" style={{background:col.color+"22",color:col.color}}>{items.length}</span>
                        </div>
                        {items.length===0&&<p className="kanban-empty">drop items here</p>}
                        {items.map(item=>{
                          const proj=projects.find(p=>p.id===item.projectId);
                          const others=SPRINT_COLS.filter(c=>c.key!==col.key);
                          return (
                            <div key={item.id} className="kanban-card">
                              <p className="kanban-card-text">{item.text}</p>
                              {proj&&<span className="mini-pill" style={{background:PCOLS[proj.ci]+"18",color:PCOLS[proj.ci]}}>{proj.name}</span>}
                              <div className="kanban-card-actions">
                                {others.map(o=>(
                                  <button key={o.key} onClick={()=>moveItem(activeSprint.id,item.id,o.key)}
                                    className="ghost-btn" style={{fontSize:10,padding:"2px 8px"}}>→ {o.label}</button>
                                ))}
                                <button onClick={()=>saveS(sprints.map(s=>s.id===activeSprint.id?{...s,items:s.items.filter(i=>i.id!==item.id)}:s))} className="ghost-btn danger" style={{fontSize:10,padding:"2px 6px"}}>✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Past sprints */}
            {sprints.filter(s=>s.completed).length>0&&(
              <div style={{marginTop:"1.5rem"}}>
                <p className="section-title" style={{marginBottom:12}}>past sprints</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {sprints.filter(s=>s.completed).map(s=>{
                    const done=s.items.filter(i=>i.status==="done").length;
                    return (
                      <div key={s.id} className="glass-card" style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <p style={{margin:0,fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{s.name}</p>
                          {s.goal&&<p style={{margin:"2px 0 0",fontSize:11,color:"var(--text-muted)"}}>{s.goal}</p>}
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{fontSize:12,color:"#6BAA84",fontWeight:600}}>{done}/{s.items.length} completed</span>
                          <span className="mini-pill" style={{background:"rgba(107,170,132,0.15)",color:"#6BAA84"}}>done</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ WISHES / BUCKET LIST ═══════════════════════ */}
        {tab==="wishes"&&(
          <div className="tab-content">

            {/* Sub-tabs: All / Dreams / To Buy */}
            <div className="wish-subtabs">
              {[{k:"all",l:"All",icon:"sparkle",c:"#E07CC3"},{k:"dream",l:"Bucket List",icon:"star",c:"#E07CC3"},{k:"buy",l:"To Buy",icon:"shopping",c:"#E8824A"}].map(t=>(
                <button key={t.k} onClick={()=>{setWishTab(t.k);setWishFilter("all");}}
                  className={"wish-subtab"+(wishTab===t.k?" active":"")}
                  style={wishTab===t.k?{color:t.c,borderColor:t.c,background:t.c+"15"}:{}}>
                  <Icon name={t.icon} size={14}/> {t.l}
                  <span className="wish-subtab-count">{t.k==="all"?wishes.length:t.k==="dream"?dreamCount:buyCount}</span>
                </button>
              ))}
            </div>

            {/* Progress overview */}
            {wishes.length>0&&(
              <div className="wish-overview">
                <div className="wish-overview-left">
                  <svg width={72} height={72} viewBox="0 0 72 72">
                    <circle cx={36} cy={36} r={28} fill="none" stroke="var(--ring-track)" strokeWidth={5}/>
                    {wishesPct>0&&(
                      <circle cx={36} cy={36} r={28} fill="none" stroke="#E07CC3" strokeWidth={5}
                        strokeDasharray={(wishesPct/100*2*Math.PI*28).toFixed(1)+" "+(2*Math.PI*28).toFixed(1)}
                        strokeLinecap="round" transform="rotate(-90 36 36)" style={{transition:"stroke-dasharray 0.6s ease"}}/>
                    )}
                    <text x={36} y={33} textAnchor="middle" dominantBaseline="central" fill="#E07CC3" fontSize={14} fontWeight={700}>{wishesPct}%</text>
                    <text x={36} y={47} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontWeight={500}>achieved</text>
                  </svg>
                  <div>
                    <p className="wish-stat-big" style={{color:"#E07CC3"}}>{wishesDone}<span style={{color:"var(--text-muted)",fontSize:13,fontWeight:400}}>/{wishes.length}</span></p>
                    <p style={{fontSize:11,color:"var(--text-muted)",margin:0}}>wishes fulfilled</p>
                  </div>
                </div>
                <div className="wish-overview-right">
                  {buyCount>0&&(
                    <div className="wish-buy-summary">
                      <span className="mini-pill" style={{background:"rgba(232,130,74,0.12)",color:"#E8824A",display:"inline-flex",alignItems:"center",gap:4}}><Icon name="shopping" size={11}/> {buyDone}/{buyCount} bought</span>
                      {buyTotal>0&&<span className="mini-pill" style={{background:"rgba(212,160,84,0.12)",color:"#D4A054"}}>₹{buyTotal.toLocaleString()} budget</span>}
                    </div>
                  )}
                  <div className="wish-overview-cats">
                    {Object.entries(WISH_CATS).map(([k,v])=>{
                      const cnt=typeWishes.filter(w=>w.category===k).length;
                      if(!cnt)return null;
                      return <span key={k} className="mini-pill" style={{background:v.bg,color:v.color,display:"inline-flex",alignItems:"center",gap:4}}><Icon name={v.icon} size={11}/> {cnt}</span>;
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="wish-filters">
              {[{k:"all",l:"All"},{k:"active",l:"Active"},{k:"done",l:"Done"},
                ...(wishTab==="buy"?BUY_CATS:wishTab==="dream"?DREAM_CATS:Object.keys(WISH_CATS)).map(k=>({k,l:WISH_CATS[k]?.label,icon:WISH_CATS[k]?.icon}))
              ].map(f=>(
                <button key={f.k} onClick={()=>setWishFilter(f.k)}
                  className={"wish-filter-btn"+(wishFilter===f.k?" active":"")}
                  style={wishFilter===f.k?{background:"rgba(224,124,195,0.15)",color:"#E07CC3",borderColor:"rgba(224,124,195,0.4)"}:{}}>
                  {f.icon&&<Icon name={f.icon} size={11}/>} {f.l}
                </button>
              ))}
            </div>

            {/* Add / Edit form */}
            {showWF&&(
              <div className="form-card" style={{borderLeftColor:WISH_CATS[wf.category]?.color||"#E07CC3"}}>
                <p className="form-title">{editWId?"edit item":wf.type==="buy"?"add something to buy":"add to bucket list"}</p>
                {/* Type toggle */}
                <div className="wish-type-toggle">
                  <button onClick={()=>setWf(f=>({...f,type:"dream",category:DREAM_CATS.includes(f.category)?f.category:"goal"}))}
                    className={"wish-type-btn"+(wf.type==="dream"?" active":"")}
                    style={wf.type==="dream"?{background:"rgba(224,124,195,0.15)",color:"#E07CC3",borderColor:"#E07CC3"}:{}}>
                    <Icon name="star" size={14}/> Bucket List
                  </button>
                  <button onClick={()=>setWf(f=>({...f,type:"buy",category:BUY_CATS.includes(f.category)?f.category:"shopping"}))}
                    className={"wish-type-btn"+(wf.type==="buy"?" active":"")}
                    style={wf.type==="buy"?{background:"rgba(232,130,74,0.15)",color:"#E8824A",borderColor:"#E8824A"}:{}}>
                    <Icon name="shopping" size={14}/> To Buy
                  </button>
                </div>
                <div className="form-grid">
                  <input placeholder={wf.type==="buy"?"What do you want to buy?":"What do you dream of?"} value={wf.title} onChange={e=>setWf(f=>({...f,title:e.target.value}))} style={{gridColumn:"1/-1"}}/>
                  <select value={wf.category} onChange={e=>setWf(f=>({...f,category:e.target.value}))}>
                    {(wf.type==="buy"?BUY_CATS:DREAM_CATS).map(k=><option key={k} value={k}>{WISH_CATS[k].label}</option>)}
                  </select>
                  <select value={wf.priority} onChange={e=>setWf(f=>({...f,priority:e.target.value}))}>
                    {Object.entries(WISH_PRIO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {wf.type==="buy"&&(
                    <input type="number" placeholder="Price (₹)" value={wf.price} onChange={e=>setWf(f=>({...f,price:e.target.value}))} min="0"/>
                  )}
                  <input type="date" value={wf.targetDate} onChange={e=>setWf(f=>({...f,targetDate:e.target.value}))}/>
                </div>
                <textarea placeholder={wf.type==="buy"?"Notes, links, where to buy…":"Notes, inspiration, why this matters…"} value={wf.notes} onChange={e=>setWf(f=>({...f,notes:e.target.value}))}
                  style={{minHeight:60,background:(WISH_CATS[wf.category]?.bg||"transparent"),borderColor:(WISH_CATS[wf.category]?.color||"#ccc")+"30"}}/>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={cancelW} className="ghost-btn">cancel</button>
                  <button onClick={submitW} className="save-btn" style={{background:WISH_CATS[wf.category]?.color||"#E07CC3"}}>{editWId?"update":"save"}</button>
                </div>
              </div>
            )}

            {/* Wish cards */}
            {filteredWishes.length===0&&!showWF&&<p className="empty-state">{wishes.length===0?"no wishes yet — start dreaming":"no items match this filter"}</p>}
            <div className="wishes-grid">
              {filteredWishes.map(w=>{
                const cat=WISH_CATS[w.category]||WISH_CATS.other;
                const prio=WISH_PRIO[w.priority]||WISH_PRIO.want;
                const dl=daysLeft(w.targetDate);
                const isBuy=(w.type||"dream")==="buy";
                return (
                  <div key={w.id} className={"wish-card"+(w.done?" done":"")} style={{borderTopColor:cat.color}}>
                    <div className="wish-card-top">
                      <span className="wish-emoji" style={{color:cat.color}}><Icon name={cat.icon} size={20} color={cat.color}/></span>
                      <div className="wish-badges">
                        {isBuy&&<span className="mini-pill" style={{background:"rgba(232,130,74,0.12)",color:"#E8824A"}}>to buy</span>}
                        <span className="mini-pill" style={{background:cat.bg,color:cat.color}}>{cat.label}</span>
                        <span className="mini-pill" style={{background:prio.color+"18",color:prio.color}}>{prio.label}</span>
                      </div>
                    </div>
                    <p className={"wish-title"+(w.done?" crossed":"")}>{w.title}</p>
                    {isBuy&&w.price&&<p className="wish-price">₹{Number(w.price).toLocaleString()}</p>}
                    {w.notes&&<p className="wish-notes">{w.notes}</p>}
                    <div className="wish-meta">
                      {w.targetDate&&(
                        <span className="proj-meta-item" style={{color:dl!=null&&dl<0?"#D4537E":dl!=null&&dl<30?"#D4A054":"var(--text-muted)"}}>
                          <CalIcon/>{fmtDate(w.targetDate)} {dl!=null&&(dl<0?"· overdue":dl===0?"· today":"· "+dl+"d")}
                        </span>
                      )}
                      {w.createdAt&&<span style={{fontSize:10,color:"var(--text-muted)"}}>added {fmtDate(w.createdAt.split("T")[0])}</span>}
                    </div>
                    <div className="wish-actions">
                      <button onClick={()=>toggleWish(w.id)} className={"wish-done-btn"+(w.done?" checked":"")}
                        style={w.done?{background:"rgba(107,170,132,0.15)",color:"#6BAA84",borderColor:"rgba(107,170,132,0.4)"}:{}}>
                        {w.done?(isBuy?"✓ bought":"✓ achieved"):(isBuy?"○ mark bought":"○ mark done")}
                      </button>
                      <button onClick={()=>openEditW(w)} className="ghost-btn" style={{fontSize:11}}>edit</button>
                      <button onClick={()=>delWish(w.id)} className="ghost-btn danger" style={{fontSize:11}}>delete</button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ════════════════════ EXPENSES ══════════════════════════════════ */}
        {tab==="expenses"&&(
          <div className="tab-content">

            {/* Month nav */}
            <div className="exp-month-bar">
              <button onClick={()=>navMonth(-1)} className="ghost-btn" style={{padding:"6px 14px"}}>←</button>
              <div style={{textAlign:"center"}}>
                <p className="exp-month-label">{fmtMonth(expMonth)}</p>
                {expMonth!==monthKey(new Date())&&(
                  <button onClick={()=>setExpMonth(monthKey(new Date()))} className="exp-month-today">↩ this month</button>
                )}
              </div>
              <button onClick={()=>navMonth(1)} disabled={expMonth===monthKey(new Date())} className="ghost-btn" style={{padding:"6px 14px",opacity:expMonth===monthKey(new Date())?0.3:1}}>→</button>
            </div>

            {/* Summary cards */}
            <div className="exp-summary-grid">
              <div className="exp-summary-card" style={{borderTopColor:"#56B4D3"}}>
                <span className="exp-summary-label">spent</span>
                <span className="exp-summary-val" style={{color:"#56B4D3"}}>{fmtINR(monthSpent)}</span>
                <span className="exp-summary-sub">{monthExp.filter(e=>e.type==="expense").length} transactions</span>
              </div>
              <div className="exp-summary-card" style={{borderTopColor:"#6BAA84"}}>
                <span className="exp-summary-label">income</span>
                <span className="exp-summary-val" style={{color:"#6BAA84"}}>{fmtINR(monthIncome)}</span>
                <span className="exp-summary-sub">{monthExp.filter(e=>e.type==="income").length} entries</span>
              </div>
              <div className="exp-summary-card" style={{borderTopColor:"#9B8EC4"}}>
                <span className="exp-summary-label">saved</span>
                <span className="exp-summary-val" style={{color:"#9B8EC4"}}>{fmtINR(monthSaved)}</span>
                <span className="exp-summary-sub">{monthExp.filter(e=>e.type==="savings").length} entries</span>
              </div>
              <div className="exp-summary-card" style={{borderTopColor:monthNet>=0?"#D4A054":"#D4537E"}}>
                <span className="exp-summary-label">free cash</span>
                <span className="exp-summary-val" style={{color:monthNet>=0?"#D4A054":"#D4537E"}}>{monthNet>=0?"":"−"}{fmtINR(Math.abs(monthNet))}</span>
                <span className="exp-summary-sub">income − spent − saved</span>
              </div>
            </div>

            {/* ── SAVINGS SECTION ────────────────────────────────────────── */}
            <section className="savings-section">
              <div className="section-header">
                <p className="section-title" style={{display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="savings" size={16} color="#6BAA84"/> Savings
                </p>
                <button onClick={openBudgets} className="ghost-btn" style={{fontSize:11}}>{savingsGoal>0?"edit goal":"+ set monthly goal"}</button>
              </div>

              <div className="savings-stats-grid">
                <div className="savings-stat-card" style={{borderTopColor:savingsActual>=0?"#6BAA84":"#D4537E"}}>
                  <span className="exp-summary-label">this month</span>
                  <span className="exp-summary-val" style={{color:savingsActual>=0?"#6BAA84":"#D4537E"}}>
                    {savingsActual>=0?"+":"−"}{fmtINR(Math.abs(savingsActual))}
                  </span>
                  <span className="exp-summary-sub">
                    {savingsGoal>0
                      ? (savingsActual>=savingsGoal
                          ? "goal hit"
                          : savingsActual>=0
                            ? `${fmtINR(savingsGoal-savingsActual)} to goal`
                            : "spending more than earning")
                      : "income − expenses"}
                  </span>
                </div>
                <div className="savings-stat-card" style={{borderTopColor:"#9B8EC4"}}>
                  <span className="exp-summary-label">last 6 months</span>
                  <span className="exp-summary-val" style={{color:"#9B8EC4"}}>{fmtINR(totalSaved6mo)}</span>
                  <span className="exp-summary-sub">{savingsGoal>0?`${monthsOnTrack}/6 on track`:"total saved"}</span>
                </div>
                <div className="savings-stat-card" style={{borderTopColor:"#D4A054"}}>
                  <span className="exp-summary-label">monthly goal</span>
                  <span className="exp-summary-val" style={{color:"#D4A054"}}>{savingsGoal>0?fmtINR(savingsGoal):"—"}</span>
                  <span className="exp-summary-sub">{savingsGoal>0?`${savingsPct}% reached`:"tap edit goal →"}</span>
                </div>
              </div>

              {/* Goal progress bar (only if goal set) */}
              {savingsGoal>0&&(
                <div style={{marginTop:14}}>
                  <div className="prog-track" style={{height:8}}>
                    <div className="prog-fill" style={{
                      width: (savingsActual <= 0 ? 0 : Math.min(100, (savingsActual / savingsGoal) * 100)) + "%",
                      background: savingsActual >= savingsGoal ? "#6BAA84" : "#D4A054",
                    }}/>
                  </div>
                </div>
              )}

              {/* By method breakdown */}
              {Object.keys(savedByCat).length>0&&(
                <div className="savings-method-list">
                  <p className="chart-title" style={{margin:"4px 0 8px"}}>by method this month</p>
                  {Object.entries(savedByCat).sort((a,b)=>b[1]-a[1]).map(([k,amt])=>{
                    const cat = SAVINGS_CATS[k] || SAVINGS_CATS.other;
                    const pct = monthSaved>0?Math.round((amt/monthSaved)*100):0;
                    return (
                      <div key={k} className="savings-method-row">
                        <span className="savings-method-icon" style={{background:cat.bg,color:cat.color}}>
                          <Icon name={cat.icon} size={14} color={cat.color}/>
                        </span>
                        <span className="savings-method-name" style={{color:cat.color}}>{cat.label}</span>
                        <div className="savings-method-bar">
                          <div className="prog-track" style={{height:5}}>
                            <div className="prog-fill" style={{width:pct+"%",background:cat.color}}/>
                          </div>
                        </div>
                        <span className="savings-method-amt">{fmtINR(amt)}</span>
                        <span className="savings-method-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 6-month trend bar chart */}
              {expenses.length>0&&(
                <div className="savings-trend-chart">
                  <p className="chart-title" style={{margin:"4px 0 8px"}}>monthly savings trend</p>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={savingsTrend} margin={{top:4,right:8,bottom:0,left:-20}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false}/>
                      <XAxis dataKey="label" tick={{fontSize:11,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"var(--text-muted)"}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${Math.round(v/1000)}k`}/>
                      <Tooltip formatter={v=>[fmtINR(v),"saved"]} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:10,fontSize:12}}/>
                      <Bar dataKey="saved" radius={[4,4,0,0]}>
                        {savingsTrend.map((m,i)=>(
                          <Cell key={i} fill={m.saved>=0 ? (savingsGoal>0&&m.saved>=savingsGoal?"#6BAA84":"#9B8EC4") : "#D4537E"}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Add / Edit form */}
            {showEF&&(()=>{
              const typeColor = ef.type==="income"?"#6BAA84":ef.type==="savings"?"#9B8EC4":"#56B4D3";
              const cats = catsForType(ef.type);
              const formTitle = editEId?"edit transaction":ef.type==="income"?"add income":ef.type==="savings"?"log savings":"add expense";
              return (
              <div className="form-card" style={{borderLeftColor: typeColor}}>
                <p className="form-title">{formTitle}</p>

                <div className="exp-type-toggle">
                  <button onClick={()=>setEf(f=>({...f,type:"expense",category:defaultCatForType("expense")}))}
                    className={"exp-type-btn"+(ef.type==="expense"?" active":"")}
                    style={ef.type==="expense"?{background:"rgba(86,180,211,0.15)",color:"#56B4D3",borderColor:"#56B4D3"}:{}}>
                    <Icon name="trending" size={14}/> Expense
                  </button>
                  <button onClick={()=>setEf(f=>({...f,type:"income",category:defaultCatForType("income")}))}
                    className={"exp-type-btn"+(ef.type==="income"?" active":"")}
                    style={ef.type==="income"?{background:"rgba(107,170,132,0.15)",color:"#6BAA84",borderColor:"#6BAA84"}:{}}>
                    <Icon name="wallet" size={14}/> Income
                  </button>
                  <button onClick={()=>setEf(f=>({...f,type:"savings",category:defaultCatForType("savings")}))}
                    className={"exp-type-btn"+(ef.type==="savings"?" active":"")}
                    style={ef.type==="savings"?{background:"rgba(155,142,196,0.15)",color:"#9B8EC4",borderColor:"#9B8EC4"}:{}}>
                    <Icon name="savings" size={14}/> Savings
                  </button>
                </div>

                <div className="form-grid">
                  <input type="number" placeholder="Amount (₹)" value={ef.amount} onChange={e=>setEf(f=>({...f,amount:e.target.value}))} min="0" step="0.01" autoFocus/>
                  <input type="date" value={ef.date} onChange={e=>setEf(f=>({...f,date:e.target.value}))} max={todayStr()}/>
                  <select value={ef.category} onChange={e=>setEf(f=>({...f,category:e.target.value}))}>
                    {Object.entries(cats).map(([k,v])=>
                      <option key={k} value={k}>{v.label}</option>
                    )}
                  </select>
                  <select value={ef.paymentMethod} onChange={e=>setEf(f=>({...f,paymentMethod:e.target.value}))}>
                    {PAY_METHODS.map(p=><option key={p.k} value={p.k}>{p.label}</option>)}
                  </select>
                </div>
                <input placeholder={ef.type==="savings"?"Note (e.g. monthly SIP, anniversary FD…)":"Note (optional)"} value={ef.note} onChange={e=>setEf(f=>({...f,note:e.target.value}))} style={{width:"100%",boxSizing:"border-box"}}/>

                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={cancelE} className="ghost-btn">cancel</button>
                  <button onClick={submitE} className="save-btn" style={{background: typeColor}}>{editEId?"update":"save"}</button>
                </div>
              </div>
              );
            })()}

            {/* Category breakdown + budgets */}
            {(monthSpent>0||budgets.length>0)&&(
              <section>
                <div className="section-header">
                  <p className="section-title">budgets & savings</p>
                  <button onClick={openBudgets} className="ghost-btn" style={{fontSize:11}}>{budgets.length>0?"edit":"+ set budgets"}</button>
                </div>

                {showBudgetEditor&&(
                  <div className="form-card" style={{borderLeftColor:"#D4A054"}}>
                    <p className="form-title">monthly budgets & savings goal</p>
                    <p style={{fontSize:11,color:"var(--text-muted)",margin:"-8px 0 6px"}}>set ₹0 or leave blank to remove</p>

                    <div className="budget-savings-row">
                      <span className="budget-cat-label" style={{color:"#6BAA84",display:"inline-flex",alignItems:"center",gap:6}}>
                        <Icon name="savings" size={16} color="#6BAA84"/> Savings goal (per month)
                      </span>
                      <input type="number" min="0" step="500" placeholder="0"
                        value={budgetDraft[SAVINGS_KEY]||""}
                        onChange={e=>setBudgetDraft(d=>({...d,[SAVINGS_KEY]:e.target.value}))}/>
                    </div>

                    <p className="budget-section-label">category budgets</p>
                    <div className="budget-grid">
                      {Object.entries(EXPENSE_CATS).map(([k,v])=>(
                        <div key={k} className="budget-input-row">
                          <span className="budget-cat-label" style={{color:v.color,display:"inline-flex",alignItems:"center",gap:6}}><Icon name={v.icon} size={14} color={v.color}/> {v.label}</span>
                          <input type="number" min="0" step="100" placeholder="0"
                            value={budgetDraft[k]||""}
                            onChange={e=>setBudgetDraft(d=>({...d,[k]:e.target.value}))}/>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button onClick={()=>setShowBudgetEditor(false)} className="ghost-btn">cancel</button>
                      <button onClick={saveBudgetDraft} className="save-btn" style={{background:"#D4A054"}}>save</button>
                    </div>
                  </div>
                )}


                <div className="cat-progress-list">
                  {Object.entries(spendByCat).sort((a,b)=>b[1]-a[1]).map(([k,spent])=>{
                    const cat = EXPENSE_CATS[k] || EXPENSE_CATS.other;
                    const limit = budgetByCat[k] || 0;
                    const pct = limit>0 ? Math.min(100, Math.round((spent/limit)*100)) : null;
                    const over = limit>0 && spent>limit;
                    return (
                      <div key={k} className="cat-progress-row">
                        <span className="cat-progress-emoji" style={{color:cat.color}}><Icon name={cat.icon} size={18} color={cat.color}/></span>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="cat-progress-top">
                            <span className="cat-progress-name" style={{color:cat.color}}>{cat.label}</span>
                            <span className="cat-progress-amt">
                              {fmtINR(spent)}{limit>0&&<span className="cat-progress-limit"> / {fmtINR(limit)}</span>}
                            </span>
                          </div>
                          <div className="prog-track">
                            <div className="prog-fill" style={{
                              width: (limit>0 ? pct : Math.min(100, Math.round((spent/Math.max(monthSpent,1))*100))) + "%",
                              background: over ? "#D4537E" : cat.color,
                            }}/>
                          </div>
                          {limit>0&&<span className="cat-progress-sub" style={{color:over?"#D4537E":"var(--text-muted)"}}>
                            {over ? `over by ${fmtINR(spent-limit)}` : `${fmtINR(limit-spent)} left`}
                          </span>}
                        </div>
                      </div>
                    );
                  })}
                  {/* budgets with no spend yet */}
                  {categoryBudgets.filter(b=>!(spendByCat[b.category])).map(b=>{
                    const cat = EXPENSE_CATS[b.category] || EXPENSE_CATS.other;
                    return (
                      <div key={b.id} className="cat-progress-row" style={{opacity:0.7}}>
                        <span className="cat-progress-emoji" style={{color:cat.color}}><Icon name={cat.icon} size={18} color={cat.color}/></span>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="cat-progress-top">
                            <span className="cat-progress-name" style={{color:cat.color}}>{cat.label}</span>
                            <span className="cat-progress-amt">{fmtINR(0)} <span className="cat-progress-limit">/ {fmtINR(b.monthlyLimit)}</span></span>
                          </div>
                          <div className="prog-track"><div className="prog-fill" style={{width:"0%",background:cat.color}}/></div>
                          <span className="cat-progress-sub">untouched</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Filters */}
            <div className="wish-filters">
              {[{k:"all",l:"All"},{k:"expense",l:"Expenses"},{k:"income",l:"Income"},{k:"savings",l:"Savings"},
                ...Object.keys(EXPENSE_CATS).filter(k=>spendByCat[k]).map(k=>({k,l:EXPENSE_CATS[k].label,icon:EXPENSE_CATS[k].icon}))
              ].map(f=>(
                <button key={f.k} onClick={()=>setExpFilter(f.k)}
                  className={"wish-filter-btn"+(expFilter===f.k?" active":"")}
                  style={expFilter===f.k?{background:"rgba(86,180,211,0.15)",color:"#56B4D3",borderColor:"rgba(86,180,211,0.4)"}:{}}>
                  {f.icon&&<Icon name={f.icon} size={11}/>} {f.l}
                </button>
              ))}
            </div>

            {/* Transactions grouped by date */}
            {filteredMonthExp.length===0&&!showEF&&(
              <p className="empty-state">{monthExp.length===0?"no transactions this month — add your first one":"nothing matches this filter"}</p>
            )}
            {txDates.map(d=>{
              const dayTotal = txDays[d].filter(t=>t.type==="expense").reduce((a,t)=>a+Number(t.amount||0),0);
              const dayIncome = txDays[d].filter(t=>t.type==="income").reduce((a,t)=>a+Number(t.amount||0),0);
              const daySaved = txDays[d].filter(t=>t.type==="savings").reduce((a,t)=>a+Number(t.amount||0),0);
              return (
                <div key={d} className="tx-day-group">
                  <div className="tx-day-header">
                    <span className="tx-day-date">{new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                    <span className="tx-day-total">
                      {dayTotal>0&&<span style={{color:"#56B4D3"}}>−{fmtINR(dayTotal)}</span>}
                      {dayIncome>0&&<span style={{color:"#6BAA84",marginLeft:8}}>+{fmtINR(dayIncome)}</span>}
                      {daySaved>0&&<span style={{color:"#9B8EC4",marginLeft:8}}>→{fmtINR(daySaved)}</span>}
                    </span>
                  </div>
                  {txDays[d].map(t=>{
                    const cat = catsForType(t.type)[t.category] || EXPENSE_CATS.other;
                    const pm = PAY_METHODS.find(p=>p.k===(t.paymentMethod||"cash")) || PAY_METHODS[0];
                    const isInc = t.type==="income";
                    const isSav = t.type==="savings";
                    const sign = isInc ? "+" : isSav ? "→" : "−";
                    const amtColor = isInc?"#6BAA84":isSav?"#9B8EC4":"var(--text-primary)";
                    return (
                      <div key={t.id} className="tx-row">
                        <div className="tx-icon" style={{background:cat.bg,color:cat.color}}><Icon name={cat.icon} size={18} color={cat.color}/></div>
                        <div className="tx-body">
                          <p className="tx-cat" style={{color:cat.color}}>{cat.label}{isSav&&<span style={{fontSize:10,fontWeight:600,marginLeft:6,padding:"1px 6px",borderRadius:6,background:"rgba(155,142,196,0.15)",color:"#9B8EC4"}}>SAVED</span>}</p>
                          {t.note&&<p className="tx-note">{t.note}</p>}
                          <div className="tx-meta">
                            <span className="tx-meta-item" style={{display:"inline-flex",alignItems:"center",gap:4}}><Icon name={pm.icon} size={11}/> {pm.label}</span>
                          </div>
                        </div>
                        <div className="tx-amount-col">
                          <span className="tx-amount" style={{color:amtColor}}>
                            {sign}{fmtINR(t.amount)}
                          </span>
                          <div className="tx-actions">
                            <button onClick={()=>openEditE(t)} className="ghost-btn" style={{fontSize:10,padding:"2px 8px"}}>edit</button>
                            <button onClick={()=>delE(t.id)} className="ghost-btn danger" style={{fontSize:10,padding:"2px 6px"}}>✕</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Top categories donut */}
            {expenseDonutData.length>0&&(
              <div className="chart-block">
                <p className="chart-title">top spending categories</p>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={expenseDonutData} cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                      {expenseDonutData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip formatter={v=>[fmtINR(v)]} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:10,fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {expenseDonutData.map(e=>(
                    <div key={e.name} className="pie-legend-item">
                      <span className="pie-dot" style={{background:e.color}}/>
                      <span className="pie-name">{e.name}</span>
                      <span className="pie-val" style={{color:e.color}}>{fmtINR(e.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ════════════════════ LOG ═══════════════════════════════════════ */}
        {tab==="log"&&(
          <div className="tab-content">

            {/* Date navigation */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--card-bg)",backdropFilter:"blur(16px)",border:"1px solid var(--card-border)",borderRadius:14,padding:"10px 16px",boxShadow:"var(--card-shadow)"}}>
              <button onClick={()=>navLogDate(-1)} className="ghost-btn" style={{padding:"5px 12px",fontSize:14}}>←</button>
              <div style={{textAlign:"center"}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>
                  {isLogToday?"today · "+new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):new Date(logDate+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
                </p>
                {!isLogToday&&(
                  <button onClick={()=>setLogDate(ds)} style={{marginTop:3,fontSize:10,fontWeight:600,color:"#D4537E",background:"none",border:"none",cursor:"pointer",padding:0}}>↩ back to today</button>
                )}
              </div>
              <button onClick={()=>navLogDate(1)} className="ghost-btn" style={{padding:"5px 12px",fontSize:14,opacity:isLogToday?0.3:1}} disabled={isLogToday}>→</button>
            </div>

            {/* Standup */}
            <section>
              <p className="section-title">daily standup</p>
              <div className="log-grid">
                {[
                  {key:"wins",    label:"wins",     ph:"What went well?",        c:"#6BAA84",bg:"rgba(107,170,132,0.07)"},
                  {key:"blockers",label:"blockers", ph:"What was blocking you?", c:"#D4A054",bg:"rgba(212,160,84,0.07)"},
                  {key:"plans",   label:"tomorrow", ph:"Plans for next day?",    c:"#9B8EC4",bg:"rgba(155,142,196,0.07)"},
                ].map(s=>(
                  <div key={s.key} className="log-item">
                    <p className="log-label" style={{color:s.c}}>{s.label}</p>
                    <textarea placeholder={s.ph} value={viewLog[s.key]||""}
                      onChange={e=>updateViewLog({[s.key]:e.target.value})}
                      style={{background:s.bg, borderColor:s.c+"30"}}/>
                  </div>
                ))}
              </div>
            </section>

            {/* Meetings */}
            <section>
              <p className="section-title">meetings</p>
              <div className="meeting-form">
                <input placeholder="meeting title" value={meetTitle} onChange={e=>setMeetTitle(e.target.value)} style={{flex:1}}/>
                <button onClick={addMeeting} className="add-btn" style={{flexShrink:0}}>+ log meeting</button>
              </div>
              {meetTitle&&(
                <textarea placeholder="notes, decisions, action items…" value={meetNotes} onChange={e=>setMeetNotes(e.target.value)} className="meeting-notes"/>
              )}
              {(viewLog.meetings||[]).length>0&&(
                <div className="meetings-list">
                  {viewLog.meetings.map(m=>(
                    <div key={m.id} className="meeting-row">
                      <div className="meeting-dot"/>
                      <div style={{flex:1}}>
                        <p className="meeting-title">{m.title}</p>
                        {m.notes&&<p className="meeting-notes-text">{m.notes}</p>}
                      </div>
                      <span className="meeting-time">{fmtTs(m.ts)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(viewLog.meetings||[]).length===0&&<p className="empty-state">no meetings logged</p>}
            </section>

            {/* Task recap */}
            <section>
              <div className="section-header">
                <p className="section-title">task recap</p>
                {viewLog.tasks.length>0&&<span className="section-count">{viewDoneT}/{viewLog.tasks.length} done</span>}
              </div>
              {viewLog.tasks.length===0?<p className="empty-state">no tasks this day</p>:(
                <div className="task-list">
                  {viewLog.tasks.map(t=>{
                    const proj=projects.find(p=>p.id===t.projectId), pc=(PRIO[t.priority]||PRIO.medium).c;
                    return (
                      <div key={t.id} className={"task-row"+(t.done?" done":"")} style={{opacity:t.done?0.55:1}}>
                        <span className="dot" style={{background:pc}}/>
                        <span className="task-text" style={{textDecoration:t.done?"line-through":"none"}}>{t.text}</span>
                        <div className="task-badges">
                          {proj&&<span className="mini-pill" style={{background:PCOLS[proj.ci]+"18",color:PCOLS[proj.ci]}}>{proj.name}</span>}
                        </div>
                        <span style={{fontSize:11,fontWeight:600,color:t.done?"#6BAA84":"var(--text-muted)"}}>{t.done?"✓ done":"open"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ════════════════════ CHARTS ════════════════════════════════════ */}
        {tab==="charts"&&(
          <div className="tab-content">
            {/* Stat cards */}
            <div className="stat-cards-row">
              {[
                {l:"Today",  v:`${pct}%`,        c:"#D4537E"},
                {l:"7d avg", v:`${sevenAvg}%`,   c:"#9B8EC4"},
                {l:"Planned",v:fmtDur(totalM),   c:"#6BAA84"},
                {l:"Tasks done",v:`${doneT}`,    c:"#D4A054"},
              ].map(s=>(
                <div key={s.l} className="stat-card">
                  <p className="stat-card-label">{s.l}</p>
                  <p className="stat-card-val" style={{color:s.c}}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Habit trend */}
            <div className="chart-block">
              <p className="chart-title">habit completion — last 7 days</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={weekData} margin={{top:8,right:8,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4537E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4537E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false}/>
                  <XAxis dataKey="day" tick={{fontSize:11,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>[`${v}%`,"completion"]} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:10,fontSize:12}}/>
                  <Area type="monotone" dataKey="pct" stroke="#D4537E" strokeWidth={2.5} fill="url(#rg)" dot={{fill:"#D4537E",r:3.5,strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="charts-row">
              {/* Tasks per day */}
              <div className="chart-block" style={{flex:1.5}}>
                <p className="chart-title">tasks completed per day</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={weekData} margin={{top:4,right:8,bottom:0,left:-20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false}/>
                    <XAxis dataKey="day" tick={{fontSize:11,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:10,fontSize:12}}/>
                    <Bar dataKey="tasks" fill="#D4A054" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category donut */}
              <div className="chart-block" style={{flex:1}}>
                <p className="chart-title">today by category</p>
                {pieData.length>0?(
                  <>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                          {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <Tooltip formatter={v=>[fmtDur(v)]} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:10,fontSize:12}}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-legend">
                      {pieData.map(e=>(
                        <div key={e.name} className="pie-legend-item">
                          <span className="pie-dot" style={{background:e.color}}/>
                          <span className="pie-name">{e.name}</span>
                          <span className="pie-val" style={{color:e.color}}>{fmtDur(e.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ):<p className="empty-state">no habits scheduled today</p>}
              </div>
            </div>

            {/* Mood trend */}
            <div className="chart-block">
              <p className="chart-title">mood — last 7 days</p>
              {weekData.some(d=>d.mood>0) ? (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={weekData} margin={{top:8,right:8,bottom:0,left:-20}}>
                    <defs>
                      <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9B8EC4" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#9B8EC4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false}/>
                    <XAxis dataKey="day" tick={{fontSize:11,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,5]} ticks={[1,2,3,4,5]} tick={{fontSize:10,fill:"var(--text-muted)"}} axisLine={false} tickLine={false}
                      tickFormatter={v=>v>=1&&v<=5?MOOD_LABELS[v-1]:""}/>
                    <Tooltip formatter={v=>[v>0?MOOD_LABELS[v-1]:"not logged","mood"]} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:10,fontSize:12}}/>
                    <Area type="monotone" dataKey="mood" stroke="#9B8EC4" strokeWidth={2.5} fill="url(#mg)" dot={{fill:"#9B8EC4",r:4,strokeWidth:0}} connectNulls={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="empty-state">log your mood on the Today tab to see trends</p>}
            </div>

            {/* Project health */}
            <div className="chart-block">
              <p className="chart-title">project health</p>
              {projects.length===0?<p className="empty-state">no projects yet</p>:(
                <div className="project-health-list">
                  {projects.map(p=>{
                    const pc=PCOLS[p.ci], st=STATUS[p.status];
                    return (
                      <div key={p.id} className="health-row">
                        <span className="health-name">{p.name}</span>
                        <div className="prog-track" style={{flex:1}}>
                          <div className="prog-fill" style={{width:p.progress+"%",background:pc}}/>
                        </div>
                        <span className="health-pct" style={{color:pc}}>{p.progress}%</span>
                        <span className="mini-pill" style={{background:st.bg,color:st.color}}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ MANAGE ════════════════════════════════════ */}
        {tab==="manage"&&(
          <div className="tab-content">
            {showHF&&(
              <div className="form-card" style={{borderLeftColor:CATS[hf.category].color}}>
                <p className="form-title">{editHId?"edit habit":"new habit"}</p>
                <div className="form-grid">
                  <input placeholder="habit name" value={hf.name} onChange={e=>setHf(f=>({...f,name:e.target.value}))} style={{gridColumn:"1/-1"}}/>
                  <select value={hf.category} onChange={e=>setHf(f=>({...f,category:e.target.value}))}>
                    {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <div style={{display:"flex",gap:8}}>
                    <input type="time" value={hf.startTime} onChange={e=>setHf(f=>({...f,startTime:e.target.value}))} style={{flex:1}}/>
                    <span style={{alignSelf:"center",color:"var(--text-muted)"}}>→</span>
                    <input type="time" value={hf.endTime} onChange={e=>setHf(f=>({...f,endTime:e.target.value}))} style={{flex:1}}/>
                  </div>
                </div>
                <div className="form-row" style={{alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span className="form-label">repeat on</span>
                  {DOWS.map((d,i)=>(
                    <button key={i} onClick={()=>toggleDay(i)} className={"day-btn"+(hf.days.includes(i)?" active":"")}
                      style={hf.days.includes(i)?{background:CATS[hf.category].color,color:"white",borderColor:CATS[hf.category].color}:{}}>
                      {d}
                    </button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={cancelH} className="ghost-btn">cancel</button>
                  <button onClick={submitH} className="save-btn" style={{background:CATS[hf.category].color}}>{editHId?"update":"save habit"}</button>
                </div>
              </div>
            )}

            <div className="habits-grid">
              {habits.map(h=>{
                const cat=CATS[h.category], streak=getStreak(h.id);
                return (
                  <div key={h.id} className="habit-manage-card" style={{borderTopColor:cat.color}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <span className="mini-pill" style={{background:cat.bg,color:cat.color}}>{cat.label}</span>
                      {streak>0&&<span className="streak-badge" style={{color:cat.color,background:cat.bg}}><Icon name="flame" size={11} color={cat.color}/> {streak}</span>}
                    </div>
                    <p className="habit-name" style={{marginTop:6}}>{h.name}</p>
                    <p style={{fontSize:11,color:"var(--text-muted)",margin:"4px 0 0"}}>{fmtTime(h.startTime)} – {fmtTime(h.endTime)}</p>
                    <p style={{fontSize:11,color:"var(--text-muted)",margin:"2px 0 0"}}>{h.days.map(d=>DOWS[d]).join(" ")}</p>
                    <div style={{display:"flex",gap:6,marginTop:10}}>
                      <button onClick={()=>openEditH(h)} className="ghost-btn" style={{flex:1,fontSize:11}}>edit</button>
                      <button onClick={()=>saveH(habits.filter(x=>x.id!==h.id))} className="ghost-btn danger" style={{flex:1,fontSize:11}}>delete</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Settings */}
            <div className="settings-section">
              <p className="section-title">settings</p>
              <div className="glass-card" style={{padding:"1.25rem",display:"flex",flexDirection:"column",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:13,color:"var(--text-secondary)",width:120,flexShrink:0}}>your name</span>
                  <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                    onBlur={()=>saveUser(nameInput)} style={{flex:1}}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:13,color:"var(--text-secondary)",width:120,flexShrink:0}}>background</span>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>use the sparkle button in the bottom-right corner</span>
                </div>
                <div style={{borderTop:"1px solid var(--border-color)",paddingTop:12}}>
                  <p style={{fontSize:12,color:"var(--text-muted)",margin:"0 0 12px"}}>
                    data is synced to the cloud via Supabase. access your Orbit from any device.
                  </p>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="ghost-btn danger"
                    style={{width:"100%",fontSize:12}}
                  >
                    sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── MOBILE DRAWER ───────────────────────────────────────────────── */}
      {drawerOpen&&(
        <div className="drawer-overlay" onClick={()=>setDrawerOpen(false)}>
          <div className="drawer-panel" onClick={e=>e.stopPropagation()}>
            <div className="drawer-head">
              <BrandLogo size={28}/>
              <div style={{flex:1}}>
                <p className="drawer-brand-name">Orbit</p>
                <p className="drawer-brand-sub">personal dashboard</p>
              </div>
              <button className="drawer-close" onClick={()=>setDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-user">
              <div className="user-avatar sm">{userName.charAt(0).toUpperCase()}</div>
              <div>
                <p style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{userName}</p>
                <p style={{fontSize:10,color:"var(--text-muted)"}}>{greeting}</p>
              </div>
            </div>
            <nav className="drawer-nav">
              {TABS.map(([k,l,c])=>(
                <button key={k}
                  onClick={()=>{setTab(k);setShowHF(false);setShowPF(false);setShowEF(false);setDrawerOpen(false);}}
                  className={"drawer-nav-item"+(tab===k?" active":"")}
                  style={tab===k?{color:c,background:c+"22",borderColor:c+"44"}:{}}>
                  <span className="drawer-nav-dot" style={{background:tab===k?c:"var(--border-color)"}}/>
                  {l}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ── THEME PICKER ────────────────────────────────────────────────── */}
      <ThemePicker themeId={themeId} onSelect={selectTheme}/>

      {/* ── CLAUDE AI CHAT ────────────────────────────────────────────────── */}
      <ClaudeChat
        habits={habits} comps={comps} projects={projects}
        sprints={sprints} logs={logs} todayH={todayH}
        todayC={todayC} todayLog={todayLog} userName={userName}
        expenses={expenses} budgets={budgets}
      />

    </div>
  );
}