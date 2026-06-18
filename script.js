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

 document
  .querySelectorAll(".page")
  .forEach(page =>
   page.classList.remove("active")
  );

 document
  .getElementById(id)
  .classList.add("active");

 closeMenu();

}

function getBits(){
 return bitsInput.value.replace(/[^01]/g,"").slice(0,128);
}

function setBits(bits){

  if(window.isComposing){
 return;
}

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

}

function removeBit(){
 let bits=getBits();
 setBits(bits.slice(0,-1));
}

function calculateSeed(){

 let bits = getBits();

 if(bits.length !== 128){
   return;
 }

 let rng = reverseBits(bits);

window.rngS0 = rng.s0;
window.rngS1 = rng.s1;

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

   window.seedCalculated = true;

document.getElementById(
 "bitsInput"
).value = "";

document.getElementById(
 "counter"
).innerHTML =
 "0 / 128";

saveData();

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

  const start =
 performance.now();

 if(
 typeof window.rngS0 === "undefined"
){
 currentResult.innerHTML =
   "候補数：-";
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
   window.rngS0,
   window.rngS1
 );

rng.advance(rangeMin);

let candidates = [];

if(
 text.length === 0
){
 return;
}

if(
 text.length > 30
){
 alert(
  "現在State検索は30bitまでです"
 );
 return;
}

let canUseCache = false;

if(
 window.cachedCandidates !== null &&
 text.length ===
 window.cachedBits.length + 1 &&
 text.startsWith(
  window.cachedBits
 )
){
 canUseCache = true;
}

if(canUseCache){

}

const targetBits =
 parseInt(text, 2);

const mask =
 (1 << text.length) - 1;


 let cacheCandidates = [];

if(
 window.useCandidateCache &&
 canUseCache
){

 const nextBit =
 Number(
  text[text.length - 1]
 );

for(
 let i = 0;
 i <
 window.cachedCandidates.length;
 i++
){

 let c =
  window.cachedCandidates[i];

 let rngTest =
  new Xoroshiro128p(
   c.s0,
   c.s1
  );

 let bit =
  Number(
   rngTest.getRandMax(2)
  );

 if(
  bit === nextBit
 ){

  cacheCandidates.push({
   frame:
    c.frame + 1,
   s0:
    rngTest.s0,
   s1:
    rngTest.s1
  });

 }

}

}

if(
 window.useCandidateCache &&
 canUseCache
){

 candidates =
  cacheCandidates;

}
else{

let windowBits = 0;

for(
 let k=rangeMin;
 k<=rangeMax;
 k++
){

windowBits =
 (
  (windowBits << 1)
  |
  Number(
   rng.getRandMax(2)
  )
 ) & mask;

if(
 k >= rangeMin +
 text.length - 1
){

if(
 windowBits ===
 targetBits
){

 candidates.push({
  frame:k,
  s0:rng.s0,
  s1:rng.s1
 });

}

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
}

window.cachedBits =
 text;

window.cachedCandidates =
 [...candidates];

document.getElementById(
 "currentResult"
).innerHTML =

"候補数 : " +
candidates.length;

if(
 candidates.length === 1
){
 currentResult.style.color =
  "lime";
}
else if(
 candidates.length === 0
){
 currentResult.style.color =
  "red";
}
else{
 currentResult.style.color =
  "";
}

if(candidates.length === 1){

 let rng2 =
  new Xoroshiro128p(
   window.rngS0,
   window.rngS1
  );

rng2.advance(
 candidates[0].frame + 1
);

window.currentSeedS0 =
 rng2.s0;

window.currentSeedS1 =
 rng2.s1;

let currentAdvance =
 candidates[0].frame + 1;

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

  window.rngS0 = rng2.s0;
window.rngS1 = rng2.s1;

document.getElementById(
 "bitsInput"
).value = "";

document.getElementById(
 "counter"
).innerHTML =
 "0 / 128";

saveData();

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
  window.rngS0,
  window.rngS1
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
  "currentResult"
 ).innerHTML =
 "候補数 : -";

 document.getElementById(
  "startS0"
 ).value = "";

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

delete window.rngS0;
delete window.rngS1;

sessionStorage.clear();

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
  typeof window.rngS0 ===
  "undefined"
 ){

  return;
 }

 calculateCurrent();

}

function checkAutoCalculate(){
  
  

  bitsInput.value =
 bitsInput.value
  .replace(/０/g,"0")
  .replace(/１/g,"1");

if(
 window.isComposing &&
 getBits().length >= 32
){
 return;
}
  
let bits =
 getBits();

if(bits.length === 34){

 bitsInput.blur();
 bitsInput.focus();

}

setBits(bits);

 if(bits.length === 128){

  calculateSeed();

  return;
 }

if(
 typeof window.rngS0 !==
 "undefined"
){
 calculateCurrent();
}

}

window.isComposing = false;


bitsInput.addEventListener(
 "compositionend",
 ()=>{

  window.isComposing = false;

  let bits =
   getBits();

  setBits(bits);

  checkAutoCalculate();

 }
);

function saveData(){

 sessionStorage.setItem(
  "bitsInput",
  document.getElementById(
   "bitsInput"
  ).value
 );

 sessionStorage.setItem(
  "startS0",
  document.getElementById(
   "startS0"
  ).value
 );

 sessionStorage.setItem(
  "startS1",
  document.getElementById(
   "startS1"
  ).value
 );

 sessionStorage.setItem(
  "currentS0",
  document.getElementById(
   "currentS0"
  ).value
 );

 sessionStorage.setItem(
  "currentS1",
  document.getElementById(
   "currentS1"
  ).value
 );

 sessionStorage.setItem(
  "rangeMin",
  document.getElementById(
   "rangeMin"
  ).value
 );

 sessionStorage.setItem(
  "rangeMax",
  document.getElementById(
   "rangeMax"
  ).value
 );

 sessionStorage.setItem(
  "targetAdvance",
  document.getElementById(
   "targetAdvance"
  ).value
 );

 sessionStorage.setItem(
  "consumeBody",
  document.getElementById(
   "consumeBody"
  ).innerHTML
 );

 sessionStorage.setItem(
 "counter",
 document.getElementById(
  "counter"
 ).innerHTML
);

sessionStorage.setItem(
 "currentResult",
 document.getElementById(
  "currentResult"
 ).innerHTML
);

 sessionStorage.setItem(
  "rngS0",
  window.rngS0?.toString() || ""
 );

 sessionStorage.setItem(
  "rngS1",
  window.rngS1?.toString() || ""
 );

 sessionStorage.setItem(
  "lastAdvance",
  window.lastAdvance ?? ""
 );

}

function loadData(){

 document.getElementById(
  "bitsInput"
 ).value =
 sessionStorage.getItem(
  "bitsInput"
 ) || "";

 document.getElementById(
  "startS0"
 ).value =
 sessionStorage.getItem(
  "startS0"
 ) || "";

 document.getElementById(
  "startS1"
 ).value =
 sessionStorage.getItem(
  "startS1"
 ) || "";

 document.getElementById(
  "currentS0"
 ).value =
 sessionStorage.getItem(
  "currentS0"
 ) || "";

 document.getElementById(
  "currentS1"
 ).value =
 sessionStorage.getItem(
  "currentS1"
 ) || "";

 document.getElementById(
  "rangeMin"
 ).value =
 sessionStorage.getItem(
  "rangeMin"
 ) || "0";

 document.getElementById(
  "rangeMax"
 ).value =
 sessionStorage.getItem(
  "rangeMax"
 ) || "10000";

 document.getElementById(
  "targetAdvance"
 ).value =
 sessionStorage.getItem(
  "targetAdvance"
 ) || "";

 document.getElementById(
  "consumeBody"
 ).innerHTML =
 sessionStorage.getItem(
  "consumeBody"
 ) || "";

 document.getElementById(
 "counter"
).innerHTML =
 sessionStorage.getItem(
  "counter"
 ) || "0 / 128";

document.getElementById(
 "currentResult"
).innerHTML =
 sessionStorage.getItem(
  "currentResult"
 ) || "候補数 : -";

 if(
  sessionStorage.getItem(
   "rngS0"
  )
 ){
  window.rngS0 =
   BigInt(
    sessionStorage.getItem(
     "rngS0"
    )
   );
 }

 if(
  sessionStorage.getItem(
   "rngS1"
  )
 ){
  window.rngS1 =
   BigInt(
    sessionStorage.getItem(
     "rngS1"
    )
   );
 }

 if(
  sessionStorage.getItem(
   "lastAdvance"
  )
 ){
  window.lastAdvance =
   parseInt(
    sessionStorage.getItem(
     "lastAdvance"
    )
   );
 }

}

window.addEventListener(
 "load",
 loadData
);

document.getElementById(
 "rangeMin"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "rangeMax"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "targetAdvance"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "bitsInput"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "rangeMax"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "targetAdvance"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "bitsInput"
).addEventListener(
 "input",
 saveData
);

function toggleStateSection(){

 const section =
  document.getElementById(
   "stateSection"
  );

 const title =
  document.getElementById(
   "stateTitle"
  );

 if(
  section.style.display
  === "none"
 ){

  section.style.display =
   "flex";

  title.innerHTML =
   "▼ State";

 }
 else{

  section.style.display =
   "none";

  title.innerHTML =
   "▶ State";

 }

}

function toggleSearchSection(){

 const section =
  document.getElementById(
   "searchSection"
  );

 const title =
  document.getElementById(
   "searchTitle"
  );

 if(
  section.style.display
  === "none"
 ){

  section.style.display =
   "block";

  title.innerHTML =
   "▼ 検索設定";

 }
 else{

  section.style.display =
   "none";

  title.innerHTML =
   "▶ 検索設定";

 }

}

window.cachedBits = "";
window.cachedCandidates = null;

window.useCandidateCache =
 true;

const NATURES = [
 "がんばりや",
 "さみしがり",
 "ゆうかん",
 "いじっぱり",
 "やんちゃ",
 "ずぶとい",
 "すなお",
 "のんき",
 "わんぱく",
 "のうてんき",
 "おくびょう",
 "せっかち",
 "まじめ",
 "ようき",
 "むじゃき",
 "ひかえめ",
 "おっとり",
 "れいせい",
 "てれや",
 "うっかりや",
 "おだやか",
 "おとなしい",
 "なまいき",
 "しんちょう",
 "きまぐれ"
];

const MARK_LISTS = [

 "わんぱく",
 "のうてんき",
 "きんちょう",
 "きたい",
 "カリスマ",
 "れいせい",
 "じょうねつ",
 "ゆだん",
 "たこう",
 "ふんぬ",
 "びしょう",
 "ひそう",
 "かいちょう",
 "げきはつ",
 "りせい",
 "ほんのう",
 "こうかつ",
 "こわもて",
 "やさがた",
 "どうよう",
 "こうよう",
 "けんたい",
 "じしん",
 "ふしん",
 "ぼくとつ",
 "ふじゅん",
 "げんき",
 "ふちょう"

];

function genMark(
 rng,
 weather,
 isFishing
){

const flag =
 rng.getRandMax(1000);

const rare =
 rng.getRandMax(100);

const uncommon =
 rng.getRandMax(50);

const weatherRoll =
 rng.getRandMax(50);

const timeRoll =
 rng.getRandMax(50);

const fishingRoll =
 rng.getRandMax(25);

 if(flag === 0n){
  return "みたことのない";
 }

if(rare === 0n){

const idx =
 Number(
  rng.getRandMax(
   MARK_LISTS.length
  )
 );

console.log(
 "MARK IDX",
 idx,
 MARK_LISTS[idx]
 );

return MARK_LISTS[idx];

}


 if(uncommon === 0n){
  return "ときどきみる";
 }

 if(
 weatherRoll === 0n &&
 weather !== "晴れ"
){
switch(weather){

  case "曇り":
   return "どんてん";

  case "雨":
   return "あめふり";

  case "雪":
   return "こうせつ";

  case "吹雪":
   return "ごうせつ";

  case "霧":
   return "のうむ";

  case "砂嵐":
   return "さじん";

  case "雷雨":
   return "いかづち";

  case "日照":
   return "かんそう";

 }

}

if(
 timeRoll === 0n
){
 return "時間帯";
}

if(
 fishingRoll === 0n &&
 isFishing
){
 return "つりあげられた";
}

 return "";

}

function matchFilter(
 p,
 filters
){

console.log(
 "filter",
 filters.shiny
);  

 if(
  filters.gender !== "" &&
  p.gender.toString() !==
  filters.gender
 ){
  return false;
 }

 if(
  filters.nature !== "" &&
  p.nature !==
  filters.nature
 ){
  return false;
 }

 if(
  filters.shiny === "1" &&
  !p.shiny
 ){
  return false;
 }

 if(
  filters.shiny === "2" &&
  p.shinyType !== 1
 ){
  return false;
 }

 if(
  filters.shiny === "3" &&
  p.shinyType !== 2
 ){
  return false;
 }

 if(
  filters.mark !== "" &&
  p.mark !==
  filters.mark
 ){
  return false;
 }

 const ivChecks = [
 [0, filters.ivHMin, filters.ivHMax],
 [1, filters.ivAMin, filters.ivAMax],
 [2, filters.ivBMin, filters.ivBMax],
 [3, filters.ivCMin, filters.ivCMax],
 [4, filters.ivDMin, filters.ivDMax],
 [5, filters.ivSMin, filters.ivSMax]
];

for(const [idx, min, max] of ivChecks){

 if(
  p.ivs[idx] < Number(min) ||
  p.ivs[idx] > Number(max)
 ){
  return false;
 }

}

 return true;

}



function generatePokemonListFast(
 s0,
 s1,
 startFrame,
 count,
 shinyCharm,
 markCharm,
 filters,
 tsv
){

// NX一致版 2026-06-12

const localRng =
 new Xoroshiro128p(
  0n,
  0n
 );

 const list = [];

 const rng =
  new Xoroshiro128p(
   s0,
   s1
  );

 rng.advance(
  startFrame
 );

for(
 let i=0;
 i<count;
 i++
){

const p =
 generatePokemonFromCurrentSeed(
  rng,
  startFrame + i,
  shinyCharm,
  markCharm,
  tsv,
  localRng
 );

 
rng.getRand(2);

if(
 !matchFilter(
  p,
  filters
 )
){
 continue;
}

list.push(p);


 }

console.log(
 "results",
 list.length
);

 return list;

}

function generatePokemonFromCurrentSeed(
 rng,
 frame,
 shinyCharm,
 markCharm,
 tsv
){

console.log("frame", frame);

console.log(
 "seed",
 rng.s0.toString(16),
 rng.s1.toString(16)
);

const workRng =
 new Xoroshiro128p(
  rng.s0,
  rng.s1
 );

let totalConsume = 0;

// 日替わりシンボル
workRng.getRandMax(100);

// slot固定
const slot = 0;

//   rng.getRandMax(0xFFFFFFFF);

//rng.getRandMax(100);

//rng.getRandMax(100);

//const slot =
 //Number(
  //rng.getRandMax(100)
 //);

   const mark = ""
 //genMark( rng,
  //"曇り",
  //false);

  //workRng.getRandMax(1000);

  //workRng.getRand();

const shinyRolls =
 shinyCharm ? 3 : 1;

 let shiny = false;

for(let i=0;i<shinyRolls;i++){

console.log("inside for");

 const num4 =
  Number(
   workRng.getRand() &
   0xFFFFFFFFn
  );

  const roll =
 (
  (
   (
    num4 ^
    (num4 >>> 16)
   ) & 0xFFFF
  ) >>> 4
 );

 if(
  (
   (
    (
     (    
     num4 ^
     (num4 >>> 16)
    ) & 0xFFFF
   ) >>> 4
  ) ^
  tsv
  ) === 0
 ){
  shiny = true;
  break;
 }

}

const genderRoll =
 Number(
  workRng.getRandMax(8)
 );

 const nature =
  NATURES[
   Number(
    workRng.getRandMax(25)
   )
  ];

 // const gender =
 //(
  //Number(
   //workRng.getRandMax(2)
  //) === 1
 //)
 //? 0
 //: 1;

 const gender =
 (
  genderRoll & 1
 ) === 1 
 ? 0
 : 1;

   const ability =
   (
    Number(
      workRng.getRandMax(2)
    ) === 1
   )
   ? 0
   : 1; 

const rawRand = workRng.getRand();

const localSeed =
 Number(
  rawRand &
  0xFFFFFFFFn
 );

const localRng =
 new Xoroshiro128p(
  BigInt(localSeed),
  9413281287807789659n
 );



const ec =
 Number(
  localRng.getRand() &
  0xFFFFFFFFn
 );

let pid =
 Number(
  localRng.getRand() &
  0xFFFFFFFFn
 );

//if(shinyCharm){

// for(
//  let i = 0;
//  i < 2;
//  i++
// ){

//  const testPid =
//   Number(
//    localRng.getRand() &
//    0xFFFFFFFFn
//   );

//  const testPsv =
//   (
//    (
//     (testPid >>> 16) ^
//     (testPid & 0xFFFF)
//    )
//   ) >>> 0;

//  if(
//   (testPsv ^ tsv) < 16
//  ){

//  pid = testPid;
//   break;

//  }

// }

//}

 const psv =
 (
  ((pid >>> 16) ^
   (pid & 0xFFFF))
 ) >>> 0;

let shinyType = 0;

const xor =
 (
  (pid >>> 16) ^
  (pid & 0xFFFF) ^
  tsv
 ) >>> 0;

if(shiny){

 if(xor >= 16){

  pid =
   (
    (
     (tsv ^
      (pid & 0xFFFF)
     ) << 16
    ) |
    (pid & 0xFFFF)
   ) >>> 0;

  shinyType = 1;

 }else if(xor > 0){

  shinyType = 2;

 }else{

  shinyType = 1;

 }

}else if(xor < 16){

 pid =
  (pid ^ 0x10000000)
  >>> 0;

}

const ivs = [
 Number(localRng.getRandMax(32)),
 Number(localRng.getRandMax(32)),
 Number(localRng.getRandMax(32)),
 Number(localRng.getRandMax(32)),
 Number(localRng.getRandMax(32)),
 Number(localRng.getRandMax(32))
];

const height = 
Number(
  localRng.getRandMax(129)
 ) +
 Number(
  localRng.getRandMax(128)
 );

const weight = 
Number(
  localRng.getRandMax(129)
 ) +
 Number(
  localRng.getRandMax(128)
 );

console.log(
 "MARK RNG",
 workRng.s0.toString(16),
 workRng.s1.toString(16)
); 

 const shinyMarkData =
 genMark(
  workRng,
  "曇り",
  false
 );

if(shiny){
 console.log(
  "SHINY RETURN",
  frame
 );
} 

 return {
  frame,
  slot,
  nature,
  ability,
  gender,
  ec,
 pid,
 localSeed,
 shiny,
 shinyType,
 shinyMark:
  shinyType === 1
   ? "◆"
   : shinyType === 2
   ? "★"
   : "",
 ivs,
 height,
weight,
  mark:
  shinyMarkData !== ""
   ? shinyMarkData
   : mark
 };

}

function searchPokemon(){

 const s0 =
  BigInt(
   "0x" +
   document.getElementById(
    "searchS0"
   ).value
  );

 const s1 =
  BigInt(
   "0x" +
   document.getElementById(
    "searchS1"
   ).value
  );

  const shinyCharm =
 document.getElementById(
  "shinyCharm"
 ).checked;

const markCharm =
 document.getElementById(
  "markCharm"
 ).checked;

const min =
 Number(
  document.getElementById(
   "searchRangeMin"
  ).value
 );

const max =
 Number(
  document.getElementById(
   "searchRangeMax"
  ).value
 );

const filters = {

 nature:
 document.getElementById(
  "natureFilter"
 ).value,

 ability:
 document.getElementById(
  "abilityFilter"
 ).value,

 gender:
 document.getElementById(
  "genderFilter"
 ).value,

 shiny:
 document.getElementById(
  "shinyFilter"
 ).value,

 mark:
 document.getElementById(
  "markFilter"
 ).value,

 ivHMin:
 document.getElementById(
  "ivHMin"
 ).value,

ivHMax:
 document.getElementById(
  "ivHMax"
 ).value,

ivAMin:
 document.getElementById(
  "ivAMin"
 ).value,

ivAMax:
 document.getElementById(
  "ivAMax"
 ).value,

ivBMin:
 document.getElementById(
  "ivBMin"
 ).value,

ivBMax:
 document.getElementById(
  "ivBMax"
 ).value,

ivCMin:
 document.getElementById(
  "ivCMin"
 ).value,

ivCMax:
 document.getElementById(
  "ivCMax"
 ).value,

ivDMin:
 document.getElementById(
  "ivDMin"
 ).value,

ivDMax:
 document.getElementById(
  "ivDMax"
 ).value,

ivSMin:
 document.getElementById(
  "ivSMin"
 ).value,

ivSMax:
 document.getElementById(
  "ivSMax"
 ).value

};

const tsv =
 parseInt(
  document.getElementById(
   "tsv"
  ).value
 ) || 0;

const results =
 generatePokemonListFast(
  s0,
  s1,
  min,
　max,
  shinyCharm,
  markCharm,
  filters,
  tsv
 );

 let html = "";

//html += `
//<tr>
//<th>F</th>
//<th>色</th>
//<th>性格</th>
//<th>特性</th>
//<th>性別</th>
//<th>H</th>
//<th>A</th>
//<th>B</th>
//<th>C</th>
//<th>D</th>
//<th>S</th>
//<th>PID</th>
//<th>EC</th>
//<th>証</th>
//</tr>
//`;

for(const p of results){

html += `

<div class="pokemonCard">

    <div class="frameRow">
        ${p.frame}F :
    </div>

    <div class="nameRow">
        <span class="speciesName">[種族名]</span>
        <span class="natureName">${p.nature}</span>
        <span class="shinyArea">
        ${
          p.shinyType === 1
          ? "◆"
          : p.shinyType === 2
          ? "★"
          : ""
        }
        </span>
    </div>

    <div class="ivRow">
        <span>
            ${p.gender === 0 ? "♂" : "♀"}
        </span>

        <span>
            ${p.ivs.join("-")}
        </span>

        <span>
            Lv
        </span>
    </div>

    <div class="extraRow">

        <span>
            ${p.mark}
        </span>

        <span>
            特性${p.ability}
        </span>

    </div>

</div>

`;
 
}



document.getElementById(
 "searchResult"
).innerHTML = html;

}


