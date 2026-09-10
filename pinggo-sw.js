const PINGGO_SW_VERSION='2026-09-10-performance-v1';
const PINGGO_CACHE='pinggo-static-'+PINGGO_SW_VERSION;

self.addEventListener('install',event=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('pinggo-static-')&&k!==PINGGO_CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

// HTML tetap network-first agar update cepat, tetapi simpan salinan terakhir untuk fallback/offline.
// Asset lokal memakai stale-while-revalidate supaya pembukaan berikutnya lebih ringan.
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(PINGGO_CACHE);
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok)cache.put(req,fresh.clone()).catch(()=>{});
        return fresh;
      }catch(_){
        return (await cache.match(req)) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  if(/\.(?:png|webp|jpg|jpeg|gif|svg|ico|webmanifest)$/i.test(url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(PINGGO_CACHE);
      const cached=await cache.match(req);
      const network=fetch(req).then(res=>{if(res&&res.ok)cache.put(req,res.clone()).catch(()=>{});return res}).catch(()=>null);
      return cached || await network || Response.error();
    })());
  }
});

self.addEventListener('push',event=>{
  let data={title:'PINGGO',body:'Aktivitas baru di PINGGO',url:'./'};
  try{if(event.data)data=Object.assign(data,event.data.json())}catch(_){try{data.body=event.data.text()}catch(__){}}
  event.waitUntil(self.registration.showNotification(data.title||'PINGGO',{
    body:data.body||'',
    icon:'./pinggo-icon-192.png',
    badge:'./pinggo-icon-192.png',
    tag:'pinggo-push',
    data:{url:data.url||'./'},
    renotify:true
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){if('focus' in client){await client.focus();if('navigate' in client)await client.navigate(target);return}}
    if(self.clients.openWindow)return self.clients.openWindow(target);
  })());
});
