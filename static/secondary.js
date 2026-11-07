const params=new URLSearchParams(location.search),iid=params.get('session'),token=params.get('token');
const status=document.querySelector('#status'),preview=document.querySelector('#preview'),connect=document.querySelector('#connect'),disconnect=document.querySelector('#disconnect');
let camera=null,peer=null,ws=null;
function update(s){status.textContent=s;}
async function start(){if(!iid||!token){update('This invitation link is incomplete.');return;}
 connect.disabled=true;update('Requesting camera permission…');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera requires an HTTPS connection on your phone.');
  camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:720}},audio:false});preview.srcObject=camera;await preview.play();
  const proto=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(`${proto}//${location.host}/ws/rooms/${encodeURIComponent(iid)}/secondary?token=${encodeURIComponent(token)}`);
  ws.onopen=()=>{update('Connected to session. Waiting for the interview room…');disconnect.disabled=false;};
  ws.onmessage=async e=>{let data;try{data=JSON.parse(e.data);}catch{return;}
   if(data.type==='peer-ready')await sendOffer();
   if(data.type==='answer'&&peer){await peer.setRemoteDescription(data.answer);update('Second camera is streaming to your interview room.');}
   if(data.type==='ice'&&peer){try{await peer.addIceCandidate(data.candidate);}catch{}}
   if(data.type==='peer-left'){peer?.close();peer=null;update('Interview room disconnected. Camera stays on until you disconnect.');}
  };
  ws.onerror=()=>update('Signaling connection failed. Confirm the invitation is valid.');
  ws.onclose=()=>{if(camera)update('Connection closed. Disconnect to stop your camera.');};
 }catch(e){update('Could not connect: '+e.message);stop();}}
function makePeer(){if(peer)peer.close();peer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});for(const track of camera.getTracks())peer.addTrack(track,camera);
 peer.onicecandidate=e=>{if(e.candidate&&ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'ice',candidate:e.candidate}));};
 peer.onconnectionstatechange=()=>{if(peer?.connectionState==='connected')update('Second camera is streaming securely (WebRTC peer connection).');};return peer;}
async function sendOffer(){if(!camera||ws?.readyState!==WebSocket.OPEN)return;const pc=makePeer(),offer=await pc.createOffer();await pc.setLocalDescription(offer);ws.send(JSON.stringify({type:'offer',offer}));}
function stop(){if(peer){peer.close();peer=null;}if(ws){ws.close();ws=null;}if(camera){camera.getTracks().forEach(t=>t.stop());camera=null;}preview.srcObject=null;disconnect.disabled=true;connect.disabled=false;}
connect.addEventListener('click',start);disconnect.addEventListener('click',()=>{stop();update('Camera disconnected and sharing stopped.');});
window.addEventListener('beforeunload',stop);
