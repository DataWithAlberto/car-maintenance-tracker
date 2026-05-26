# Guía de configuración OBD2 — OBDLink MX+ y otros adaptadores

Esta app se comunica con adaptadores OBD-II a través de **Web Bluetooth**
(navegador → BLE). El dispositivo recomendado y completamente soportado es
el **OBDLink MX+** (chipset STN2120 + módulo BLE Microchip RN4870/71).

---

## Dispositivos soportados

| Modelo                   | Perfil BLE                 | Estado         | Notas                               |
| ------------------------ | -------------------------- | -------------- | ----------------------------------- |
| **OBDLink MX+**          | Microchip Transparent UART | ✅ Recomendado | Mejor rendimiento, timing agresivo  |
| OBDLink LX               | Microchip Transparent UART | ✅ Compatible  | Mismo chipset, menos PIDs avanzados |
| OBDLink CX (BMW/Moto)    | Microchip Transparent UART | ✅ Compatible  | Optimizado para CAN-FD              |
| Adaptadores Nordic UART  | Nordic UART (6e400001...)  | ✅ Compatible  | nRF-based clones                    |
| Vgate iCar Pro / Veepeak | ELM327 FFF0                | ⚠️ Funciona    | Algunos PIDs lentos o sin datos     |
| ELM327 chinos baratos    | TI CC254x (FFE0)           | ⚠️ Funciona    | Calidad de lectura variable         |

---

## Requisitos previos

1. **Navegador con Web Bluetooth:**
   - ✅ Chrome / Chromium 85+ (Windows, macOS, Linux, Android)
   - ✅ Edge 84+
   - ✅ Opera 71+
   - ❌ Safari (no soporta Web Bluetooth) — usa Chrome en macOS/iPadOS
   - ❌ Firefox (no soporta Web Bluetooth)

2. **HTTPS o `localhost`:** Web Bluetooth solo funciona en orígenes seguros.

3. **Hardware:**
   - Coche con puerto OBD-II (1996+ en EEUU, 2001+ gasolina UE, 2004+ diésel UE)
   - OBDLink MX+ (precio aprox. 100 €)
   - Encendido del vehículo en posición **ON** o motor arrancado

---

## Configuración del OBDLink MX+

### Paso 1 — Conectar físicamente

1. Apaga el contacto del coche.
2. Localiza el puerto OBD-II (suele estar bajo el volante, a la izquierda).
3. Inserta el OBDLink MX+. Encaja con un click firme.
4. Pon el contacto en **posición ON** (sin arrancar) o arranca el motor.
5. El LED del adaptador parpadea en azul → modo de emparejamiento.

> **Nota MX+ doble modo:** El MX+ es dual mode (Bluetooth Classic + BLE).
> Web Bluetooth solo se comunica en modo BLE. **No emparejes el adaptador
> con los ajustes de Bluetooth del sistema operativo** — eso lo bloquea
> en modo Classic y el navegador no lo verá.

### Paso 2 — Emparejar en la app

1. Abre la app en Chrome (`https://...` o `localhost`).
2. Selecciona tu vehículo en el dashboard.
3. Navega a **OBD2** desde la barra inferior.
4. Pulsa **Conectar dispositivo**.
5. En el diálogo nativo del navegador, busca un dispositivo cuyo nombre
   empiece por `OBDLink` (ej. `OBDLink MX+ a8b3`).
6. Selecciona y pulsa **Vincular**.
7. La primera vez Chrome pide permiso BLE → acéptalo.
8. Espera a ver `Conectado` en verde. Pulsa **Leer ahora** para una primera
   lectura.

### Paso 3 — Auto-reconexión

A partir de la segunda conexión, la app llama a
`navigator.bluetooth.getDevices()` (Chrome 85+) y se reconecta
silenciosamente cada vez que abras la página, sin pedir confirmación.

Si pierdes este permiso (limpieza de site data), repite el Paso 2.

---

## Solución de problemas

### ❌ "Adaptador no reconocido. Asegúrate de que es un ELM327/STN compatible."

**Causa:** El navegador conectó al GATT pero ninguno de los perfiles BLE
conocidos casa con el dispositivo.

**Solución:**

1. Verifica el modelo del adaptador. Algunos modelos antiguos OBDLink
   (MX clásico) solo son Bluetooth Classic — no BLE — y no funcionan con
   Web Bluetooth.
2. Si tienes un MX+ comprueba que el firmware está actualizado con la app
   OBDLink en el móvil. Versiones < 5.0 pueden no exponer el perfil BLE
   correctamente.
3. Si usas un adaptador genérico, contacta soporte indicando los UUIDs que
   muestra `chrome://bluetooth-internals/#devices`.

### ❌ El dispositivo no aparece en el diálogo del navegador

**Causa más común:** está emparejado en BT Classic por el sistema operativo.

**Solución:**

1. Abre los ajustes Bluetooth del sistema.
2. **Olvida / elimina** el dispositivo `OBDLink MX+`.
3. Reinicia el adaptador desenchufándolo del coche 10 segundos.
4. Vuelve al paso 2 de emparejamiento en la app **sin** emparejar primero
   en el SO.

### ⚠️ Se conecta pero no recibe datos (`NO DATA`, `TIMEOUT`)

**Causas posibles:**

- El motor no está en marcha (algunos PIDs requieren el motor activo).
- Ese PID no está soportado por tu modelo de vehículo. Es normal: la app
  registra cada lectura como `null` y sigue.
