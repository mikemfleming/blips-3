export const PENCIL_LIFETIME=16;

export class Life {
 constructor(size=512,height=size){this.size=size;this.height=height;this.cells=new Uint8Array(size*height);this.next=new Uint8Array(size*height);this.protection=new Uint16Array(size*height);this.generation=0;}
 step(){const n=this.size,a=this.cells,b=this.next;for(let y=0;y<this.height;y++){const up=((y+this.height-1)%this.height)*n,down=((y+1)%this.height)*n,row=y*n;for(let x=0;x<n;x++){const index=row+x;if(this.protection[index]>0){b[index]=1;this.protection[index]--;continue;}const l=(x+n-1)%n,r=(x+1)%n;const count=a[up+l]+a[up+x]+a[up+r]+a[row+l]+a[row+r]+a[down+l]+a[down+x]+a[down+r];b[row+x]=+(count===3||(count===2&&a[row+x]===1));}}this.cells=b;this.next=a;this.generation++;}
 resize(width,height){const oldWidth=this.size,oldHeight=this.height,cells=this.cells,protection=this.protection;this.size=width;this.height=height;this.cells=new Uint8Array(width*height);this.next=new Uint8Array(width*height);this.protection=new Uint16Array(width*height);const dx=Math.floor((width-oldWidth)/2),dy=Math.floor((height-oldHeight)/2);for(let y=0;y<oldHeight;y++)for(let x=0;x<oldWidth;x++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height){this.cells[yy*width+xx]=cells[y*oldWidth+x];this.protection[yy*width+xx]=protection[y*oldWidth+x];}}}
 density(){const counts=new Uint16Array(1024);for(let y=0;y<this.height;y++)for(let x=0;x<this.size;x++)counts[Math.floor(y/this.height*32)*32+Math.floor(x/this.size*32)]+=this.cells[y*this.size+x];return counts;}
 paint(points,value,iterations=PENCIL_LIFETIME){const lifetime=Number.isFinite(iterations)?Math.max(0,Math.min(1000,Math.floor(iterations))):0;for(const [x,y] of points)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<this.size&&yy>=0&&yy<this.height){const i=yy*this.size+xx;this.cells[i]=value;this.protection[i]=value?lifetime:0;}}}
 clear(){this.cells.fill(0);this.next.fill(0);this.protection.fill(0);this.generation=0;}
 loadText(cells,overlay=false,lifetimes=null){if(!overlay)this.clear();for(let i=0;i<this.cells.length;i++)if(cells[i]){this.cells[i]=1;this.protection[i]=lifetimes instanceof Uint16Array&&lifetimes.length===cells.length?lifetimes[i]:PENCIL_LIFETIME;}}
 random(random=Math.random,probability=.5){this.protection.fill(0);for(let i=0;i<this.cells.length;i++)this.cells[i]=+(random()<probability);this.generation=0;}
 stamp(rows,x,y){rows.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(c==='O')this.cells[((y+dy+this.height)%this.height)*this.size+(x+dx+this.size)%this.size]=1;}));}
}
export const patterns={Glider:['.O.','..O','OOO'],Blinker:['OOO'],Toad:['.OOO','OOO.'],Beacon:['OO..','OO..','..OO','..OO'],Block:['OO','OO'],Beehive:['.OO.','O..O','.OO.']};
