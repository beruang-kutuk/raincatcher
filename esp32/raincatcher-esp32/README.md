# Rain Catcher ESP32

## ESP32 Upload And Monitor

This project is set to use the Silicon Labs CP210x USB to UART Bridge on `COM3`.

- Upload port: `COM3`
- Serial monitor port: `COM3`
- Serial monitor speed: `115200`

The Bluetooth ports `COM4` and `COM5` are not the ESP32 upload port.

## If Upload Gets Stuck

If PlatformIO shows `Connecting...`, hold the ESP32 `BOOT` button.

Release `BOOT` when uploading starts, for example when PlatformIO prints `Writing at...`.

If upload still fails:

1. Hold the ESP32 `BOOT` button first.
2. Click Upload in PlatformIO.
3. Keep holding `BOOT` while it says `Connecting...`.
4. Release `BOOT` after upload starts.

If boot mode errors continue, disconnect the sensors temporarily while uploading, then reconnect them after the upload finishes.

## Sensor Pins

- HC-SR04 ultrasonic `TRIG`: `GPIO5`
- HC-SR04 ultrasonic `ECHO`: `GPIO18`
- Turbidity analog signal: `GPIO25`
- DS18B20 `DATA`: `GPIO4`
- pH analog signal: `GPIO34`

Do not use `GPIO2` for the DS18B20 data pin. `GPIO2` can affect ESP32 boot mode.
