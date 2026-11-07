(function(){
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'}):null;
document.querySelectorAll('.reveal').forEach(function(el){io?io.observe(el):el.classList.add('in')});
var c=document.querySelector('canvas.dust');if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var x=c.getContext('2d'),P=[],W,H,d=Math.min(2,devicePixelRatio||1);
function rs(){var r=c.getBoundingClientRect();W=c.width=r.width*d;H=c.height=r.height*d;P=[];var n=Math.round(r.width*r.height/9000);for(var i=0;i<n;i++)P.push({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.1+.2)*d,v:(Math.random()*.12+.03)*d,a:Math.random()*.5+.1,p:Math.random()*6.28})}
function f(t){x.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.y-=p.v;if(p.y<0)p.y=H;x.globalAlpha=p.a*(.6+.4*Math.sin(t/1400+p.p));x.fillStyle='#d9f5a6';x.beginPath();x.arc(p.x,p.y,p.r,0,6.28);x.fill()}requestAnimationFrame(f)}
addEventListener('resize',rs);rs();requestAnimationFrame(f);})();