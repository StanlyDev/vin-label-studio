# Label Studio — Zebra ZT231

Label Studio es una aplicación de escritorio autónoma diseñada para automatizar y estandarizar la impresión masiva de etiquetas industriales (códigos QR y texto). Está construida para procesar bases de datos desde Excel y enviar instrucciones nativas (ZPL) directamente a impresoras Zebra, evadiendo las limitaciones de los drivers gráficos de Windows.

## Qué hace
- Carga y lectura local de archivos de datos (.xlsx, .xls, .csv).
- Generación dinámica de código ZPL calibrado estrictamente para etiquetas de 2x1 pulgadas (406x203 dots a 203dpi).
- Auto-escalado de tipografía (Shrink-to-Fit) para evitar que textos largos colisionen con los códigos QR.
- Impresión directa por Red local mediante conexión TCP (Socket al puerto 9100).
- Impresión por USB mediante envío RAW (Hack UNC Share) para bypasear la rasterización del driver GDI de Windows.
- Previsualización en tiempo real del código ZPL generado.
- Exportación de los lotes de impresión a archivos de texto `.zpl`.

## Estructura (resumen)
- `/` (Raíz del proyecto)
  - `main.js`       — Proceso principal (Backend Node.js): Maneja la creación de la ventana, comunicación de red (TCP), y ejecución de comandos del sistema operativo (Spooler/PowerShell).
  - `index.html`    — Interfaz de usuario (Frontend): Contiene la lógica visual, lectura de Excel, algoritmo de auto-escalado y generación del string ZPL.
  - `preload.js`    — Puente de comunicación IPC (Context Bridge): Expone funciones seguras del sistema operativo al frontend.
  - `package.json`  — Configuración del proyecto, dependencias y scripts de compilación de Electron.
  - `node_modules/` — Dependencias de desarrollo (Electron).

## Tecnologías principales
- Frontend: HTML5, CSS3, JavaScript (ES6), SheetJS (xlsx.js).
- Backend / Desktop Core: Node.js, Electron.
- Hardware / Impresión: Lenguaje nativo ZPL II.
- Interacción con SO: APIs nativas de Windows, PowerShell CLI, Windows Print Spooler.

## Dependencias (bibliotecas relevantes)
- Framework Principal:
  - `electron` (Motor de la aplicación de escritorio).
  - `electron-builder` (Para empaquetar y generar el instalador `.exe`).
- Frontend (CDN):
  - `xlsx.full.min.js` (SheetJS para parseo de Excel en memoria del cliente).
- Módulos nativos de Node.js (No requieren instalación extra):
  - `net` (Sockets TCP), `fs` (Sistema de archivos), `child_process` (Ejecución de comandos), `os`, `path`.

## Archivos de configuración clave
- `package.json` — Define los parámetros de compilación en el bloque `"build"` (appId, productName, iconos y target de salida `nsis` para Windows).
- `index.html` (Lógica interna) — La función `generarZPL()` contiene las coordenadas X/Y y multiplicadores hardcodeados. Cualquier cambio en el tamaño físico del insumo (papel) requiere recalibrar la matemática aquí.

## Notas de seguridad y operación
- **Requisito crítico USB:** Para que el método de impresión USB funcione, la impresora Zebra *debe* estar configurada en Windows con la opción "Compartir esta impresora" activada. El sistema utiliza el "ShareName" para crear un túnel local (`\\localhost\NombreCompartido`) y enviar los datos crudos.
- **Protección de Hardware:** El código ZPL generado no incluye comandos de escritura en memoria no volátil (`^JUS`, `^MNA`). Esto es intencional para evitar la degradación prematura y destrucción de la placa EEPROM de la impresora durante la impresión masiva.
- **Seguridad Electron:** La arquitectura utiliza `contextIsolation: true` y `nodeIntegration: false` para evitar que scripts maliciosos cargados en el frontend tengan acceso al sistema de archivos del equipo.

## Consideraciones de despliegue / mantenimiento (informativo)
- Para generar el instalador final de Windows, ejecutar el comando `npm run build`. El ejecutable se depositará en la carpeta `dist/`.
- El algoritmo de "Shrink-to-Fit" está optimizado para la anchura máxima del rodillo. Si se ingresan códigos excesivamente largos (más de 20 caracteres), la fuente se reducirá drásticamente, lo que podría afectar la legibilidad para escáneres ópticos.
- Si se experimentan colas de impresión atascadas en Windows, purgar el spooler y reiniciar la aplicación.

## Contacto
- brandonstanlyv@gmail.com  
- stanvsdev@gmail.com