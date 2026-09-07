# DeepDex

App personal de deep work para macOS con temática Pokémon. Inicias una sesión de foco con temporizador; mientras dura, las apps y webs de tu lista negra quedan bloqueadas. Cada sesión completada incuba un huevo que eclosiona en un Pokémon de la 1ª generación, y tus horas acumuladas suben tu nivel de entrenador, tu racha y tus medallas.

El diseño completo está en [PRD.md](PRD.md).

## Requisitos

- macOS (el bloqueo usa AppleScript y `/etc/hosts`; en otros sistemas la app funciona solo como temporizador).
- Node.js 18+.

## Desarrollo

```bash
npm install
npm run dev        # arranca Electron con recarga en caliente
npm run typecheck  # comprobación de tipos (main + renderer)
npm run build      # build de producción en out/
```

## Instalación en tu Mac

```bash
npm run dist
```

Genera `dist/DeepDex-<versión>.dmg` (sin firmar: la primera vez ábrela con clic derecho → Abrir). Arrastra DeepDex a Aplicaciones.

## Permisos que pedirá macOS

- **Automatización / Accesibilidad**: para ver qué apps están abiertas y cerrarlas durante una sesión (System Events). macOS lo pregunta la primera vez.
- **Contraseña de administrador**: al iniciar y terminar cada sesión, para escribir y retirar el bloqueo de webs en `/etc/hosts`. Si cancelas el diálogo, la sesión sigue pero solo se bloquean apps (la pantalla de sesión lo indica).

## Cómo funciona el bloqueo

- **Apps**: cada 2 segundos se listan los procesos visibles; los de la lista negra reciben un quit inmediato (y un kill duro si se resisten). Cerrar DeepDex en mitad de una sesión cuenta como aborto.
- **Webs**: se añade una sección marcada `#DEEPDEX-BLOCK-*` a `/etc/hosts` apuntando los dominios (y sus `www.`) a `127.0.0.1`, con flush de DNS. Al terminar se retira; si la app muere en mitad de una sesión, el bloque huérfano se limpia en el siguiente arranque. Las pestañas ya cargadas sobreviven hasta que se recargan.

## Emergencia

Abortar una sesión exige escribir «necesito salir de verdad», confirmar y aguantar una cuenta atrás de 30 segundos aún cancelable. Pierdes el huevo y la XP de esa sesión, y el aborto queda en tus estadísticas.

## Datos

Todo es local: `~/Library/Application Support/deepdex/deepdex-data.json` (XP, capturas, medallas, rachas y ajustes). Los sprites cargan del repositorio de PokeAPI en GitHub; sin conexión se muestra un placeholder.

Uso personal: los sprites de Pokémon son propiedad de Nintendo/Game Freak; no distribuyas la app.
