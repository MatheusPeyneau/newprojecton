import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    axios
      .post(`${API}/auth/google/callback`, { session_id: sessionId })
      .then((res) => {
        const { token, user } = res.data;
        login(token, user);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, [login, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  );
}
