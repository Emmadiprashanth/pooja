import { saveEmail } from '@/db/waitlist';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Invalid origin'}, {status:403});
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({error:'Invalid content'}, {status:415});
  const body=await request.text();
  if(body.length>1024) return Response.json({error:'Request too large'}, {status:413});
  let data;
  try { data=JSON.parse(body); } catch {return Response.json({error:'Invalid request'}, {status:400});}
  const email=typeof data?.email==='string'?data.email.trim().toLowerCase():'';
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({error:'Enter a valid email'}, {status:400});
  try { await saveEmail(email); return Response.json({ok:true}); }
  catch { return Response.json({error:'Please try again later'}, {status:503}); }
}
