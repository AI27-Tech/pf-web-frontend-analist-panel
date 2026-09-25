import { describe, it, expect } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { aErrorDatos, mensajeDeErrorDatos, ErrorDatos } from './errores';
import type { CausaErrorDatos } from './errores';

describe('errores', () => {
  describe('aErrorDatos', () => {
    it('mapea permission-denied a sin-permiso', () => {
      const error = new FirebaseError('permission-denied', 'Permission denied');
      const resultado = aErrorDatos(error);

      expect(resultado).toBeInstanceOf(ErrorDatos);
      expect(resultado.causa).toBe('sin-permiso');
      expect(resultado.original).toBe(error);
    });

    it('mapea failed-precondition a indice-faltante', () => {
      const error = new FirebaseError('failed-precondition', 'Index creation failed');
      const resultado = aErrorDatos(error);

      expect(resultado.causa).toBe('indice-faltante');
    });

    it('mapea unavailable a sin-conexion', () => {
      const error = new FirebaseError('unavailable', 'Service unavailable');
      const resultado = aErrorDatos(error);

      expect(resultado.causa).toBe('sin-conexion');
    });

    it('mapea códigos desconocidos a desconocida', () => {
      const error = new FirebaseError('network-error', 'Network error');
      const resultado = aErrorDatos(error);

      expect(resultado.causa).toBe('desconocida');
    });

    it('convierte un error no-Firebase a desconocida', () => {
      const error = new TypeError('Cannot read property of undefined');
      const resultado = aErrorDatos(error);

      expect(resultado.causa).toBe('desconocida');
      expect(resultado.original).toBe(error);
    });

    it('convierte un error desconocido (no Error) a desconocida', () => {
      const error = 'string error';
      const resultado = aErrorDatos(error);

      expect(resultado.causa).toBe('desconocida');
      expect(resultado.original).toBe(error);
    });
  });

  describe('mensajeDeErrorDatos', () => {
    it('retorna mensaje útil para sin-permiso que menciona config/analistas', () => {
      const mensaje = mensajeDeErrorDatos('sin-permiso');

      expect(mensaje).toContain('config/analistas.correos');
      expect(mensaje).toContain('administrador');
    });

    it('retorna mensaje útil para indice-faltante que menciona pf-infra-firebase', () => {
      const mensaje = mensajeDeErrorDatos('indice-faltante');

      expect(mensaje).toContain('pf-infra-firebase');
    });

    it('retorna mensaje útil para sin-conexion que sugiere reconectar', () => {
      const mensaje = mensajeDeErrorDatos('sin-conexion');

      expect(mensaje).toContain('conexión');
      expect(mensaje).toContain('vuelve a intentar');
    });

    it('retorna mensaje útil para desconocida sin términos técnicos del SDK', () => {
      const mensaje = mensajeDeErrorDatos('desconocida');

      expect(mensaje).not.toContain('FirebaseError');
      expect(mensaje).not.toContain('permission-denied');
      expect(mensaje).toContain('Error desconocido');
    });
  });

  describe('ErrorDatos', () => {
    it('hereda de Error', () => {
      const original = new FirebaseError('permission-denied', 'Denied');
      const error = new ErrorDatos('sin-permiso', original);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ErrorDatos');
    });

    it('el message viene del mensajeDeErrorDatos', () => {
      const error = new ErrorDatos('sin-permiso', new Error('original'));

      expect(error.message).toBe(mensajeDeErrorDatos('sin-permiso'));
    });
  });

  describe('integración', () => {
    it('aErrorDatos + mensajeDeErrorDatos producen mensaje coherente', () => {
      const firebaseError = new FirebaseError('permission-denied', 'Denied');
      const errorDatos = aErrorDatos(firebaseError);
      const mensaje = mensajeDeErrorDatos(errorDatos.causa);

      expect(mensaje).toBeTruthy();
      expect(errorDatos.message).toBe(mensaje);
    });

    it('todas las causas tienen mensaje', () => {
      const causas: CausaErrorDatos[] = [
        'sin-permiso',
        'indice-faltante',
        'sin-conexion',
        'desconocida',
      ];

      causas.forEach((causa) => {
        const mensaje = mensajeDeErrorDatos(causa);
        expect(mensaje).toBeTruthy();
        expect(typeof mensaje).toBe('string');
      });
    });
  });
});
