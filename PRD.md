# PRD — DeepDex

Fecha: 2026-09-07
Estado: aprobado en conversación; en ejecución por fases.
Usuario: Adolfo, uso personal en su Mac.
Nota de repositorio: DeepDex vive en su propio repositorio (originalmente se desarrolló en la carpeta `deepdex/` del repo CalVoice; el historial de commits se conservó al trasladarlo).

## 1. Problema y resultado esperado

Adolfo quiere hacer deep work sin escaparse a WhatsApp, Twitter o Instagram, ni por aplicación ni por navegador. Las apps de bloqueo existentes le resultan frías; quiere una que le motive de verdad, con temática Pokémon, donde cada hora de foco acumulada construya algo: un historial total de horas, capturas, niveles y logros.

Resultado esperado: una app de escritorio para macOS donde inicia una sesión de foco con temporizador, durante la cual las apps y webs de su lista negra quedan bloqueadas de forma estricta, y al completarla gana recompensas Pokémon persistentes.

## 2. Decisiones tomadas (conversación 2026-09-07)

| ID | Decisión | Elección |
|---|---|---|
| D1 | Stack | Electron + React + TypeScript (electron-vite). UI web; estética Pokédex desde el rediseño de octubre (ver 5e). |
| D2 | Estrictez | Estricta con emergencia: las apps bloqueadas se cierran al instante; abortar exige escribir una frase, esperar 30 segundos y pierde todo el progreso de la sesión (huevo y XP incluidos). |
| D3 | Gamificación | Entrenador completo: huevo por sesión que eclosiona en un Pokémon (mejor cuanto más larga la sesión), XP de entrenador por minuto de foco, niveles, Pokédex de capturas, rachas diarias y medallas de gimnasio como logros. |
| D4 | Alcance de bloqueo MVP | Apps de macOS + webs en cualquier navegador vía `/etc/hosts` (pide contraseña de admin al iniciar/terminar sesión). |
| D5 | Datos | Local, JSON en el directorio de usuario de la app. Sin cuentas ni sync. |
| D6 | Sprites | Dataset embebido de las generaciones 1-5 (649 Pokémon) con sprites oficiales empaquetados en la app (ampliado el 2026-10-16; antes 1ª generación servida desde GitHub). |

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
- **Pokédex**: los 649 de las generaciones 1-5, organizados por región (Kanto, Johto, Hoenn, Sinnoh, Teselia); los no capturados se muestran en silueta. Repetidos cuentan (contador por especie).
- **Rachas**: días consecutivos con al menos una sesión completada.
- **Medallas** (8, estilo gimnasio): primera sesión, 10 h totales, 50 h, 100 h, 250 h, racha de 7 días, racha de 30 días, 50 especies distintas.

### Pantallas
1. **Inicio**: saludo de entrenador, selector de duración, racha, huevo que tocaría, acceso al resto.
2. **Sesión**: temporizador grande, huevo animado, contador de bloqueos, botón de emergencia.
3. **Eclosión**: animación de revelado al completar.
4. **Pokédex**: rejilla por región con siluetas/capturas y contador por región.
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
│       ├── pokedex.ts   # tipos, rarezas, probabilidades, medallas
│       └── pokedexData.ts # datos generados de los 649 (gens 1-5)
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

## 5c. Generaciones 1-5 y recursos locales (2026-10-16)

- Pokédex ampliada a 649 especies (Kanto a Teselia). Nombres, tipos modernos y rarezas se generan desde los CSV de PokeAPI.
- Rareza por regla, sin listas a mano: legendario = legendario o singular; raro = evolución final con estadísticas base >= 480; infrecuente = evolucionado, estadísticas >= 400 o ratio de captura <= 75; común = resto. Resultado: 175 comunes, 248 infrecuentes, 178 raros, 48 legendarios.
- Nuevo tipo Siniestro (aparece desde la 2ª generación), disponible también como afinidad de tema.
- Sprites normales y shiny en `src/renderer/public/sprites`, fuente Press Start 2P en `src/renderer/src/assets/fonts`. La app ya no hace peticiones a GitHub ni a Google.
- Pokédex con pestañas por región y contador de capturas en cada una.
- Los datos guardados no cambian: los IDs 1-151 siguen siendo los mismos.

## 5d. Estadísticas de horas y arreglos de la revisión (2026-10-20)

**Estadísticas.** La pestaña TEMAS pasa a llamarse HORAS e incluye: cifras de hoy, esta semana (desde el lunes), este mes y media diaria de los últimos 30 días; barras de los últimos 14 días con desglose por tema en el tooltip; calendario de foco de 12 semanas; hábitos (porcentaje de sesiones completadas, duración media, minutos por franja del día); y horas por tema esta semana frente al total. Se calculan con `computeStats` en `src/shared/stats.ts` a partir del historial de sesiones.

**Arreglos de la revisión de octubre:**

