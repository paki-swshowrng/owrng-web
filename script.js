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

  sessionStorage.setItem(
  "currentPage",
  id
 );

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
   "入力を全てクリアします。よろしいですか？"
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

 sessionStorage.setItem(
 "categoryFilter",
 document.getElementById(
  "categoryFilter"
 ).value
);

sessionStorage.setItem(
 "areaFilter",
 document.getElementById(
  "areaFilter"
 ).value
);

sessionStorage.setItem(
 "timeFilter",
 document.getElementById(
  "timeFilter"
 ).value
);

if(
 document.getElementById(
  "weatherFilter"
 ).value !== ""
){
 sessionStorage.setItem(
  "weatherFilter",
  document.getElementById(
   "weatherFilter"
  ).value
 );
}

sessionStorage.setItem(
 "lvMin",
 document.getElementById(
  "lvMin"
 ).value
);

sessionStorage.setItem(
 "lvMax",
 document.getElementById(
  "lvMax"
 ).value
);

sessionStorage.setItem(
 "natureFilter",
 document.getElementById(
  "natureFilter"
 ).value
);

sessionStorage.setItem(
 "abilityFilter",
 document.getElementById(
  "abilityFilter"
 ).value
);

sessionStorage.setItem(
 "genderFilter",
 document.getElementById(
  "genderFilter"
 ).value
);

sessionStorage.setItem(
 "markFilter",
 document.getElementById(
  "markFilter"
 ).value
);

sessionStorage.setItem(
 "shinyFilter",
 document.getElementById(
  "shinyFilter"
 ).value
);

[
 "ivHMin","ivHMax",
 "ivAMin","ivAMax",
 "ivBMin","ivBMax",
 "ivCMin","ivCMax",
 "ivDMin","ivDMax",
 "ivSMin","ivSMax"
].forEach(id => {

 sessionStorage.setItem(
  id,
  document.getElementById(id).value
 );

});

sessionStorage.setItem(
 "searchS0",
 document.getElementById(
  "searchS0"
 ).value
);

sessionStorage.setItem(
 "searchS1",
 document.getElementById(
  "searchS1"
 ).value
);

sessionStorage.setItem(
 "searchRangeMin",
 document.getElementById(
  "searchRangeMin"
 ).value
);

sessionStorage.setItem(
 "searchRangeMax",
 document.getElementById(
  "searchRangeMax"
 ).value
);

sessionStorage.setItem(
 "tsv",
 document.getElementById(
  "tsv"
 ).value
);

sessionStorage.setItem(
 "shinyCharm",
 document.getElementById(
  "shinyCharm"
 ).checked
);

sessionStorage.setItem(
 "markCharm",
 document.getElementById(
  "markCharm"
 ).checked
);

sessionStorage.setItem(

 "areaFilter",

 document.getElementById(

  "areaFilter"

 ).value

);

if(
 document.getElementById(
  "speciesFilter"
 ).value !== ""
){
 sessionStorage.setItem(
  "speciesFilter",
  document.getElementById(
   "speciesFilter"
  ).value
 );
}

}

