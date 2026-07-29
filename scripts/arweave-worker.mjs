const appUrl=process.env.APP_BASE_URL?.replace(/\/+$/,"");
const secret=process.env.IMPORT_WORKER_SECRET?.trim();
if(!appUrl||!secret)throw new Error("APP_BASE_URL and IMPORT_WORKER_SECRET are required.");
let stopping=false;
process.on("SIGTERM",()=>{stopping=true;});
process.on("SIGINT",()=>{stopping=true;});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
while(!stopping){
  try{
    const response=await fetch(appUrl+"/api/internal/arweave-worker",{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:"{}"});
    if(!response.ok)console.error("Arweave worker request failed:",response.status,await response.text());
    const result=response.ok?await response.json():null;
    await wait(result?.busy?3000:5000);
  }catch(error){console.error("Arweave worker connection failed:",error);await wait(10000);}
}