| Problema | Arreglo |
|---|---|
| La cuenta atrás de emergencia se reiniciaba cada segundo y nunca abortaba | Cuenta contra una hora límite fija |
| Cmd+Q o «Salir» abortaban sin fricción | Salir con sesión en curso abre la salida de emergencia; solo el apagado del Mac aborta directamente |
| Carreras entre bloquear y desbloquear webs | Cola única de operaciones sobre `/etc/hosts` y un contador de generación que deshace un bloqueo concedido tarde |
| Fichero temporal leído como root | Eliminado: las líneas se escriben directamente tras validar cada dominio |
| Cancelar la contraseña dejaba el estado ambiguo | Estados explícitos (esperando, bloqueadas, sin bloquear, nada que bloquear), botón para reintentar y aviso en Inicio si las webs quedan bloqueadas fuera de sesión |
| Bloqueo de apps sin permiso fallaba en silencio | Aviso en la pantalla de sesión, `NSAppleEventsUsageDescription` en el Info.plist, tiempos límite y cierre forzoso por PID |
| Subdominios sin bloquear | Variantes `www.`, `m.`, `mobile.` y subdominios conocidos |
| Eclosión perdida con la ventana cerrada | Resultado pendiente hasta que la ventana lo muestra, y notificación del sistema al terminar |
| JSON corrupto borraba el progreso | Copia `.bak` en cada guardado, fichero corrupto apartado y recuperación desde la copia |
| Racha mal calculada en cambios de hora y que no caducaba en pantalla | Diferencia en días de calendario y racha efectiva mostrada |
| macOS podía ralentizar los temporizadores en segundo plano | `powerSaveBlocker` durante la sesión |
| Navegación de la ventana y `openExternal` sin restricciones | Navegación bloqueada, solo enlaces `https:` |

Tests con Vitest (`npm test`, zona horaria Europe/Madrid): rachas (incluidos los cambios de hora), escudos, recompensas, eclosiones, niveles, estadísticas y validación de dominios.

**Pendiente:** escala tipográfica legible (gran parte del texto mide menos de 8px), contraste de los chips de tipo claros, un helper privilegiado para no pedir la contraseña dos veces por sesión, y descontar el tiempo con el Mac en reposo.

## 5e. Rediseño visual (2026-10-20)

Petición: una interfaz más minimalista, con colores de Pokémon y huevos que se parezcan a los de verdad. Sustituye a la estética Game Boy verde de la fase 1.

- **Paleta Pokédex.** Superficies blancas sobre gris claro. El rojo Poké Ball se reserva para la acción principal y la pestaña activa; el azul del logo, para los datos (barras, calendario de foco); el amarillo del logo, para lo especial (shiny, legendarios, subida de nivel, medallas).
- **Tipografía.** Fuente del sistema para el texto y los botones, en minúsculas normales. Press Start 2P solo para números y etiquetas cortas sin tildes (sus mayúsculas acentuadas se ven como minúsculas), siempre a 8/16/24/48 px para que se vea nítida. Desaparece todo el texto por debajo de 11 px.
- **Huevos reales.** Sprite oficial del huevo de Pokémon Negro/Blanco (PokeAPI), recoloreado según los huevos de distancia de Pokémon GO: manchas verdes (común, como el de 2 km), naranjas (raro, 5 km) y moradas (superraro, 10 km). Dos fases de grieta generadas sobre el mismo sprite (`src/renderer/public/eggs`). En pantallas oscuras el huevo va dentro de una incubadora clara para que su contorno no se pierda.
- **Eclosión por fases**, como en los juegos: tiembla, primera grieta, tiembla más fuerte, se agrieta del todo, destello blanco y aparece el Pokémon. Se puede saltar con un clic y respeta la preferencia de reducir movimiento.
- **Movimiento de pixel art sin rotar.** Los sprites no se giran (se deforman); el huevo en reposo da un saltito cada pocos segundos y al eclosionar tiembla de lado.
- **Sprites a escala entera** (96 y 192 px) para que no salgan borrosos.
- **Contraste.** El texto de los chips de tipo elige blanco o casi negro según el color (todos por encima de 5:1). Las medallas bloqueadas son legibles, con el emoji en gris.

## 6. Fuera de alcance (por ahora)

- Bloqueo a nivel de red/extensión de navegador (hosts es suficiente para el uso personal).
- Modo «no salir de la tarea definida» (mencionado como idea futura).
- Sync entre dispositivos, cuentas, versión iOS.
- Generaciones de Pokémon posteriores a la quinta.

## 7. Riesgos conocidos

- `/etc/hosts` no corta conexiones ya abiertas (una pestaña de Twitter ya cargada sigue viva hasta recargar); aceptado para v1.
- Sprites y fuente van empaquetados: la app no necesita internet para nada.
- Uso personal de sprites de Pokémon: no distribuir la app públicamente.
