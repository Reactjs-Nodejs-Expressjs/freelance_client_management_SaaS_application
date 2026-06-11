import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getToken, BACKEND_URL } from "@/lib/api";

const SOCKET_URL = BACKEND_URL;

let socketInstance: Socket | null = null;

export function useSocket(userId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token: getToken() },
        transports: ["websocket"],
      });
    }

    socketRef.current = socketInstance;
    const socket = socketRef.current;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("register", userId);
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("online_users", (users: string[]) => {
      setOnlineUsers(users);
    });

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("register", userId);
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("online_users");
    };
  }, [userId]);

  const sendTyping = useCallback((recipientId: string, isTyping: boolean) => {
    socketRef.current?.emit("typing", { recipientId, isTyping });
  }, []);

  return { socket: socketRef.current, isConnected, onlineUsers, sendTyping };
}
