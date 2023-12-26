import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import SimplePeer from 'simple-peer';
import './App.css'
import audioFile from '../src/audio/ringtone.mp3'

const socket = io('http://localhost:3001');

const App = () => {
  const [me, setMe] = useState('');
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [idToCall, setIdToCall] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // useEffect(() => {
  //   navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
  //     setStream(stream);
  //     if (myVideo.current) {
  //       myVideo.current.srcObject = stream;
  //     }
  //   });

  //   socket.on('me', (id) => {
  //     setMe(id);
  //   });

  //   socket.on('calluser', (data) => {
  //     setReceivingCall(true);
  //     setCaller(data.from);
  //     setName(data.name);
  //     setCallerSignal(data.signal);
  //   });
  // }, []);

  useEffect(() => {
    const getUserMediaAndSetStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(stream);
  
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };
  
    // Set up socket event listeners
    const setupSocketListeners = () => {
      socket.on('me', (id) => {
        setMe(id);
      });
  
      socket.on('calluser', (data) => {
        setReceivingCall(true);
        setCaller(data.from);
        setName(data.name);
        setCallerSignal(data.signal);
      });
    };
  
    getUserMediaAndSetStream();
    setupSocketListeners();
  
    // Clean up the event listeners when the component unmounts
    return () => {
      socket.off('me');
      socket.off('calluser');
    };
  
  }, [socket]); // Dependency on socket to ensure it's in the dependency array
  

  const callUser = (id) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('calluser', {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on('stream', (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: caller });
    });

    peer.on('stream', (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
  };

  const audioRef = useRef(new Audio(audioFile));

useEffect(()=>{
  if(receivingCall && !callAccepted ){
    audioRef.current.play();
  }
  else{
    audioRef.current.pause();
  }
},[receivingCall,callAccepted])

const handlechangeName =(e)=>{
setName(e.target.value)  
}

console.log(name)
  return (
    <div>
      <div className='video_parent'>
        {stream && <video className='my_video' ref={myVideo} autoPlay muted />}
  
        {callAccepted && !callEnded ? <video className='user_video'  ref={userVideo} autoPlay /> : null}
      </div>
      <div>
        <input type='text' onChange={(e)=>{handlechangeName(e)}} />
        <CopyToClipboard text={me}>
          <button>Copy My ID</button>
        </CopyToClipboard>
        <input
          type="text"
          placeholder="Enter ID to call"
          onChange={(e) => setIdToCall(e.target.value)}
        />
        <button onClick={() => callUser(idToCall)}>Call</button>
      </div>
      {receivingCall && !callAccepted && (
        <div>
          <h1>{name} is calling...</h1>
          <button onClick={answerCall}>Answer</button>
        </div>
      )}
      {callAccepted && !callEnded && (
        <div>
          <button onClick={leaveCall}>Hang Up</button>
        </div>
      )}
    </div>
  );
};

export default App;
