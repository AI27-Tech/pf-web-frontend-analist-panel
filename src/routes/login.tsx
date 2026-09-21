import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { esperarSesion, iniciarSesion } from '@/lib/datos/sesion';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await esperarSesion()) throw redirect({ to: '/viajes' });
  },
  component: Login,
});

function Login() {
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEntrando(true);
    setError(null);
    const resultado = await iniciarSesion(correo, contrasena);
    setEntrando(false);
    if (resultado.ok) navegar({ to: '/viajes' });
    else setError(resultado.mensaje);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={enviar}
        className="bg-surface border-border w-full max-w-sm rounded border p-8"
      >
        <p className="text-text text-2xl font-semibold tracking-tight">AI27</p>
        <p className="text-text-muted mt-1 mb-8 text-sm">Panel del analista</p>

        <label className="text-text-muted mb-1 block text-xs font-medium">Correo</label>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          autoComplete="username"
          className="bg-canvas border-border text-text focus:border-accent mb-4 h-12 w-full rounded border px-3 outline-none"
        />

        <label className="text-text-muted mb-1 block text-xs font-medium">Contraseña</label>
        <input
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete="current-password"
          className="bg-canvas border-border text-text focus:border-accent mb-6 h-12 w-full rounded border px-3 outline-none"
        />

        {error && <p className="text-danger mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={entrando || !correo || !contrasena}
          className="bg-accent text-on-accent h-12 w-full rounded font-semibold disabled:opacity-40"
        >
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
