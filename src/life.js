export class Life {
 constructor(size=512){this.size=size;this.cells=new Uint8Array(size*size);this.next=new Uint8Array(size*size);this.generation=0;}
 step(){const n=this.size,a=this.cells,b=this.next;for(let y=0;y<n;y++){const up=((y+n-1)%n)*n,down=((y+1)%n)*n,row=y*n;for(let x=0;x<n;x++){const l=(x+n-1)%n,r=(x+1)%n;const count=a[up+l]+a[up+x]+a[up+r]+a[row+l]+a[row+r]+a[down+l]+a[down+x]+a[down+r];b[row+x]=+(count===3||(count===2&&a[row+x]===1));}}this.cells=b;this.next=a;this.generation++;}
 density(){const counts=new Uint16Array(1024),s=this.size/32;for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++)counts[Math.floor(y/s)*32+Math.floor(x/s)]+=this.cells[y*this.size+x];return counts;}
 random(){for(let i=0;i<this.cells.length;i++)this.cells[i]=+(Math.random()<.5);this.generation=0;}
 stamp(rows,x,y){rows.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(c==='O')this.cells[((y+dy+this.size)%this.size)*this.size+(x+dx+this.size)%this.size]=1;}));}
}
export const patterns={Glider:['.O.','..O','OOO'],Blinker:['OOO'],Toad:['.OOO','OOO.'],Beacon:['OO..','OO..','..OO','..OO'],Block:['OO','OO'],Beehive:['.OO.','O..O','.OO.']};
