import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome',headless:true});
try {const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5176/?test=1');await p.waitForFunction(()=>window.__ronda?.magic?.ready,{timeout:60000});await p.locator('[data-action="start"]').click();
const result=await p.evaluate(()=>{const g=__ronda,m=g.magic,d=g.state.data;g.renderer.setAnimationLoop(null);Object.assign(d,{x:0,z:12,time:1200});const turns=[];for(let n=1;n<=15;n++){m.stopRaid();d.incidents.event=null;d.incidents.plan=null;d.night=n;g.incidents.sync();m.update(.01,n);turns.push({night:n,kind:d.incidents.plan.kind,witch:m.enemy?.type||null});}return turns});assert.deepEqual(result.filter(r=>r.witch).map(r=>[r.night,r.witch]),[[5,'frog'],[10,'stone'],[15,'frog']]);
assert.ok(await p.evaluate(()=>{const g=__ronda,m=g.magic,d=g.state.data;m.stopRaid();d.night=20;d.time=1199;g.incidents.sync();m.update(.01,1);if(m.enemy)return false;d.time=1200;m.update(.01,2);if(!m.enemy)return false;m.damage(m.enemy,999);m.update(.01,3);return !m.enemy}));assert.deepEqual(errors,[]);console.log('PASS 15-night shared rotation, alternating witches, 20:00 gate and no repeat after defeat');
}finally{await b.close()}