- Latencia BLE alta. Sube el intervalo de polling a 3 s en lugar de 2 s.

### ⚠️ Lecturas erráticas o "ERROR" en bujías / O2

**Causa:** Vehículos antiguos pre-2008 a veces requieren forzar el
protocolo OBD-II manualmente en lugar del auto-detect.

**Solución avanzada:** Conecta con la app oficial OBDLink, identifica el
protocolo (ISO9141, KWP2000, CAN, etc.) y abre un issue para añadir un
`ATSP<n>` específico al perfil OBDLink en `src/services/obd2.service.ts`.

### 🔋 La batería del adaptador se descarga rápido

**Causa:** El OBDLink MX+ consume ~70 mA cuando está enchufado pero el
coche apagado. En coches con OBD permanentemente alimentado eso vacía la
batería en 2-3 semanas.

**Solución:** Desenchúfalo cuando no lo uses, o monta un alargador con
interruptor (OBDLink vende el "Ignition-controlled cable").

---

## PIDs soportados

La app intenta leer los 24 PIDs siguientes en cada ciclo (lo que el vehículo
no soporte vuelve como `null` sin afectar al resto):

| PID  | Descripción                            | Modo 01 |
| ---- | -------------------------------------- | ------- |
| `04` | Carga del motor (%)                    | sí      |
| `05` | Temperatura refrigerante (°C)          | sí      |
| `06` | Short fuel trim banco 1 (%)            | sí      |
| `07` | Fuel trim a largo plazo banco 1 (%)    | sí      |
| `08` | Short fuel trim banco 2 (%)            | sí      |
| `0B` | Presión colector de admisión (kPa)     | sí      |
| `0C` | RPM motor (rev/min)                    | sí      |
| `0D` | Velocidad vehículo (km/h)              | sí      |
| `0E` | Avance de encendido (°)                | sí      |
| `10` | Flujo de aire MAF (g/s)                | sí      |
| `1D` | Nº DTCs emisiones                      | sí      |
| `1F` | Tiempo desde arranque (s)              | sí      |
| `2F` | Nivel de combustible (%)               | sí      |
| `3C` | Temp catalizador banco 1 sensor 1 (°C) | sí      |
| `42` | Voltaje del módulo de control (V)      | sí      |
| `43` | Carga absoluta (%)                     | sí      |
| `45` | Posición relativa del acelerador (%)   | sí      |
| `46` | Temperatura ambiente (°C)              | sí      |
| `47` | Posición absoluta acelerador B (%)     | sí      |
| `49` | Posición pedal acelerador D (%)        | sí      |
| `4A` | Posición pedal acelerador E (%)        | sí      |
| `5D` | Presión de aceite (kPa)                | sí      |
| `5E` | Tasa de combustible (L/h)              | sí      |
| `A6` | Odómetro acumulado (km)                | sí ⚠️   |

⚠️ El PID A6 (odómetro) es opcional en el estándar OBD-II y solo lo soporta
una fracción de los vehículos modernos. La app usa este valor para
sincronizar el km del coche con el kilometraje real. Si no está disponible,
introduce el km manualmente desde la ficha del vehículo.

---

## DTCs (códigos de avería)

La app lee los DTC almacenados en la ECU (Modo 03) y los muestra mapeados:

- **P0xxx** → motor, transmisión, emisiones (la mayoría)
- **B0xxx** → carrocería (airbags, cinturones)
- **C0xxx** → chasis (ABS, dirección, ruedas)
- **U0xxx** → red interna (CAN, módulos)

Cada código se asocia automáticamente a una pieza del modelo 3D del coche
(ver [obd2Mapping.ts](../src/types/obd2Mapping.ts)) para resaltarla en el
visor con color rojo (`critical`) o naranja (`warn`).

**Borrar DTCs:** El botón "Limpiar códigos" envía `Modo 04`. Úsalo solo
después de reparar la avería; si no, la luz de motor (MIL) volverá tras
unos ciclos de conducción.

---

## VIN

La app intenta leer el VIN vía Modo 09 PID 02 al conectar por primera vez.
Si el adaptador lo devuelve, se ofrece importarlo al vehículo con un click.

---

## Privacidad y datos

- **Las lecturas se guardan en tu base de datos Supabase del usuario.**
  Si no quieres persistencia, desactiva el toggle de "Grabar lecturas" en
  la página OBD2.
- **Web Bluetooth no envía datos a ningún servidor de Anthropic, OBDLink ni
  ninguna otra tercera parte.** Todo el tráfico es local: navegador ↔ BLE
  ↔ adaptador.
- Los permisos BLE se almacenan por origen en Chrome y puedes revocarlos
  desde `chrome://settings/content/bluetoothDevices`.

---

## Referencias técnicas

- [Spec OBD-II PIDs (Wikipedia)](https://en.wikipedia.org/wiki/OBD-II_PIDs)
- [STN2120 Reference Manual (OBDSol)](https://www.obdsol.com/knowledgebase/stn2120-reference/)
- [Microchip RN4870 BLE module](https://www.microchip.com/wwwproducts/en/RN4870)
- [Web Bluetooth API spec (W3C)](https://webbluetoothcg.github.io/web-bluetooth/)

---

¿Encontraste un fallo o quieres añadir soporte para otro adaptador?
Abre un issue en [GitHub](https://github.com/DataWithAlberto/car-maintenance-tracker/issues).
