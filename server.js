import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app=express(), dir=path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({limit:'10mb'}));
app.use(express.static(path.join(dir,'public')));
app.get('/api/status',(_req,res)=>res.json({configured:!!process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-4.1-mini'}));
app.post('/api/chat',async(req,res)=>{
 const key=process.env.OPENAI_API_KEY;
 if(!key)return res.status(503).json({error:'Облачный ИИ не подключён: владелец сайта должен добавить OPENAI_API_KEY в секретные переменные сервера.'});
 const messages=Array.isArray(req.body?.messages)?req.body.messages.slice(-20):[];
 if(!messages.length)return res.status(400).json({error:'Нет сообщений для отправки.'});
 const input=[];
 for(const m of messages){
  if(!['user','assistant'].includes(m?.role))continue;
  const content=[];
  if(typeof m.text==='string'&&m.text.trim())content.push({type:'input_text',text:m.text.slice(0,12000)});
  if(m.role==='user'&&typeof m.image==='string'&&/^data:image\\/(png|jpeg|webp|gif);base64,/.test(m.image))content.push({type:'input_image',image_url:m.image});
  if(content.length)input.push({role:m.role,content});
 }
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:'Ты Giv AI — доброжелательный ИИ-ассистент. Отвечай на языке пользователя. Анализируй приложенные изображения.',input,max_output_tokens:1200})});
  const d=await r.json();
  if(!r.ok)return res.status(r.status>=500?502:r.status).json({error:d?.error?.message||'Ошибка облачного ИИ.'});
  const answer=(d.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\\n').trim();
  if(!answer)return res.status(502).json({error:'ИИ вернул пустой ответ.'});
  res.json({answer,model:process.env.OPENAI_MODEL||'gpt-4.1-mini'});
 }catch(e){console.error(e);res.status(502).json({error:'Не удалось связаться с ИИ-сервисом.'});}
});
app.get('*',(_req,res)=>res.sendFile(path.join(dir,'public','index.html')));
app.listen(process.env.PORT||3000,()=>console.log('Giv AI running'));
