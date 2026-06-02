function toggleMenu(){

 const m =
 document.getElementById("menu");

 const o =
 document.getElementById("overlay");

 if(m.style.left==="0px"){

   m.style.left="-250px";
   o.style.display="none";

 }else{

   m.style.left="0px";
   o.style.display="block";
 }
}

 function closeMenu(){

 document.getElementById("menu")
 .style.left="-250px";

 document.getElementById("overlay")
 .style.display="none";
}
 
function showPage(id){
 seedPage.classList.remove("active");
 tsvPage.classList.remove("active");
 document.getElementById(id).classList.add("active");
 closeMenu();
}

function getBits(){
 return bitsInput.value.replace(/[^01]/g,"").slice(0,128);
}

function setBits(bits){
 let lines=[];
 for(let i=0;i<bits.length;i+=32){
   lines.push(bits.slice(i,i+32));
 }
 bitsInput.value=lines.join("\n");
 counter.textContent=bits.length+" / 128";
}

function appendBit(bit){
 let bits=getBits();

 if(bits.length>=128)return;
 bits+=bit;
 setBits(bits);

checkAutoCalculate();

console.log("length=", bits.length);

}

function removeBit(){
 let bits=getBits();
 setBits(bits.slice(0,-1));
}

bitsInput.addEventListener("input",()=>{
 setBits(getBits());
});

function calculateSeed(){

 let bits = getBits();

 if(bits.length !== 128){

   result.innerHTML =
     "128bit入力してください";
   return;
 }

 let rng = reverseBits(bits);

window.currentS0 = rng.s0;
window.currentS1 = rng.s1;

document.getElementById(
 "startS0"
).value =
 rng.s0
  .toString(16)
  .toUpperCase()
  .padStart(16,"0");

document.getElementById(
 "startS1"
).value =
 rng.s1
  .toString(16)
  .toUpperCase()
  .padStart(16,"0");

 let s0 =
   rng.s0
   .toString(16)
   .toUpperCase()
   .padStart(16,"0");

 let s1 =
   rng.s1
   .toString(16)
   .toUpperCase()
   .padStart(16,"0");

 result.innerHTML =
   "state[0]<br>" +
   s0 +
   "<br><br>" +
   "state[1]<br>" +
   s1;

   window.seedCalculated = true;

document.getElementById(
 "bitsInput"
).value = "";

document.getElementById(
 "counter"
).innerHTML =
 "0 / 128";
}

function calculateTSV(){
 const tid=parseInt(document.getElementById("tid").value);
 const sid=parseInt(document.getElementById("sid").value);

 if(isNaN(tid)||isNaN(sid)){
   tsvResult.innerHTML="TIDとSIDを入力してください";
   return;
 }
 tsvResult.innerHTML="TSV : "+((tid^sid)>>4);
}

const MASK64 = (1n << 64n) - 1n;

function rotl(x,k){
return (((x << BigInt(k)) & MASK64) |
(x >> BigInt(64-k))) & MASK64;
}

function rotr(x,k){
return ((x >> BigInt(k)) |
((x << BigInt(64-k)) & MASK64)) & MASK64;
}

class Xoroshiro128p{

constructor(s0,s1){
this.s0=BigInt(s0);
this.s1=BigInt(s1);
}

setState(s0,s1){
this.s0=BigInt(s0)&MASK64;
this.s1=BigInt(s1)&MASK64;
}

getRand(){

const num=this.s0;
const num2=num^this.s1;

const result=
(this.s0+this.s1)&MASK64;

this.s0=
(rotl(num,24)^
num2^
((num2<<16n)&MASK64))
&MASK64;

this.s1=rotl(num2,37);

return result;
}

getRandMax(num){

 num = BigInt(num);

 let mask;

 if(
  (num & (num - 1n))
  === 0n
 ){
  mask = num - 1n;
 }else{

  mask = 1n;

  while(mask < num){
   mask <<= 1n;
  }

  mask -= 1n;
 }

 let value;

 do{
  value =
   this.getRand() &
   mask;
 }while(
  value >= num
 );

 return value;
}
 
back(n=1){

for(let step=0;step<n;step++){

 let num3=this.s0;
 let num4=this.s1;

 let t=
   rotr(
     (
       num3 ^
       ((rotl(num4,27)<<16n)&MASK64)
     )&MASK64,
     24
   ) ^ rotl(num4,3);

 t&=MASK64;

 this.s0=t;

 this.s1=
  (t^rotl(num4,27))
  &MASK64;

}
}
}

 Xoroshiro128p.prototype.advance = function(n=1){

 if(n < 0){

   for(let i=0;i<Math.abs(n);i++){
     this.back(1);
   }

   return;
 }

 for(let i=0;i<n;i++){
   this.getRand();
 }
}
 
