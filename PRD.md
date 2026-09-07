# PRD — DeepDex

Fecha: 2026-09-07
Estado: aprobado en conversación; en ejecución por fases.
Usuario: Adolfo, uso personal en su Mac.
Nota de repositorio: DeepDex vive en `deepdex/` y es independiente de CalVoice (el PRD raíz de este repo pertenece al proyecto de nutrición y no se toca).

## 1. Problema y resultado esperado

Adolfo quiere hacer deep work sin escaparse a WhatsApp, Twitter o Instagram, ni por aplicación ni por navegador. Las apps de bloqueo existentes le resultan frías; quiere una que le motive de verdad, con temática Pokémon, donde cada hora de foco acumulada construya algo: un historial total de horas, capturas, niveles y logros.

Resultado esperado: una app de escritorio para macOS donde inicia una sesión de foco con temporizador, durante la cual las apps y webs de su lista negra quedan bloqueadas de forma estricta, y al completarla gana recompensas Pokémon persistentes.

## 2. Decisiones tomadas (conversación 2026-09-07)

| ID | Decisión | Elección |
|---|---|---|
| D1 | Stack | Electron + React + TypeScript (electron-vite). UI web con estética retro Game Boy/Pokémon. |
| D2 | Estrictez | Estricta con emergencia: las apps bloqueadas se cierran al instante; abortar exige escribir una frase, esperar 30 segundos y pierde todo el progreso de la sesión (huevo y XP incluidos). |
| D3 | Gamificación | Entrenador completo: huevo por sesión que eclosiona en un Pokémon (mejor cuanto más larga la sesión), XP de entrenador por minuto de foco, niveles, Pokédex de capturas, rachas diarias y medallas de gimnasio como logros. |
| D4 | Alcance de bloqueo MVP | Apps de macOS + webs en cualquier navegador vía `/etc/hosts` (pide contraseña de admin al iniciar/terminar sesión). |
| D5 | Datos | Local, JSON en el directorio de usuario de la app. Sin cuentas ni sync. |
| D6 | Sprites | Dataset embebido de la 1ª generación (151 Pokémon) con sprites oficiales servidos desde el repositorio de PokeAPI en GitHub. |

## 3. Funcionamiento

### Sesiones de foco
- Duraciones: 25, 50, 90 minutos o personalizada (10–240).
- El temporizador vive en el proceso principal de Electron: sobrevive a recargas de la ventana y se muestra también en la barra de menús.
- Completar la sesión = huevo eclosiona + XP (1 XP por minuto de foco) + avanza la racha del día.
- Cerrar la app durante una sesión cuenta como aborto (la sesión no se puede esquivar matando DeepDex: al reabrir, la sesión consta como perdida).

### Bloqueo (durante la sesión, y solo durante ella)
- **Apps**: sondeo cada 2 segundos de los procesos visibles de macOS; cualquier app de la lista negra recibe orden de cierre (quit vía AppleScript, `kill` como respaldo). Contador de intentos bloqueados visible en la pantalla de sesión.
- **Webs**: al iniciar la sesión se añade un bloque marcado a `/etc/hosts` redirigiendo los dominios de la lista negra (y `www.`) a `127.0.0.1`, con flush de DNS; al terminar o abortar, se retira. Requiere autorización de admin (diálogo estándar de macOS vía AppleScript). Si al arrancar la app queda un bloque huérfano de una sesión anterior (crash), se limpia.
- Listas por defecto editables en Ajustes: WhatsApp (app y web.whatsapp.com), X/Twitter, Instagram, YouTube, Reddit, TikTok, Facebook.

### Emergencia (D2)
- Botón «Emergencia» en la pantalla de sesión → escribir la frase «necesito salir de verdad» → cuenta atrás de 30 segundos aún cancelable → la sesión se aborta: se retiran los bloqueos, el huevo se pierde y no se otorga XP. El aborto queda registrado en las estadísticas.

### Gamificación (D3)
- **Huevos**: al iniciar una sesión se asigna un huevo cuya calidad depende de la duración: <45 min → común; 45–79 → raro; ≥80 → superraro. La calidad define las probabilidades de rareza del Pokémon al eclosionar (común / infrecuente / raro / legendario, con legendarios solo posibles en huevos superraros). ~1/64 de probabilidad de shiny, duplicada con racha ≥7 días.
- **XP y nivel de entrenador**: 1 XP por minuto completado. Nivel n requiere `100 × n^1.5` XP acumulada (redondeado). El nivel solo sube, nunca baja.
- **Pokédex**: los 151 de la 1ª generación; los no capturados se muestran en silueta. Repetidos cuentan (contador por especie).
- **Rachas**: días consecutivos con al menos una sesión completada.
- **Medallas** (8, estilo gimnasio): primera sesión, 10 h totales, 50 h, 100 h, 250 h, racha de 7 días, racha de 30 días, 50 especies distintas.

### Pantallas
1. **Inicio**: saludo de entrenador, selector de duración, racha, huevo que tocaría, acceso al resto.
2. **Sesión**: temporizador grande, huevo animado, contador de bloqueos, botón de emergencia.
3. **Eclosión**: animación de revelado al completar.
4. **Pokédex**: rejilla 151 con siluetas/capturas.
5. **Entrenador**: nivel, barra de XP, medallas, horas totales, sesiones, abortos, racha máxima.
6. **Ajustes**: listas negras de apps y dominios, duración personalizada.

## 4. Arquitectura

