import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src/routeTree.gen.ts', 'docs/mock-web-analist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // En ruteo por archivos cada ruta exporta `Route` y su componente en el mismo
    // archivo: es la forma que exige TanStack Router, no un descuido.
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // LA FRONTERA DE DATOS (docs/PLAN.md §2 y §4).
    //
    // Sólo lib/firebase/ y lib/datos/ conocen el SDK de Firebase. Las pantallas piden
    // `listarViajes(filtros)`, no `getDocs(query(...))`. Es lo que hace que migrar a un
    // BFF en Go el día que la identidad de la plataforma esté lista sea un cambio
    // contenido en una carpeta, en lugar de una reescritura.
    //
    // Sin esta regla, la disciplina se erosiona en la tercera pantalla.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/firebase/**', 'src/lib/datos/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['firebase', 'firebase/*'],
              message:
                'El SDK de Firebase sólo se importa en src/lib/firebase/ y src/lib/datos/. Usa una función de src/lib/datos/ (ver docs/PLAN.md §4).',
            },
          ],
        },
      ],
    },
  },
);
