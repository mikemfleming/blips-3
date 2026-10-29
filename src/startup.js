export function parseStartupOptions(search){
 const params=new URLSearchParams(search);
 const requestedSpeed=params.get('speed'),requestedSound=params.get('sound');
 const rawDensity=params.get('density');
 const density=rawDensity===null?null:rawDensity.trim()!==''&&Number.isFinite(Number(rawDensity))?Math.min(100,Math.max(0,Number(rawDensity))):50;
 return {
  speed:['tortoise','hare'].includes(requestedSpeed)?requestedSpeed:'hare',
  sound:['stabby','smooth'].includes(requestedSound)?requestedSound:'smooth',
  text:params.get('text'),density,
 };
}
