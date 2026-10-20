# DeepDex

App personal de deep work para macOS con temática Pokémon. Inicias una sesión de foco con temporizador; mientras dura, las apps y webs de tu lista negra quedan bloqueadas. Cada sesión completada incuba un huevo que eclosiona en un Pokémon de las generaciones 1 a 5 (649 especies, de Kanto a Teselia), y tus horas acumuladas suben tu nivel de entrenador, tu racha y tus medallas. La pestaña HORAS muestra tus estadísticas de foco por día, semana, mes y tema.

El diseño completo está en [PRD.md](PRD.md).

## Empezar a usarla

Necesitas un Mac con [Node.js](https://nodejs.org) 18 o superior (instala la versión LTS).

```bash
git clone https://github.com/adoviguerav/deepdex.git
cd deepdex
npm install
npm run dist
```

Eso genera `dist/DeepDex-<versión>.dmg`. Ábrelo y arrastra DeepDex a Aplicaciones. Como la app no está firmada, la primera vez ábrela con clic derecho → Abrir → Abrir.

Si solo quieres probarla sin instalar, `npm run dev` la arranca directamente.

### Primera sesión

1. En **Ajustes**, revisa las apps y webs que quieres bloquear. Los nombres de apps deben coincidir con el de la app tal como aparece en el Dock (por ejemplo `WhatsApp`).
2. En **Inicio**, elige un tema (o créalo con «+ NUEVO»), la duración y pulsa **EMPEZAR FOCO**. Debajo del botón ves qué se va a cerrar.
3. macOS te pedirá dos cosas la primera vez:
   - **Permiso de Automatización** para que DeepDex controle «System Events». Acéptalo: sin él no puede cerrar apps (la pantalla de sesión te avisa si falta). Si lo denegaste, actívalo en Ajustes del Sistema → Privacidad y seguridad → Automatización → DeepDex.
   - **Tu contraseña de administrador** para bloquear las webs. Se pide al empezar y al terminar cada sesión. Si la cancelas al empezar, la sesión sigue solo con apps bloqueadas y puedes reintentarlo con «BLOQUEAR WEBS AHORA». Si la cancelas al terminar, Inicio te ofrece desbloquear las webs.
4. Puedes cerrar la ventana durante la sesión: el tiempo restante sigue en la barra de menús y al terminar recibes una notificación con el Pokémon que ha nacido.

## Desarrollo

```bash
npm install
npm run dev        # arranca Electron con recarga en caliente
npm run typecheck  # comprobación de tipos (main + renderer)
npm test           # tests de lógica (rachas, eclosiones, estadísticas, dominios)
npm run build      # build de producción en out/
npm run dist       # DMG para macOS en dist/
```

## Cómo funciona el bloqueo

- **Apps**: cada 2 segundos se listan las apps abiertas; las de la lista negra reciben la orden de cerrarse y, si siguen abiertas 6 segundos después, se fuerzan a cerrar. Guarda tu trabajo en ellas antes de empezar.
- **Webs**: se añade una sección marcada `#DEEPDEX-BLOCK-*` a `/etc/hosts` que apunta cada dominio y sus variantes (`www.`, `m.`, `mobile.` y subdominios conocidos como `old.reddit.com` o `music.youtube.com`) a tu propio ordenador, y se vacía la caché DNS. Las operaciones sobre `/etc/hosts` van en cola, así que nunca se pisan. Las pestañas ya cargadas siguen abiertas hasta que las recargas.
- **Salir de la app** durante una sesión no la aborta: DeepDex te manda a la salida de emergencia. Solo al apagar o cerrar sesión en el Mac la sesión cuenta como abortada.

## Emergencia

Abortar una sesión exige escribir «necesito salir de verdad», confirmar y aguantar una cuenta atrás de 30 segundos que aún puedes cancelar. Pierdes el huevo y la XP de esa sesión, y el aborto cuenta en tus estadísticas.

## Datos

Todo es local: `~/Library/Application Support/deepdex/deepdex-data.json` (XP, capturas, medallas, rachas, temas, historial y ajustes). Cada guardado deja una copia del anterior en `deepdex-data.json.bak`; si el fichero principal se corrompe, se aparta como `deepdex-data.corrupt-<fecha>.json` y la app se recupera desde la copia.

Los sprites (649 normales y 649 shiny) y la fuente pixel van dentro de la app, así que funciona sin conexión. Los datos de especies se generan desde PokeAPI en `src/shared/pokedexData.ts`.

Uso personal: los sprites de Pokémon son propiedad de Nintendo/Game Freak; no distribuyas la app.