```
deepdex/
├── package.json
├── electron.vite.config.ts
├── src/
│   ├── main/            # proceso principal (Node)
│   │   ├── index.ts     # ventana, ciclo de vida, tray
│   │   ├── store.ts     # persistencia JSON (userData/deepdex-data.json)
│   │   ├── session.ts   # máquina de estados de la sesión + timer
│   │   ├── appBlocker.ts    # sondeo y cierre de apps (osascript/pkill)
│   │   ├── hostsBlocker.ts  # edición de /etc/hosts con privilegios
│   │   └── ipc.ts       # canales IPC
│   ├── preload/index.ts # bridge seguro (contextIsolation)
│   ├── renderer/        # React + Vite
│   │   ├── src/App.tsx, screens/, components/, styles/
│   └── shared/          # tipos y datos comunes
│       ├── types.ts
│       └── pokedex.ts   # dataset 151 + rarezas + probabilidades
```

- IPC tipado: renderer solo habla con main a través del preload (`window.deepdex`).
- El estado de juego (XP, capturas, medallas, rachas, sesiones) se calcula y persiste en main; el renderer es presentación.
- El bloqueo es macOS-only; en otras plataformas la app funciona como temporizador sin bloqueo (permite desarrollar fuera de Mac).

## 5. Fases de ejecución

- **Fase 1 — Núcleo**: scaffold electron-vite, tipos compartidos, store JSON, máquina de sesión con timer en main, IPC, pantallas Inicio/Sesión con estética retro. Criterio: arranca, se puede completar y abortar (sin fricción aún) una sesión, y las horas persisten.
- **Fase 2 — Bloqueo**: appBlocker + hostsBlocker + flujo de emergencia completo (frase + 30 s + pérdida de recompensas) + limpieza de bloques huérfanos + Ajustes de listas. Criterio: durante una sesión en macOS las apps listadas se cierran y los dominios no resuelven; al terminar todo vuelve.
- **Fase 3 — Gamificación**: dataset 151, huevos y eclosión con animación, XP/niveles, Pokédex, medallas, rachas. Criterio: completar sesiones otorga capturas visibles en el Pokédex y el nivel progresa.
- **Fase 4 — Pulido y empaquetado**: icono en barra de menús con tiempo restante, pantalla Entrenador con estadísticas, sonidos/animaciones, configuración electron-builder para generar el DMG (`npm run dist`). Criterio: `npm run build` limpio y instrucciones de instalación en README.

Cada fase se commitea por separado en `claude/deep-work-pokemon-app-v2240d`.

## 5b. Fase 5 — Temas y coherencia (añadida 2026-09-07)

Peticiones del usuario tras la v1: contar horas por tarea/tema con salida a fichero, e investigar mejoras de gamificación y UX.

**Investigación**: se revisaron apps comparables (Focumon, FocusMon, Forest, Focus Plant, Time Farm) y análisis de mecánicas de hábito. Dos conclusiones aplicadas: los mecanismos de recuperación de racha triplican la retención del hábito frente a las rachas que se pierden enteras, y una mecánica bien elegida rinde más que muchas superpuestas.

**Implementado:**

| Qué | Cómo |
|---|---|
| Temas | Se crean desde Inicio (nombre + tipo Pokémon afín). Cada sesión se etiqueta con un tema o «sin tema». Solo las sesiones completadas suman horas al tema. |
| Afinidad de tipo | 60% de probabilidad de que la eclosión salga del grupo del tipo del tema (dentro de la rareza sorteada). Conecta lo que estudias con lo que capturas. |
| Historial | Registro de sesiones (fecha, duración, tema, completada/abortada), tope de 2000 entradas. Pantalla TEMAS con totales por tema, barras y últimas sesiones. |
| Exportación | Botón que genera un Markdown con tabla de totales por tema e historial completo, vía diálogo de guardado del sistema. |
| Escudos de racha | Cada 7 días seguidos ganas un escudo (máx. 2). Un día fallado consume un escudo en lugar de resetear la racha. Visible en Inicio y Entrenador. |
| Tipos reales | Dataset de tipos de los 151 (tipado moderno), chips de colores oficiales en español. |
| Ficha de Pokédex | Cada celda abre detalle: tipos, rareza, capturas, primera fecha, shiny; desde ahí se elige compañero. |
| Compañero | Tu Pokémon favorito aparece junto al saludo de Inicio. |
| Coherencia de eclosión | El huevo de la animación usa el color de su tier real. |
| Sonido | Jingles chiptune (WebAudio, sin ficheros) al eclosionar, subir de nivel y ganar medalla. |
| Hoy | Inicio muestra los minutos completados del día, para que la victoria diaria sea visible. |

**Ideas investigadas y aplazadas** (candidatas a fase 6): caramelos por repetidos para evolucionar capturas (estilo Pokémon GO), sistema de pity que garantice un raro tras N huevos sin suerte, capítulos mensuales con cierre limpio (isla/región terminada cada mes), quest book diario (2-3 objetivos), sesiones de foco en compañía (multijugador), y estadísticas semanales por tema.

## 6. Fuera de alcance (por ahora)

- Bloqueo a nivel de red/extensión de navegador (hosts es suficiente para el uso personal).
- Modo «no salir de la tarea definida» (mencionado como idea futura).
- Sync entre dispositivos, cuentas, versión iOS.
- Generaciones de Pokémon posteriores a la primera.

## 7. Riesgos conocidos

- `/etc/hosts` no corta conexiones ya abiertas (una pestaña de Twitter ya cargada sigue viva hasta recargar); aceptado para v1.
- Los sprites cargan desde GitHub: sin internet se muestra un placeholder pixelado.
- Uso personal de sprites de Pokémon: no distribuir la app públicamente.
