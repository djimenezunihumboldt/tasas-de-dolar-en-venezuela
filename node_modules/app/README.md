# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
## Build y despliegue

![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)

- Generar build para web (producción):

```
npm run build
```

- Publicar en GitHub Pages (usa `gh-pages`):

```
npm run deploy:gh
```

- Generar APK con Capacitor (resumen):

1. Construye la app web:

```
npm run build
```

2. Sincroniza y copia los assets a Android:

```
npm run android:build-release
```

3. Abre el proyecto Android y genera el APK (Android Studio recomendado):

```
npm run android:open
```

En Android Studio: Build > Generate Signed Bundle / APK... y sigue el asistente para firmar y generar el APK.

Notas:
- `vite.config.ts` ya usa `base: './'` para compatibilidad con GitHub Pages (rutas relativas).
- `capacitor.config.ts` tiene `webDir: 'dist'`, por lo que Capacitor copiará la carpeta `dist` correctamente.
- Si necesitas un workflow CI/CD para generar artefactos (APK) y publicar Pages automáticamente, puedo generarlo.
```