class Matrix{

constructor(row,col){

this.mat =
Array.from(
{length:row},
()=>Array(col).fill(false)
);
}

getElement(r,c){
return this.mat[r][c];
}

setElement(r,c,v){
this.mat[r][c]=v;
}

addRows(src,dst){

for(let i=0;i<this.mat[0].length;i++){

 this.mat[dst][i] ^=
   this.mat[src][i];

}
}

swapRows(i,j){

for(let k=0;k<this.mat[0].length;k++){

 let t=this.mat[i][k];

 this.mat[i][k]=
   this.mat[j][k];

 this.mat[j][k]=t;

}
}

addColumns(src,dst){

for(let i=0;i<this.mat.length;i++){

 this.mat[i][dst] ^=
   this.mat[i][src];

}
}

swapColumns(i,j){

for(let k=0;k<this.mat.length;k++){

 let t=this.mat[k][i];

 this.mat[k][i]=
   this.mat[k][j];

 this.mat[k][j]=t;

}
}
mulMatrix(b){

 let matrix =
   new Matrix(
     this.mat.length,
     b.mat[0].length
   );

 if(
   this.mat[0].length !==
   b.mat.length
 ){
   return matrix;
 }

 let length=this.mat.length;
 let length2=b.mat[0].length;
 let length3=this.mat[0].length;

 for(let i=0;i<length;i++){

   for(let j=0;j<length2;j++){

     for(let k=0;k<length3;k++){

       matrix.mat[i][j] ^=
         (
           this.mat[i][k] &&
           b.mat[k][j]
         );
     }
   }
 }

 return matrix;
}inverse(){

let matrix =
new Matrix(
this.mat.length,
this.mat[0].length
);

let matrix2 =
new Matrix(
this.mat.length,
this.mat[0].length
);

let length=this.mat.length;

for(let i=0;i<length;i++){

matrix.mat[i][i]=true;

for(let j=0;j<length;j++){

 matrix2.mat[i][j]=
   this.mat[i][j];

}
}

let num=0;
let list=[];

for(let k=0;k<length;k++){

for(let l=num;l<length;l++){

 if(matrix2.mat[k][l]){

   for(let m=0;m<length;m++){

     if(
       m!==l &&
       matrix2.mat[k][m]
     ){

       matrix2.addColumns(l,m);
       matrix.addColumns(l,m);
     }
   }

   matrix2.swapColumns(l,num);
   matrix.swapColumns(l,num);

   list.push(k);

   num++;

   break;
 }

}
}

for(
let n=list.length-1;
n>=0;
n--
){

let i2=list[n];

matrix.swapColumns(i2,n);
}

return matrix;
}
}

function toXoroshiro128(matrix){

let s0 = 0n;
let s1 = 0n;

for(let i=0;i<64;i++){

if(matrix.getElement(i,0)){

 s0 |= (1n << BigInt(i));

}
}

for(let j=0;j<64;j++){

if(matrix.getElement(j+64,0)){

 s1 |= (1n << BigInt(j));

}
}

return new Xoroshiro128p(
s0,
s1
);
}
 function createLowBits(){

let lowbits = new Matrix(128,128);

let rng =
new Xoroshiro128p(
0n,
0n
);

for(let l=0;l<128;l++){

let num2 =
1n <<
BigInt(l % 64);

if(l < 64){

 rng.setState(
   num2,
   0n
 );

}else{

 rng.setState(
   0n,
   num2
 );

}

for(let m=0;m<128;m++){

 let test =
   new Xoroshiro128p(
     rng.s0,
     rng.s1
   );

 for(
   let n=0;
   n<m;
   n++
 ){
   test.getRand();
 }

 let num3 =
   test.getRand() & 1n;

 lowbits.setElement(
   m,
   l,
   num3 > 0n
 );

}
}

return lowbits;
}
const low = createLowBits();
const lowInv = low.inverse();
function reverseBits(bitString){

let matrix =
new Matrix(128,1);

for(let i=0;i<64;i++){

if(bitString[i] === "1"){

 matrix.setElement(
   i,
   0,
   true
 );

}

if(bitString[i+64] === "1"){

 matrix.setElement(
   i+64,
   0,
   true
 );

}
}

let matrix2 =
lowInv.mulMatrix(
matrix
);

let rng =
toXoroshiro128(
matrix2
);

for(
let j=0;
j<bitString.length;
j++
){

rng.getRand();
}

return rng;
}


 setBits("");
