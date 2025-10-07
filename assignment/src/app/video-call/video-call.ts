import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import Peer, { MediaConnection } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-call.html',
  styleUrls: ['./video-call.css']
})
export class VideoCall implements AfterViewInit, OnDestroy {
  @ViewChild('localVideoEl') localVideoEl!: ElementRef<HTMLVideoElement>;

  private peer!: Peer;
  private peerId: string;
  public localStream: MediaStream | null = null;
  private socket!: Socket;

  public isInCall = false;
  public remoteStreams: Map<string, MediaStream> = new Map();
  private connections: Map<string, MediaConnection> = new Map();

  constructor(private zone: NgZone) {
    this.peerId = uuidv4();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeunloadHandler(event: Event) {
    this.leaveCall();
  }

  get remoteStreamsArray(): MediaStream[] {
    return Array.from(this.remoteStreams.values());
  }

  ngAfterViewInit(): void {
   //initialise socket ad peer
    this.initSocket();
    this.initPeer();
  }

  private initSocket(): void {
    this.socket = io('http://localhost:3000', {
      path: "/socket.io"
    });
    this.socket.on('connect', () => {
      console.log('Successfully connected to socket server with ID:', this.socket.id);
    });

    this.socket.on('existing-peers', (peerIds: string[]) => {
      console.log('Received list of existing peers:', peerIds);
      peerIds.forEach(peerId => {
        console.log(`Calling existing peer: ${peerId}`);
        this.callPeer(peerId);
      });
    });
    this.socket.on('peer-left', (peerId: string) => {
      console.log(`Peer has left: ${peerId}`);
      this.cleanupPeerConnection(peerId);
    });
  }

  // handles incoming clals
  private initPeer(): void {
    this.peer = new Peer(this.peerId, {
      host: 'localhost',
      port: 3001,
      path: '/peerjs'
    });

    this.peer.on('open', (id) => {
      console.log('My PeerJS ID is:', id);
    });

    // handle incoming call from other peer
    this.peer.on('call', (call) => {
      console.log(`Answering incoming call from ${call.peer}`);
      if (!this.localStream) {
        return;
      }
      
      call.answer(this.localStream);

      call.on('stream', (remoteStream) => {
      this.zone.run(() => {
        console.log(`Received remote stream from ${call.peer}`);
        this.addRemoteStream(call.peer, remoteStream);
      });
    });

      call.on('close', () => {
        this.cleanupPeerConnection(call.peer);
      });

      this.connections.set(call.peer, call);
    });
  }

  public async joinCall(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.isInCall = true;

  

      this.socket.emit('join-video-call', this.peerId);

    } catch (err) {
      console.error('Failed to get local stream', err);
      alert('Could not start video. Please check permissions.');
    }
  }

  private callPeer(peerIdToCall: string): void {
    if (!this.localStream) {
      return;
    }

    console.log(`Calling peer: ${peerIdToCall}`);
    const call = this.peer.call(peerIdToCall, this.localStream);

    call.on('stream', (remoteStream) => {
    this.zone.run(() => {
      console.log(`Received remote stream from ${call.peer} after calling them.`);
      this.addRemoteStream(call.peer, remoteStream);
    });
  });
    call.on('close', () => {
      this.cleanupPeerConnection(call.peer);
    });
    
    this.connections.set(peerIdToCall, call);
  }

  private addRemoteStream(peerId: string, stream: MediaStream): void {
    if (!this.remoteStreams.has(peerId)) {
        this.remoteStreams.set(peerId, stream);
    }
  }

  private cleanupPeerConnection(peerId: string): void {
    if (this.connections.has(peerId)) {
      this.connections.get(peerId)?.close();
      this.connections.delete(peerId);
    }
    if (this.remoteStreams.has(peerId)) {
      this.remoteStreams.delete(peerId);
    }
  }

  public leaveCall(): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-video-call');
    }

    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;
    this.isInCall = false;

    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    this.remoteStreams.clear();
  }

  ngOnDestroy(): void {
    this.leaveCall();
    this.socket?.disconnect(); 
    this.peer?.destroy();
  }
}