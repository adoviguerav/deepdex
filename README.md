# DeepDex

App personal de deep work para macOS con temática Pokémon. Inicias una sesión de foco con temporizador; mientras dura, las apps y webs de tu lista negra quedan bloqueadas. Cada sesión completada incuba un huevo que eclosiona en un Pokémon de las generaciones 1 a 5 (649 especies, de Kanto a Teselia), y tus horas acumuladas suben tu nivel de entrenador, tu racha y tus medallas. La pestaña HORAS muestra tus estadísticas de foco por día, semana, mes y tema.

El diseño completo está en [PRD.md](PRD.md).

## Instalar

No hace falta git ni Node: cada versión se compila sola en GitHub.

1. Abre la página de [versiones (Releases)](https://github.com/adoviguerav/deepdex/releases). El repositorio es privado: si el navegador tiene abierta otra cuenta de GitHub (la del trabajo), ábrela en una ventana privada y entra con la tuya.
2. Descarga `DeepDex-<versión>-arm64.dmg` si tu Mac tiene chip Apple (M1, M2, M3, M4) o `DeepDex-<versión>-x64.dmg` si es Intel. Lo ves en  → Acerca de este Mac.
3. Abre el `.dmg` y arrastra DeepDex a Aplicaciones.
4. La primera vez macOS dirá que no puede verificar al desarrollador (la app no está firmada con una cuenta de Apple). Ábrela una vez, cierra ese aviso y ve a Ajustes del Sistema → Privacidad y seguridad → «Abrir igualmente». Si prefieres Terminal: `xattr -dr com.apple.quarantine /Applications/DeepDex.app`.

Para actualizar, descarga el `.dmg` nuevo y reemplaza la app. Tu progreso no se toca: vive en `~/Library/Application Support/deepdex/`.

## Llevar el progreso a otro Mac

No hay cuentas ni servidores: el progreso viaja en un archivo.

1. En el Mac donde has avanzado: **Ajustes → Mover progreso → Exportar progreso**. Guarda `deepdex-progreso-<fecha>.json`.
2. Pásalo al otro Mac como quieras: AirDrop, correo a ti mismo, USB.
3. En el otro Mac: **Ajustes → Mover progreso → Importar y juntar** y elige el archivo.

Se juntan los dos progresos, no se sustituyen: cada sesión lleva un identificador y los totales (horas, XP, Pokédex, racha, medallas) se recalculan a partir del historial unido. Puedes importar en los dos sentidos y repetir con el mismo archivo sin duplicar nada. Los temas borrados siguen borrados, y para los ajustes y el compañero gana el cambio más reciente.

También se puede importar directamente `deepdex-data.json` copiado de otro Mac.

Si importas un archivo equivocado, pulsa «Deshacer» justo después. Además, antes de cada importación se guarda una copia completa en `~/Library/Application Support/deepdex/deepdex-data.pre-import-<fecha>.json` (se conservan las 5 últimas): para volver a una, cierra DeepDex y renómbrala a `deepdex-data.json`. El archivo importado se revisa campo a campo y lo que no sea válido (fechas imposibles, Pokémon que no existen, ajustes rotos) se descarta, así que un archivo dañado no puede estropear tu progreso.

## Primera sesión

1. En **Ajustes**, revisa las apps y webs que quieres bloquear. Los nombres de apps deben coincidir con el de la app tal como aparece en el Dock (por ejemplo `WhatsApp`).
2. En **Inicio**, elige un tema (o créalo con «+ Nuevo»), la duración y pulsa **Empezar sesión**. Debajo del botón ves qué se va a cerrar.
3. macOS te pedirá dos cosas la primera vez:
   - **Permiso de Automatización** para que DeepDex controle «System Events». Acéptalo: sin él no puede cerrar apps (la pantalla de sesión te avisa si falta). Si lo denegaste, actívalo en Ajustes del Sistema → Privacidad y seguridad → Automatización → DeepDex.
   - **Tu contraseña de administrador** para bloquear las webs. Se pide al empezar y al terminar cada sesión. Si la cancelas al empezar, la sesión sigue solo con apps bloqueadas y puedes reintentarlo con «BLOQUEAR WEBS AHORA». Si la cancelas al terminar, Inicio te ofrece desbloquear las webs.
4. Puedes cerrar la ventana durante la sesión: el tiempo restante sigue en la barra de menús y al terminar recibes una notificación con el Pokémon que ha nacido.

## Desarrollo

```bash
npm install
npm run dev        # arranca Electron con recarga en caliente
npm run typecheck  # comprobación de tipos (main + renderer)
npm test           # tests de lógica (rachas, eclosiones, estadísticas, dominios, fusión de progresos)
npm run build      # build de producción en out/
npm run dist       # DMG para macOS en dist/ (solo en un Mac)
```

Para publicar una versión: sube `version` en `package.json`, haz commit y lanza el workflow «Build macOS app» desde la pestaña Actions de GitHub (o empuja una etiqueta `vX.Y.Z`). El workflow `.github/workflows/release.yml` compila los dos `.dmg` en un Mac de GitHub, los firma ad hoc y los publica en Releases.

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