function calculateCurrent(){

 if(
 typeof window.currentS0 === "undefined"
){
 currentResult.innerHTML =
   "先にSeed特定してください";
 return;
}

 let text =
 document.getElementById(
   "bitsInput"
 ).value;

 text =
 text.replace(/[^01]/g,"");

 let rangeMin =
 parseInt(
   document.getElementById(
     "rangeMin"
   ).value
 );

 let rangeMax =
 parseInt(
   document.getElementById(
     "rangeMax"
   ).value
 );

let rng =
 new Xoroshiro128p(
   window.currentS0,
   window.currentS1
 );

rng.advance(rangeMin);

let windowBits = "";

let candidates = [];

for(
 let k=rangeMin;
 k<=rangeMax;
 k++
){

 windowBits +=
 rng.getRandMax(2)
 .toString();
 
if(
 windowBits.length >
 text.length
){
 windowBits =
  windowBits.substring(1);
}
 
if(k < rangeMin + 20){
 console.log(
   k,
   windowBits
 );
}

if(
  windowBits === text
 ){
 candidates.push(k);
  console.log(
   "hit",
   k + 1,
   windowBits
 );
 }

  if(
  candidates.length > 100
 ){

  document.getElementById(
   "currentResult"
  ).innerHTML =
   "候補数 : 100以上";

  return;

}
}

document.getElementById(
 "currentResult"
).innerHTML =

"候補数 : " +
candidates.length +
"<br><br>" +
candidates
 .slice(0,20)
 .map(x => x + 1)
 .join(",")
if(candidates.length === 1){

 let rng2 =
  new Xoroshiro128p(
   window.currentS0,
   window.currentS1
  );

rng2.advance(
 candidates[0] + 1
);

let currentAdvance =
 candidates[0] + 1;

let targetAdvance =
 parseInt(
  document.getElementById(
   "targetAdvance"
  ).value
 ) || 0;

let consume;

if(
 typeof window.lastAdvance
 === "undefined"
){
 consume =
  currentAdvance;
}
else{
 consume =
  currentAdvance -
  window.lastAdvance;
}

let remain =
 targetAdvance -
 currentAdvance;

addConsumeRow(
 consume,
 currentAdvance,
 remain
);

window.lastAdvance =
 currentAdvance;

 document.getElementById(
  "currentStateResult"
 ).innerHTML =

 "現在位置特定成功<br><br>" +

 "S0<br>" +
 rng2.s0
  .toString(16)
  .toUpperCase()
  .padStart(16,"0") +

 "<br><br>S1<br>" +

 rng2.s1
  .toString(16)
  .toUpperCase()
  .padStart(16,"0");

  document.getElementById(
 "currentS0"
).value =
 rng2.s0
  .toString(16)
  .toUpperCase()
  .padStart(16,"0");

document.getElementById(
 "currentS1"
).value =
 rng2.s1
  .toString(16)
  .toUpperCase()
  .padStart(16,"0");

  window.currentS0 = rng2.s0;
window.currentS1 = rng2.s1;

document.getElementById(
 "bitsInput"
).value = "";

document.getElementById(
 "counter"
).innerHTML =
 "0 / 128";

}
}

 function showMotionList(){

 let rangeMin =
 parseInt(
  document.getElementById(
   "rangeMin"
  ).value
 );

 let rangeMax =
 parseInt(
  document.getElementById(
   "rangeMax"
  ).value
 );

 let rng =
 new Xoroshiro128p(
  window.currentS0,
  window.currentS1
 );

 rng.advance(rangeMin);

 let html =
 "<table border='1'>" +
 "<tr>" +
 "<th>F</th>" +
 "<th>Motion</th>" +
 "<th>S0</th>" +
 "<th>S1</th>" +
 "</tr>";

 let motion = "-";

 for(
  let f=rangeMin;
  f<=rangeMax;
  f++
 ){

  html +=
  "<tr>" +
  "<td>"+f+"</td>" +
  "<td>"+motion+"</td>" +
  "<td>"+
   rng.s0
   .toString(16)
   .toUpperCase()
   .padStart(16,"0")+
  "</td>" +
  "<td>"+
   rng.s1
   .toString(16)
   .toUpperCase()
   .padStart(16,"0")+
  "</td>" +
  "</tr>";

  motion =
   rng.getRandMax(2)
   .toString();

 }

 html += "</table>";

 document.getElementById(
  "motionResult"
 ).innerHTML = html;
}