function clearFilters(){

 if(
  !confirm(
   "入力を全てクリアします。よろしいですか？"
  )
 ){
  return;
 }  

 document.getElementById(
  "categoryFilter"
 ).value = "daily";

 document.getElementById(
  "timeFilter"
 ).value = "朝(6:00~8:59)";

 document.getElementById(
  "areaFilter"
 ).value = "";

 areaFilter.dispatchEvent(
  new Event("change")
 );

 document.getElementById(
  "weatherFilter"
 ).value = "";

 weatherFilter.dispatchEvent(
  new Event("change")
 );

 document.getElementById(
  "speciesFilter"
 ).value = "";

 document.getElementById(
  "lvMin"
 ).value = "";

 document.getElementById(
  "lvMax"
 ).value = "";

 document.getElementById(
  "natureFilter"
 ).value = "";

 document.getElementById(
  "abilityFilter"
 ).value = "";

 document.getElementById(
  "genderFilter"
 ).value = "";

 document.getElementById(
  "markFilter"
 ).value = "";

 document.getElementById(
  "shinyFilter"
 ).value = "";

 [
  "ivHMin","ivHMax",
  "ivAMin","ivAMax",
  "ivBMin","ivBMax",
  "ivCMin","ivCMax",
  "ivDMin","ivDMax",
  "ivSMin","ivSMax"
 ].forEach(id => {

  document.getElementById(id).value =
   id.includes("Min")
   ? "0"
   : "31";

 });

 document.getElementById(
  "searchS0"
 ).value = "";

 document.getElementById(
  "searchS1"
 ).value = "";

 document.getElementById(
  "searchRangeMin"
 ).value = "0";

 document.getElementById(
  "searchRangeMax"
 ).value = "10000";

 saveData();

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

document.getElementById(
 "categoryFilter"
).value =
 sessionStorage.getItem(
  "categoryFilter"
 ) || "daily";

document.getElementById(
 "timeFilter"
).value =
 sessionStorage.getItem(
  "timeFilter"
 ) || "朝(6:00~8:59)";

document.getElementById(
 "lvMin"
).value =
 sessionStorage.getItem(
  "lvMin"
 ) || "";

document.getElementById(
 "lvMax"
).value =
 sessionStorage.getItem(
  "lvMax"
 ) || "";

document.getElementById(
 "natureFilter"
).value =
 sessionStorage.getItem(
  "natureFilter"
 ) || "";

document.getElementById(
 "abilityFilter"
).value =
 sessionStorage.getItem(
  "abilityFilter"
 ) || "";

document.getElementById(
 "genderFilter"
).value =
 sessionStorage.getItem(
  "genderFilter"
 ) || "";

document.getElementById(
 "markFilter"
).value =
 sessionStorage.getItem(
  "markFilter"
 ) || "";

document.getElementById(
 "shinyFilter"
).value =
 sessionStorage.getItem(
  "shinyFilter"
 ) || "";

[
 "ivHMin","ivHMax",
 "ivAMin","ivAMax",
 "ivBMin","ivBMax",
 "ivCMin","ivCMax",
 "ivDMin","ivDMax",
 "ivSMin","ivSMax"
].forEach(id => {

 document.getElementById(id).value =
  sessionStorage.getItem(id) ??
  (id.includes("Min") ? "0" : "31");

});

document.getElementById(
 "searchS0"
).value =
 sessionStorage.getItem(
  "searchS0"
 ) || "";

document.getElementById(
 "searchS1"
).value =
 sessionStorage.getItem(
  "searchS1"
 ) || "";

document.getElementById(
 "searchRangeMin"
).value =
 sessionStorage.getItem(
  "searchRangeMin"
 ) || "0";

document.getElementById(
 "searchRangeMax"
).value =
 sessionStorage.getItem(
  "searchRangeMax"
 ) || "10000";

document.getElementById(
 "tsv"
).value =
 sessionStorage.getItem(
  "tsv"
 ) || "0";

document.getElementById(
 "shinyCharm"
).checked =
 sessionStorage.getItem(
  "shinyCharm"
 ) === "true";

document.getElementById(
 "markCharm"
).checked =
 sessionStorage.getItem(
  "markCharm"
 ) === "true";

 document.getElementById(
 "areaFilter"
).value =
 sessionStorage.getItem(
  "areaFilter"
 ) || "";

 areaFilter.dispatchEvent(
 new Event("change")
);

document.getElementById(
 "weatherFilter"
).value =
 sessionStorage.getItem(
  "weatherFilter"
 ) || "晴れ";

//weatherFilter.dispatchEvent(
 //new Event("change")
//);

document.getElementById(
 "speciesFilter"
).value =
 sessionStorage.getItem(
  "speciesFilter"
 ) || "";

const currentPage =
 sessionStorage.getItem(
  "currentPage"
 );

if(currentPage){

 showPage(
  currentPage
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

document.getElementById(
 "categoryFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "timeFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "weatherFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "lvMin"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "lvMax"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "natureFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "abilityFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "genderFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "markFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "shinyFilter"
).addEventListener(
 "change",
 saveData
);

[
 "ivHMin","ivHMax",
 "ivAMin","ivAMax",
 "ivBMin","ivBMax",
 "ivCMin","ivCMax",
 "ivDMin","ivDMax",
 "ivSMin","ivSMax"
].forEach(id => {

 document.getElementById(id)
 .addEventListener(
  "input",
  saveData
 );

})

document.getElementById(
 "searchS0"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "searchS1"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "searchRangeMin"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "searchRangeMax"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "tsv"
).addEventListener(
 "input",
 saveData
);

document.getElementById(
 "shinyCharm"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "markCharm"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "areaFilter"
).addEventListener(
 "change",
 saveData
);

document.getElementById(
 "speciesFilter"
).addEventListener(
 "change",
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

if(
 filters.category !== "" &&
 p.category !== filters.category
){
  return false;
}

if(
 filters.area !== "" &&
 p.area !== filters.area
){
 return false;
}

if(
 filters.weather !== "" &&
 p.weather !== filters.weather
){
 return false;
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

const category =
 document.getElementById(
  "categoryFilter"
 ).value;

const p =
 category === "daily"
 ? generatePokemonFromCurrentSeed(
    rng,
    startFrame + i,
    shinyCharm,
    markCharm,
    tsv
   )
 : generateRandomSymbolPokemon(
    rng,
    startFrame + i,
    shinyCharm,
    markCharm,
    tsv
   );

   console.log(p);

console.log(
 "filter",
 matchFilter(
  p,
  filters
 )
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

 return list;

}

function generatePokemonFromCurrentSeed(
 rng,
 frame,
 shinyCharm,
 markCharm,
 tsv
){

const workRng =
 new Xoroshiro128p(
  rng.s0,
  rng.s1
 );

let totalConsume = 0;

// slot固定
const category =
document.getElementById(
  "categoryFilter"
).value;

if(
 category === "daily"
){

 workRng.getRandMax(100);

}
else{

 workRng.getRandMax(
  0xFFFFFFFF
 );

 workRng.getRandMax(100);

 workRng.getRandMax(100);

}

const area =
document.getElementById(
 "areaFilter"
).value;

const weather =
document.getElementById(
 "weatherFilter"
).value;

const version =
document.querySelector(
 'input[name="version"]:checked'
).value;

const wildTable =
category === "grass"
? (
 version === "Sword"
 ? WILD_SW
 : WILD_SH
 )
: (
 version === "Sword"
 ? WILD_SYMBOL_SW
 : WILD_SYMBOL_SH
 );

const wildData =
wildTable.find(
 x =>
 x.area === area &&
 x.weather === weather
);

let species = "";

let slot = 0;

let level = 0;

if(
 category !== "daily"
){

 slot =
  Number(
   workRng.getRandMax(100)
  );

 species =
  getSlotSpecies(
   wildData.slots,
   slot
  );

 level =
  wildData.minLv +
  Number(
   workRng.getRandMax(
    wildData.maxLv -
    wildData.minLv +
    1
   )
  );

}

//let slot = 0;

//if(
  //category === "daily"
//){
  //slot = 0;
//}

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

const abilityRoll =
 Number(
  workRng.getRandMax(8)
 );

const nature =
 NATURES[
  Number(
   workRng.getRandMax(25)
  )
 ];

const gender =
 (
  Number(
   workRng.getRandMax(2)
  ) === 1
 )
 ? 0
 : 1;

const ability =
 abilityRoll & 1;

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

 const shinyMarkData =
 genMark(
  workRng,
  "曇り",
  false
 );

 return {
  frame,
  slot,
  category,
  nature,
  ability,

  area:
  document.getElementById(
  "areaFilter"
  ).value,

  weather:
  document.getElementById(
  "weatherFilter"
  ).value,

species:
 category === "daily"
 ? document.getElementById(
    "speciesFilter"
   ).value
 : species,

 level,
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
slotroll: slot,
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
 ).value,

 category:
document.getElementById(
 "categoryFilter"
).value,

area:
document.getElementById(
 "areaFilter"
).value,

species:
document.getElementById(
 "speciesFilter"
).value,

lvMin:
document.getElementById(
 "lvMin"
).value,

lvMax:
document.getElementById(
 "lvMax"
).value,

time:
document.getElementById(
 "timeFilter"
).value,

weather:
document.getElementById(
 "weatherFilter"
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

for(const p of results){

html += `

<div class="
pokemonCard
${
  p.shinyType === 1
  ? "squareShiny"
  : p.shinyType ===2
  ? "starShiny"
  : ""
}">

    <div class="frameRow">
        ${p.frame}F :
    </div>

    <div class="nameRow">
        <span class="speciesName">
        ${p.species}
        </span>
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
            Lv${p.level}
        </span>
    </div>

    <div class="extraRow">

        <span>
            ${p.mark}
        </span>

        <span>
            特性${p.ability + 1}
        </span>

    </div>

</div>

`;
 
}

document.getElementById(
 "searchResult"
).innerHTML = html;

}

const areaFilter =
document.getElementById(
 "areaFilter"
);

const categoryFilter =
document.getElementById(
 "categoryFilter"
);

const version =

document.querySelector(

 'input[name="version"]:checked'

).value;

const wildTable =

categoryFilter.value === "grass"

? (

 version === "Sword"

 ? WILD_SW

 : WILD_SH

 )

: (

 version === "Sword"

 ? WILD_SYMBOL_SW

 : WILD_SYMBOL_SH

 );

 const oldArea =
 areaFilter.value;

const targetArea =
 oldArea
  .replace("(水上)", "")
  .replace("(空中)", "")
  .replace("(遠海)", "")
  .replace("(海)","")
  .replace("(水辺)", "")
  .replace("(砂場)", "")
  .replace("(崖と岩の間の砂地)", "")
  .replace("(湖に隣接してる草むら)", "")
  .replace("(湖を向いて左手方向に進んだ先の草むら)", "")
  .replace("(巨人の帽子に近い草むら)", "")
  .replace("(ストーンズ原野付近の砂地)", "")
  .replace("(砂塵の窪地に隣接してる砂地)", "")
  .replace("(枯れ草)", "")
  .replace("(こもれび林に近い草むら)", "")
  .replace("(中央付近の砂地)", "")
  .replace("(ガラル鉱山に近い草むら)", "");

 const areaSet =
 new Set();

for(
 const data of wildTable
){

 areaSet.add(
  data.area
 );

}

for(
 const area of areaSet
){

 const option =
 document.createElement(
  "option"
 );

 option.value =
 area;

 option.textContent =
 area;

 areaFilter.appendChild(
  option
 );

}

console.log("target", targetArea);

for(const area of areaSet){
 console.log("area", area);
}

if(
 areaSet.has(
  targetArea
 )
){

 areaFilter.value =
  targetArea;

}
else if(
 areaFilter.options.length > 0
){

 areaFilter.selectedIndex =
  0;

}

const weatherFilter =
document.getElementById(
 "weatherFilter"
);

areaFilter.addEventListener(
 "change",
 function(){

  weatherFilter.innerHTML = "";

const version =
 document.querySelector(
  'input[name="version"]:checked'
 ).value;

const wildTable =
categoryFilter.value === "grass"
? (
 version === "Sword"
 ? WILD_SW
 : WILD_SH
 )
: (
 version === "Sword"
 ? WILD_SYMBOL_SW
 : WILD_SYMBOL_SH
 );

  const weatherSet =
  new Set();

  for(
   const data of wildTable
  ){

if(
 categoryFilter.value ===
 "daily"
){
 weatherSet.add(
  data.weather
 );
 continue;
}

   if(
    data.area !==
    areaFilter.value
   ){
    continue;
   }

   weatherSet.add(
    data.weather
   );

  }

  for(
   const weather of weatherSet
  ){

   const option =
   document.createElement(
    "option"
   );

   option.value =
   weather;

   option.textContent =
   weather;

   weatherFilter.appendChild(
    option
   );

  }

weatherFilter.value = "晴れ"

weatherFilter.dispatchEvent(
 new Event("change")
);

 }

);

const speciesFilter =
document.getElementById(
 "speciesFilter"
);

weatherFilter.addEventListener(
 "change",
 function(){

const version =
 document.querySelector(
  'input[name="version"]:checked'
 ).value;

const wildTable =
categoryFilter.value === "grass"
? (
 version === "Sword"
 ? WILD_SW
 : WILD_SH
 )
: (
 version === "Sword"
 ? WILD_SYMBOL_SW
 : WILD_SYMBOL_SH
 );

  const data =
  wildTable.find(
   x =>
   x.area === areaFilter.value &&
   x.weather === weatherFilter.value
  );

  if(!data){
   speciesFilter.value = "";
   return;
  }

  document.getElementById(
 "lvMin"
).value =
 data.minLv;

document.getElementById(
 "lvMax"
).value =
 data.maxLv;

speciesFilter.innerHTML =
'<option value="">-</option>';

for(
 const slot of data.slots
){

 const option =
 document.createElement(
  "option"
 );

 option.value =
 slot.species;

 option.textContent =
 slot.species;

 speciesFilter.appendChild(
  option
 );

}

const savedSpecies =
 sessionStorage.getItem(
  "speciesFilter"
 );

 console.log(
 "復元する種族:",
 savedSpecies
);

if(savedSpecies){

 speciesFilter.value =
  savedSpecies;

}

 }

);

categoryFilter.addEventListener(
 "change",
 function(){

  console.log(

  "category changed",

  categoryFilter.value

 );

 areaFilter.disabled =

 categoryFilter.value ===

 "daily";

  areaFilter.disabled =
   categoryFilter.value ===
   "daily";

   speciesFilter.disabled =
   false;

const oldArea =
 areaFilter.value;

   areaFilter.innerHTML = "";

const version =
 document.querySelector(
  'input[name="version"]:checked'
 ).value;

const targetArea =
 oldArea
  .replace("(水上)", "")
  .replace("(空中)", "")
  .replace("(遠海)", "")
  .replace("(海)","")
  .replace("(川)", "")
  .replace("(水辺)", "")
  .replace("(砂場)", "")
  .replace("(崖と岩の間の砂地)", "")
  .replace("(湖に隣接してる草むら)", "")
  .replace("(湖を向いて左手方向に進んだ先の草むら)", "")
  .replace("(巨人の帽子に近い草むら)", "")
  .replace("(ストーンズ原野付近の砂地)", "")
  .replace("(砂塵の窪地に隣接している砂地)", "")
  .replace("(枯れ草)", "")
  .replace("(こもれび林に近い草むら)", "")
  .replace("(中央付近の砂地)", "")
  .replace("(橋の近くの草むら)", "")
  .replace("(ガラル鉱山に近い草むら)", "");

const areaSet =
 new Set();

const wildTable =
 categoryFilter.value === "grass"
 ? (
    version === "Sword"
    ? WILD_SW
    : WILD_SH
   )
 : (
    version === "Sword"
    ? WILD_SYMBOL_SW
    : WILD_SYMBOL_SH
   );

for(
 const data of wildTable
){

 areaSet.add(
  data.area
 );

}

for(
 const area of areaSet
){

 const option =
  document.createElement(
   "option"
  );

 option.value =
  area;

 option.textContent =
  area;

 areaFilter.appendChild(
  option
 );

}

if(
 areaSet.has(
  targetArea
 )
){

 areaFilter.value =
  targetArea;

}
else if(
 areaFilter.options.length > 0
){

 areaFilter.selectedIndex =
  0;

}

areaFilter.dispatchEvent(
 new Event("change")
);

 }
);

categoryFilter.dispatchEvent(
new Event("change")
);

function getSlotSpecies(
 slots,
 slot
){

 for(
  let i = 1;
  i < slots.length;
  i++
 ){

  if(
   slot < slots[i].per
  ){
   return slots[i - 1].species;
  }

 }

 return slots[
  slots.length - 1
 ].species;

}

function generateRandomSymbolPokemon(
 rng,
 frame,
 shinyCharm,
 markCharm,
 tsv
){

const HELD_ITEM_SPECIES = [
 "ホシガリス"
];

const workRng =
 new Xoroshiro128p(
  rng.s0,
  rng.s1
 );

let totalConsume = 0;

 //slot固定
workRng.getRandMax(
 0xFFFFFFFF
);

workRng.getRandMax(100);

workRng.getRandMax(100);


const area =
document.getElementById(
 "areaFilter"
).value;

const weather =
document.getElementById(
 "weatherFilter"
).value;

const version =
 document.querySelector(
  'input[name="version"]:checked'
 ).value;

const wildTable =
categoryFilter.value === "grass"
? (
 version === "Sword"
 ? WILD_SW
 : WILD_SH
 )
: (
 version === "Sword"
 ? WILD_SYMBOL_SW
 : WILD_SYMBOL_SH
 );

const wildData =
wildTable.find(
 x =>
 x.area === area &&
 x.weather === weather
);

console.log(version);
console.log(wildData);

let species = "";

let slot = 0;

let level = 0;

slot =
 Number(
  workRng.getRandMax(100)
 );

 console.log(
 "frame",
 frame,
 "slot",
 slot
);

species =
 getSlotSpecies(
  wildData.slots,
  slot
 );

level =
 wildData.minLv +
 Number(
  workRng.getRandMax(
   wildData.maxLv -
   wildData.minLv +
   1
  )
 );

console.log(
 "frame",
 frame,
 "level",
 level
)

//let slot = 0;

//if(
  //category === "daily"
//){
  //slot = 0;
//}

//   rng.getRandMax(0xFFFFFFFF);

//rng.getRandMax(100);

//rng.getRandMax(100);

//const slot =
 //Number(
  //rng.getRandMax(100)
 //);

   const mark = 
 genMark( 
  workRng,
  weather,
  false);

  workRng.getRandMax(1000);

  //workRng.getRand();

const shinyRolls =
 shinyCharm ? 3 : 1;

 let shiny = false;

for(let i=0;i<shinyRolls;i++){

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
   
   if(
 HELD_ITEM_SPECIES.includes(
  species
 )
){
 workRng.getRandMax(100);
}

const rawRand = workRng.getRand();

console.log(
 "frame",
 frame,
 "rawRand",
 rawRand.toString(16)
);

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

 const shinyMarkData = "";

 return {
  frame,
  slot,
  category: 
  document.getElementById(
    "categoryFilter"
  ).value,
  nature,
  ability,

  area:
  document.getElementById(
  "areaFilter"
  ).value,

  weather:
  document.getElementById(
  "weatherFilter"
  ).value,

 species,

 level,
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
genderRoll,
ability,
localSeed,
  mark
 };

}

document
 .querySelectorAll(
  'input[name="version"]'
 )
 .forEach(radio => {

  radio.addEventListener(
   "change",
   function(){

    weatherFilter.dispatchEvent(
     new Event("change")
    );

   }
  );

   });

