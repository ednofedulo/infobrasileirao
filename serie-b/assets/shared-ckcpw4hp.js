var a=(t)=>String(t??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");function r(t){let e=t*100;if(e>0&&e<1)return"&lt;1%";if(e>99&&e<100)return"&gt;99%";return`${Math.round(e)}%`}
export{a as P,r as Q};
