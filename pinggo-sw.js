self.addEventListener('install',event=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={title:'PINGGO',body:'Aktivitas baru di PINGGO',url:'./'};
  try{if(event.data)data=Object.assign(data,event.data.json())}catch(_){try{data.body=event.data.text()}catch(__){}}
  event.waitUntil(self.registration.showNotification(data.title||'PINGGO',{
    body:data.body||'',
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