function showMotionList(){

 let rangeMin =
 parseInt(
  document.getElementById(
   "rangeMin"
  ).value
 );

 let rangeMax =
 parseInt(
  document.getElementById(
   "rangeMax"
  ).value
 );

 let rng =
 new Xoroshiro128p(
  window.currentS0,
  window.currentS1
 );

 rng.advance(rangeMin);

 let html =
 "<table border='1'>" +
 "<tr>" +
 "<th>F</th>" +
 "<th>Motion</th>" +
 "<th>S0</th>" +
 "<th>S1</th>" +
 "</tr>";

 let motion = "-";

 for(
  let f=rangeMin;
  f<=rangeMax;
  f++
 ){

  html +=
  "<tr>" +
  "<td>"+f+"</td>" +
  "<td>"+motion+"</td>" +
  "<td>"+
   rng.s0
   .toString(16)
   .toUpperCase()
   .padStart(16,"0")+
  "</td>" +
  "<td>"+
   rng.s1
   .toString(16)
   .toUpperCase()
   .padStart(16,"0")+
  "</td>" +
  "</tr>";

  motion =
   rng.getRandMax(2)
   .toString();
 }

 html += "</table>";

 document.getElementById(
  "motionResult"
 ).innerHTML = html;
}

function clearAll(){

 if(
  !confirm(
   "本当にクリアしますか？"
  )
 ){
  return;
 }

 document.getElementById(
  "bitsInput"
 ).value = "";

 document.getElementById(
  "counter"
 ).innerHTML =
 "0 / 128";

 document.getElementById(
  "result"
 ).innerHTML =
 "結果がここに表示されます";



 document.getElementById(
  "currentResult"
 ).innerHTML =
 "結果がここに表示されます";

 document.getElementById(
  "currentStateResult"
 ).innerHTML = "";

 document.getElementById(
  "startS0"
 ).value = "";

 document.getElementById(
  "startS1"
 ).value = "";

 document.getElementById(
  "currentS0"
 ).value = "";

 document.getElementById(
  "currentS1"
 ).value = "";

 document.getElementById(
  "rangeMin"
 ).value = "0";

 document.getElementById(
  "rangeMax"
 ).value = "10000";

 delete window.lastAdvance;

 document.getElementById(
 "consumeBody"
).innerHTML = "";

}   

function addConsumeRow(
 consume,
 total,
 remain
){

 let tbody =
 document.getElementById(
  "consumeBody"
 );

 let no =
 tbody.rows.length;

 tbody.innerHTML +=

 "<tr>" +

 "<td>" +
 no +
 "</td>" +

 "<td>" +
 consume +
 "</td>" +

 "<td>" +
 total +
 "</td>" +

 "<td>" +
 remain +
 "</td>" +

 "</tr>";
}

function calculate(){

 let text =
 document.getElementById(
  "bitsInput"
 ).value;

 text =
 text.replace(/[^01]/g,"");

 if(
  text.length === 128
 ){
  calculateSeed();
  return;
 }

 if(
  typeof window.currentS0 ===
  "undefined"
 ){

  document.getElementById(
   "result"
  ).innerHTML =
   "先に128bitから開始stateを求めてください";

  return;
 }

 calculateCurrent();

}

function checkAutoCalculate(){

 let bits =
  getBits();

 if(bits.length === 128){

  calculateSeed();

  return;
 }

 if(
  typeof window.currentS0 !==
  "undefined"
 ){
  calculateCurrent();
 }

}





